"""
Metadata-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException, Query
from typing import Dict, Any, List, Optional
from pathlib import Path
import json

from api.utils import _require, _from_body, _as_str_list, _emb
from infra.index_store import IndexStore

# Create router for metadata endpoints
metadata_router = APIRouter(prefix="/metadata", tags=["metadata"])


@metadata_router.post("/build")
def build_metadata_v1(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Build metadata index for the specified directory.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    
    # Check if we can build metadata
    if not hasattr(store, '_build_exif_index') or not callable(getattr(store, '_build_exif_index')):
        # Fallback to manual implementation
        try:
            # Initialize metadata status for UI polling
            index_dir = store.index_dir
            status_path = index_dir / 'metadata_status.json'
            try:
                status_path.write_text(json.dumps({
                    'state': 'running',
                    'start': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                    'total': int(len(store.state.paths or [])),
                    'done': 0,
                    'updated': 0,
                }), encoding='utf-8')
            except Exception:
                pass
            
            # Build EXIF index manually
            data = _build_exif_index(index_dir, store.state.paths or [])
            cams = sorted({c for c in data.get('camera',[]) if c})
            places = sorted({p for p in data.get('place',[]) if p})
            
            out = {"updated": len(store.state.paths or []), "cameras": cams, "places": places}
            
            # Update status to complete
            try:
                status_path.write_text(json.dumps({
                    'state': 'complete',
                    'updated': out['updated'],
                    'cameras': cams,
                    'places': places,
                }), encoding='utf-8')
            except Exception:
                pass
                
            return out
        except Exception as e:
            raise HTTPException(500, f"Metadata build failed: {e}")
    else:
        # Use the IndexStore method if available
        try:
            data = store._build_exif_index(store.index_dir, store.state.paths)
            cams = sorted({c for c in data.get('camera',[]) if c})
            places = sorted({p for p in data.get('place',[]) if p})
            out = {"updated": len(store.state.paths or []), "cameras": cams, "places": places}
            return out
        except Exception as e:
            raise HTTPException(500, f"Metadata build failed: {e}")


@metadata_router.get("/")
def get_metadata_v1(
    directory: str = Query(..., alias="dir"),
) -> Dict[str, Any]:
    """
    Get metadata for the specified directory.
    """
    store = IndexStore(Path(directory))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"ok": True, "cameras": [], "places": []}
    try:
        data = json.loads(p.read_text())
        cams = sorted({c for c in data.get('camera',[]) if c})
        places = sorted({s for s in data.get('place',[]) if s})
        return {"ok": True, "cameras": cams, "places": places}
    except Exception:
        return {"ok": True, "cameras": [], "places": []}


@metadata_router.get("/batch")
def get_metadata_batch_v1(
    directory: str = Query(..., alias="dir"), 
    paths: str = Query(...),
) -> Dict[str, Any]:
    """
    Return EXIF/derived metadata for multiple photos in batch to reduce API calls.
    """
    folder = Path(directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Parse comma-separated paths
    path_list = [p.strip() for p in paths.split(',') if p.strip()]
    if not path_list:
        return {"ok": False, "meta": {}}

    store = IndexStore(Path(directory))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"ok": False, "meta": {}}

    try:
        d = json.loads(p.read_text())
        meta = {
            'paths': d.get('paths', []),
            'camera': d.get('camera', []),
            'iso': d.get('iso', []),
            'fnumber': d.get('fnumber', []),
            'exposure': d.get('exposure', []),
            'focal': d.get('focal', []),
            'width': d.get('width', []),
            'height': d.get('height', []),
            'flash': d.get('flash', []),
            'white_balance': d.get('white_balance', []),
            'metering': d.get('metering', []),
            'gps_altitude': d.get('gps_altitude', []),
            'gps_heading': d.get('gps_heading', []),
            'gps_lat': d.get('gps_lat', []),
            'gps_lon': d.get('gps_lon', []),
            'place': d.get('place', []),
            'sharpness': d.get('sharpness', []),
            'brightness': d.get('brightness', []),
            'contrast': d.get('contrast', []),
        }
        
        def to_map(key: str) -> Dict[str, Any]:
            paths = meta.get('paths') or []
            values = meta.get(key) or []
            return {str(p): v for p, v in zip(paths, values) if v is not None}
        
        cam_map = to_map('camera')
        iso_map = to_map('iso')
        f_map = to_map('fnumber')
        exp_map = to_map('exposure')
        foc_map = to_map('focal')
        w_map = to_map('width')
        h_map = to_map('height')
        flash_map = to_map('flash')
        wb_map = to_map('white_balance')
        met_map = to_map('metering')
        alt_map = to_map('gps_altitude')
        head_map = to_map('gps_heading')
        lat_map = to_map('gps_lat')
        lon_map = to_map('gps_lon')
        place_map = to_map('place')
        sharp_map = to_map('sharpness')
        bright_map = to_map('brightness')
        contrast_map = to_map('contrast')
        
        out = {}
        for path in path_list:
            out[path] = {
                'camera': cam_map.get(path),
                'iso': iso_map.get(path),
                'fnumber': f_map.get(path),
                'exposure': exp_map.get(path),
                'focal': foc_map.get(path),
                'width': w_map.get(path),
                'height': h_map.get(path),
                'flash': flash_map.get(path),
                'white_balance': wb_map.get(path),
                'metering': met_map.get(path),
                'gps_altitude': alt_map.get(path),
                'gps_heading': head_map.get(path),
                'gps_lat': lat_map.get(path),
                'gps_lon': lon_map.get(path),
                'place': place_map.get(path),
                'sharpness': sharp_map.get(path),
                'brightness': bright_map.get(path),
                'contrast': contrast_map.get(path),
            }
        
        return {"ok": True, "meta": out}
    except Exception as e:
        return {"ok": False, "meta": {}, "error": str(e)}


def _build_exif_index(index_dir: Path, paths: List[str]) -> Dict[str, Any]:
    """
    Build EXIF index from scratch - internal helper function.
    """
    import time
    
    # Initialize metadata arrays
    cameras = []
    isos = []
    fnames = []
    exposures = []
    focals = []
    widths = []
    heights = []
    flashes = []
    white_balances = []
    meterings = []
    gps_alts = []
    gps_heads = []
    gps_lats = []
    gps_lons = []
    places = []
    sharpness_vals = []
    brightness_vals = []
    contrast_vals = []
    
    # Process each path
    for i, p in enumerate(paths):
        try:
            from PIL import Image, ExifTags
            
            # Try to read EXIF data
            try:
                img = Image.open(p)
                exif_raw = img._getexif()
                if exif_raw is None:
                    # No EXIF data, use defaults
                    cameras.append("")
                    isos.append(None)
                    fnames.append(None)
                    exposures.append(None)
                    focals.append(None)
                    widths.append(img.width if hasattr(img, 'width') else None)
                    heights.append(img.height if hasattr(img, 'height') else None)
                    flashes.append(None)
                    white_balances.append(None)
                    meterings.append(None)
                    gps_alts.append(None)
                    gps_heads.append(None)
                    gps_lats.append(None)
                    gps_lons.append(None)
                    places.append("")
                    sharpness_vals.append(None)
                    brightness_vals.append(None)
                    contrast_vals.append(None)
                    continue
                    
                # Extract EXIF tags
                exif = {}
                for tag, value in exif_raw.items():
                    decoded = ExifTags.TAGS.get(tag, tag)
                    exif[decoded] = value
                
                # Camera model
                camera = str(exif.get('Model', '')).strip()
                cameras.append(camera if camera else "")
                
                # ISO
                iso = exif.get('ISOSpeedRatings') or exif.get('PhotographicSensitivity')
                isos.append(int(iso) if iso is not None else None)
                
                # Aperture/F-number
                fnum = exif.get('FNumber')
                if fnum is not None:
                    try:
                        if isinstance(fnum, tuple) and len(fnum) == 2:
                            fnames.append(float(fnum[0]) / float(fnum[1]))
                        else:
                            fnames.append(float(fnum))
                    except Exception:
                        fnames.append(None)
                else:
                    fnames.append(None)
                
                # Exposure time
                exp = exif.get('ExposureTime') or exif.get('ShutterSpeedValue')
                if exp is not None:
                    try:
                        if isinstance(exp, tuple) and len(exp) == 2:
                            exposures.append(float(exp[0]) / float(exp[1]))
                        else:
                            exposures.append(float(exp))
                    except Exception:
                        exposures.append(None)
                else:
                    exposures.append(None)
                
                # Focal length
                focal = exif.get('FocalLength')
                if focal is not None:
                    try:
                        if isinstance(focal, tuple) and len(focal) == 2:
                            focals.append(float(focal[0]) / float(focal[1]))
                        else:
                            focals.append(float(focal))
                    except Exception:
                        focals.append(None)
                else:
                    focals.append(None)
                
                # Dimensions
                widths.append(img.width if hasattr(img, 'width') else None)
                heights.append(img.height if hasattr(img, 'height') else None)
                
                # Flash
                flash = exif.get('Flash')
                flashes.append(int(flash) if flash is not None else None)
                
                # White balance
                wb = exif.get('WhiteBalance')
                white_balances.append(int(wb) if wb is not None else None)
                
                # Metering mode
                meter = exif.get('MeteringMode')
                meterings.append(int(meter) if meter is not None else None)
                
                # GPS data
                gps_info = exif.get('GPSInfo')
                if gps_info:
                    # Extract latitude
                    gps_lat = gps_info.get(2)  # GPSLatitude
                    gps_lat_ref = gps_info.get(1)  # GPSLatitudeRef
                    if gps_lat and gps_lat_ref:
                        try:
                            lat = float(gps_lat[0]) + float(gps_lat[1])/60 + float(gps_lat[2])/3600
                            if gps_lat_ref and gps_lat_ref.upper() == 'S':
                                lat = -lat
                            gps_lats.append(lat)
                        except Exception:
                            gps_lats.append(None)
                    else:
                        gps_lats.append(None)
                    
                    # Extract longitude
                    gps_lon = gps_info.get(4)  # GPSLongitude
                    gps_lon_ref = gps_info.get(3)  # GPSLongitudeRef
                    if gps_lon and gps_lon_ref:
                        try:
                            lon = float(gps_lon[0]) + float(gps_lon[1])/60 + float(gps_lon[2])/3600
                            if gps_lon_ref and gps_lon_ref.upper() == 'W':
                                lon = -lon
                            gps_lons.append(lon)
                        except Exception:
                            gps_lons.append(None)
                    else:
                        gps_lons.append(None)
                    
                    # Extract altitude
                    gps_alt = gps_info.get(6)  # GPSAltitude
                    if gps_alt:
                        try:
                            alt = float(gps_alt[0]) / float(gps_alt[1]) if isinstance(gps_alt, tuple) else float(gps_alt)
                            gps_alts.append(alt)
                        except Exception:
                            gps_alts.append(None)
                    else:
                        gps_alts.append(None)
                    
                    # Extract heading
                    gps_head = gps_info.get(24)  # GPSImgDirection
                    if gps_head:
                        try:
                            head = float(gps_head[0]) / float(gps_head[1]) if isinstance(gps_head, tuple) else float(gps_head)
                            gps_heads.append(head)
                        except Exception:
                            gps_heads.append(None)
                    else:
                        gps_heads.append(None)
                else:
                    gps_lats.append(None)
                    gps_lons.append(None)
                    gps_alts.append(None)
                    gps_heads.append(None)
                
                # Place (placeholder - would need geocoding API for real implementation)
                places.append("")
                
                # Sharpness, brightness, contrast (placeholder - would need image analysis)
                sharpness_vals.append(None)
                brightness_vals.append(None)
                contrast_vals.append(None)
                
            except Exception:
                # Error processing this image, use defaults
                cameras.append("")
                isos.append(None)
                fnames.append(None)
                exposures.append(None)
                focals.append(None)
                widths.append(None)
                heights.append(None)
                flashes.append(None)
                white_balances.append(None)
                meterings.append(None)
                gps_alts.append(None)
                gps_heads.append(None)
                gps_lats.append(None)
                gps_lons.append(None)
                places.append("")
                sharpness_vals.append(None)
                brightness_vals.append(None)
                contrast_vals.append(None)
        except Exception:
            # Error processing this path, use defaults
            cameras.append("")
            isos.append(None)
            fnames.append(None)
            exposures.append(None)
            focals.append(None)
            widths.append(None)
            heights.append(None)
            flashes.append(None)
            white_balances.append(None)
            meterings.append(None)
            gps_alts.append(None)
            gps_heads.append(None)
            gps_lats.append(None)
            gps_lons.append(None)
            places.append("")
            sharpness_vals.append(None)
            brightness_vals.append(None)
            contrast_vals.append(None)
    
    # Save to file
    exif_data = {
        'paths': paths,
        'camera': cameras,
        'iso': isos,
        'fnumber': fnames,
        'exposure': exposures,
        'focal': focals,
        'width': widths,
        'height': heights,
        'flash': flashes,
        'white_balance': white_balances,
        'metering': meterings,
        'gps_altitude': gps_alts,
        'gps_heading': gps_heads,
        'gps_lat': gps_lats,
        'gps_lon': gps_lons,
        'place': places,
        'sharpness': sharpness_vals,
        'brightness': brightness_vals,
        'contrast': contrast_vals,
    }
    
    try:
        exif_file = index_dir / 'exif_index.json'
        exif_file.write_text(json.dumps(exif_data, indent=2), encoding='utf-8')
    except Exception:
        pass
    
    return exif_data