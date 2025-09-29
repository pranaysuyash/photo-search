"""
Core metadata routes - EXIF data extraction and indexing.

Handles building EXIF indexes, retrieving camera/place metadata,
and batch metadata retrieval for frontend optimization.
"""
from fastapi import APIRouter, Body, HTTPException, Query
from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import time

from api.utils import _require, _from_body, _emb
from infra.index_store import IndexStore
from infra.analytics import _write_event

router = APIRouter()


@router.post("/metadata/build")
def api_build_metadata(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Build EXIF metadata index for a photo directory."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    if not store.state.paths:
        return {"updated": 0}
    
    data = _build_exif_index(store.index_dir, store.state.paths)
    cams = sorted({c for c in data.get('camera',[]) if c})
    places = sorted({p for p in data.get('place',[]) if p})
    out = {"updated": len(store.state.paths or []), "cameras": cams, "places": places}
    
    # Log analytics event
    try:
        _write_event(store.index_dir, { 'type': 'metadata_build', 'updated': out['updated'] })
    except Exception:
        pass  # Non-critical, don't fail the request
    
    return out


@router.get("/metadata")
def api_get_metadata(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get available camera models and places from EXIF metadata."""
    store = IndexStore(Path(directory))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"cameras": []}
    try:
        data = json.loads(p.read_text())
        cams = sorted({c for c in data.get('camera',[]) if c})
        places = sorted({s for s in data.get('place',[]) if s})
        return {"cameras": cams, "places": places}
    except Exception:
        return {"cameras": [], "places": []}


@router.get("/metadata/batch")
def api_metadata_batch(directory: str = Query(..., alias="dir"), paths: str = Query(...)) -> Dict[str, Any]:
    """Return EXIF/derived metadata for multiple photos in batch to reduce API calls."""
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
        data = json.loads(p.read_text())
        paths_data = data.get('paths', [])
        meta_dict = {}

        for path in path_list:
            try:
                i = paths_data.index(path)
            except ValueError:
                continue

            def pick(key):
                arr = data.get(key, [])
                return arr[i] if i < len(arr) else None

            meta_dict[path] = {
                "camera": pick('camera'),
                "iso": pick('iso'),
                "fnumber": pick('fnumber'),
                "exposure": pick('exposure'),
                "focal": pick('focal'),
                "width": pick('width'),
                "height": pick('height'),
                "flash": pick('flash'),
                "white_balance": pick('white_balance'),
                "metering": pick('metering'),
                "gps_lat": pick('gps_lat'),
                "gps_lon": pick('gps_lon'),
                "gps_altitude": pick('gps_altitude'),
                "gps_heading": pick('gps_heading'),
                "place": pick('place'),
                "sharpness": pick('sharpness'),
                "brightness": pick('brightness'),
                "contrast": pick('contrast'),
            }

            # Include filesystem modification time for timeline grouping
            try:
                meta_dict[path]["mtime"] = float(Path(path).stat().st_mtime)
            except Exception:
                meta_dict[path]["mtime"] = None

        return {"ok": True, "meta": meta_dict}
    except Exception:
        return {"ok": False, "meta": {}}


def _build_exif_index(index_dir: Path, paths: List[str]) -> Dict[str, Any]:
    """Build EXIF index from photo paths."""
    # Import EXIF utilities  
    from PIL import Image, ExifTags
    
    inv = {v: k for k, v in ExifTags.TAGS.items()}
    out = {
        "paths": [], "camera": [], "iso": [], "fnumber": [], "exposure": [], "focal": [], "width": [], "height": [],
        "flash": [], "white_balance": [], "metering": [], "gps_altitude": [], "gps_heading": [],
        "gps_lat": [], "gps_lon": [], "place": [],
        "sharpness": [], "brightness": [], "contrast": []
    }
    
    # Initialize metadata status for UI polling
    status_path = index_dir / 'metadata_status.json'
    try:
        status_path.write_text(json.dumps({
            'state': 'running',
            'start': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'total': int(len(paths or [])),
            'done': 0,
            'updated': 0,
        }), encoding='utf-8')
    except Exception:
        pass
    
    done = 0
    for sp in paths:
        p = Path(sp)
        cam = None; iso = None; fn = None; exp = None; foc = None; w=None; h=None
        flash_v = None; wb_v = None; met_v = None; alt_v = None; head_v = None
        lat_v = None; lon_v = None; place_v = None; sharp_v = None; bright_v = None; contrast_v = None
        
        try:
            # Extract EXIF data
            with Image.open(p) as img:
                try:
                    exif = img._getexif()
                    if exif:
                        # Camera model
                        cam = exif.get(inv.get('Model'))
                        if cam: cam = str(cam).strip()
                        
                        # ISO speed
                        iso = exif.get(inv.get('ISOSpeedRatings'))
                        if iso is None:
                            iso = exif.get(inv.get('PhotographicSensitivity'))
                        
                        # F-number
                        fn_raw = exif.get(inv.get('FNumber'))
                        if fn_raw and isinstance(fn_raw, tuple) and len(fn_raw) == 2:
                            try:
                                fn = float(fn_raw[0]) / float(fn_raw[1])
                            except (ZeroDivisionError, ValueError):
                                fn = None
                        elif fn_raw:
                            try:
                                fn = float(fn_raw)
                            except ValueError:
                                fn = None
                        
                        # Exposure time
                        exp_raw = exif.get(inv.get('ExposureTime'))
                        if exp_raw and isinstance(exp_raw, tuple) and len(exp_raw) == 2:
                            try:
                                exp = float(exp_raw[0]) / float(exp_raw[1])
                            except (ZeroDivisionError, ValueError):
                                exp = None
                        elif exp_raw:
                            try:
                                exp = float(exp_raw)
                            except ValueError:
                                exp = None
                        
                        # Focal length
                        foc_raw = exif.get(inv.get('FocalLength'))
                        if foc_raw and isinstance(foc_raw, tuple) and len(foc_raw) == 2:
                            try:
                                foc = float(foc_raw[0]) / float(foc_raw[1])
                            except (ZeroDivisionError, ValueError):
                                foc = None
                        elif foc_raw:
                            try:
                                foc = float(foc_raw)
                            except ValueError:
                                foc = None
                        
                        # Flash, white balance, metering
                        flash_v = exif.get(inv.get('Flash'))
                        wb_v = exif.get(inv.get('WhiteBalance'))
                        met_v = exif.get(inv.get('MeteringMode'))
                        
                        # GPS data
                        gps_info = exif.get(inv.get('GPSInfo'))
                        if gps_info:
                            # Extract GPS coordinates
                            try:
                                lat_raw = gps_info.get(2)  # GPSLatitude
                                lat_ref = gps_info.get(1)  # GPSLatitudeRef
                                if lat_raw and lat_ref:
                                    lat_v = float(lat_raw[0]) + float(lat_raw[1])/60 + float(lat_raw[2])/3600
                                    if lat_ref.upper() == 'S':
                                        lat_v = -lat_v
                                
                                lon_raw = gps_info.get(4)  # GPSLongitude  
                                lon_ref = gps_info.get(3)  # GPSLongitudeRef
                                if lon_raw and lon_ref:
                                    lon_v = float(lon_raw[0]) + float(lon_raw[1])/60 + float(lon_raw[2])/3600
                                    if lon_ref.upper() == 'W':
                                        lon_v = -lon_v
                                
                                # Altitude and heading
                                alt_raw = gps_info.get(6)  # GPSAltitude
                                if alt_raw and isinstance(alt_raw, tuple):
                                    alt_v = float(alt_raw[0]) / float(alt_raw[1])
                                elif alt_raw:
                                    alt_v = float(alt_raw)
                                
                                head_raw = gps_info.get(24)  # GPSImgDirection
                                if head_raw and isinstance(head_raw, tuple):
                                    head_v = float(head_raw[0]) / float(head_raw[1])
                                elif head_raw:
                                    head_v = float(head_raw)
                            except Exception:
                                pass  # GPS parsing errors are non-critical
                    
                    # Image dimensions
                    w, h = img.size
                    
                except Exception:
                    # EXIF parsing failed, use image dimensions only
                    w, h = img.size
                    
        except Exception:
            # Image loading failed, skip this file
            pass
        
        # Append values (using empty string for missing camera/place)
        out["paths"].append(sp)
        out["camera"].append(cam or "")
        out["iso"].append(iso)
        out["fnumber"].append(fn)
        out["exposure"].append(exp)
        out["focal"].append(foc)
        out["width"].append(w)
        out["height"].append(h)
        out["flash"].append(flash_v)
        out["white_balance"].append(wb_v)
        out["metering"].append(met_v)
        out["gps_lat"].append(lat_v)
        out["gps_lon"].append(lon_v)
        out["gps_altitude"].append(alt_v)
        out["gps_heading"].append(head_v)
        out["place"].append(place_v or "")  # Placeholder for geocoding
        out["sharpness"].append(sharp_v)
        out["brightness"].append(bright_v)
        out["contrast"].append(contrast_v)
        
        done += 1
        
        # Update status every 10 files
        if done % 10 == 0:
            try:
                status_path.write_text(json.dumps({
                    'state': 'running',
                    'start': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                    'total': int(len(paths or [])),
                    'done': done,
                    'updated': done,
                }), encoding='utf-8')
            except Exception:
                pass
    
    # Save final EXIF index
    try:
        exif_path = index_dir / 'exif_index.json'
        exif_path.write_text(json.dumps(out), encoding='utf-8')
    except Exception:
        pass
    
    # Update final status
    try:
        status_path.write_text(json.dumps({
            'state': 'complete',
            'total': int(len(paths or [])),
            'done': done,
            'updated': done,
        }), encoding='utf-8')
    except Exception:
        pass
    
    return out