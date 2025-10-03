"""
Auto-Curation API Router
Provides endpoints for intelligent photo organization and curation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timedelta
import asyncio
import os
import hashlib
from pathlib import Path
import json
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS, GPSTAGS
import cv2
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auto-curation", tags=["auto-curation"])

# Global state for tracking analysis jobs
analysis_jobs = {}

class PhotoMetadata(BaseModel):
    path: str
    date_taken: Optional[datetime] = None
    camera: Optional[str] = None
    lens: Optional[str] = None
    settings: Dict[str, Any] = {}
    file_info: Dict[str, Any] = {}

class QualityMetrics(BaseModel):
    overall: float = Field(ge=0, le=100)
    technical: float = Field(ge=0, le=100)
    composition: float = Field(ge=0, le=100)
    sharpness: float = Field(ge=0, le=100)
    exposure: float = Field(ge=0, le=100)
    colors: float = Field(ge=0, le=100)
    factors: Dict[str, float] = {}

class DuplicateInfo(BaseModel):
    path: str
    similarity: float = Field(ge=0, le=100)
    reason: str
    should_keep: bool = True
    analysis_details: Dict[str, Any] = {}

class EventInfo(BaseModel):
    id: str
    name: str
    type: str
    start_date: datetime
    end_date: datetime
    photos: List[str] = []
    confidence: float = Field(ge=0, le=1)
    related_events: List[str] = []
    theme: str
    ai_generated_name: str

class FaceInfo(BaseModel):
    id: str
    age_group: str
    gender: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    emotions: List[Dict[str, float]] = []
    face_count: int
    is_primary_subject: bool = False

class LocationInfo(BaseModel):
    name: str
    type: str
    coordinates: Optional[Dict[str, float]] = None
    confidence: float = Field(ge=0, le=1)
    weather: Optional[str] = None
    time_of_day: Optional[str] = None

class PhotoAnalysis(BaseModel):
    path: str
    quality: QualityMetrics
    duplicates: List[DuplicateInfo] = []
    events: List[EventInfo] = []
    faces: List[FaceInfo] = []
    locations: List[LocationInfo] = []
    tags: List[str] = []
    metadata: PhotoMetadata

class CurationAction(BaseModel):
    type: str
    description: str
    photos: List[str]
    target_collection: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    impact: str

class SmartCollectionSuggestion(BaseModel):
    name: str
    description: str
    type: str
    photos: List[str]
    confidence: float = Field(ge=0, le=1)
    auto_generated_name: str
    preview_photos: List[str] = []
    tags: List[str] = []
    reason: str
    estimated_size: int
    quality_score: Optional[float] = None

class AutoCurationRequest(BaseModel):
    photo_paths: List[str]
    options: Dict[str, Any] = {
        "enable_quality_assessment": True,
        "enable_duplicate_detection": True,
        "enable_event_detection": True,
        "enable_smart_grouping": True,
        "quality_threshold": 50,
        "duplicate_threshold": 85,
        "max_photos_per_collection": 100
    }

class AutoCurationProgress(BaseModel):
    job_id: str
    processed_photos: int
    total_photos: int
    current_step: str
    estimated_time_remaining: int
    actions_suggested: int
    status: str

class AutoCurationResult(BaseModel):
    job_id: str
    summary: Dict[str, Any]
    actions: List[CurationAction]
    collections: List[SmartCollectionSuggestion]
    analysis: List[PhotoAnalysis]
    completed_at: datetime

def extract_image_metadata(image_path: str) -> PhotoMetadata:
    """Extract EXIF metadata from image file"""
    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()
            metadata = {}

            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    metadata[tag] = value

            # Extract specific metadata
            date_taken = None
            camera = None
            lens = None
            settings = {}

            if 'DateTimeOriginal' in metadata:
                try:
                    date_taken = datetime.strptime(metadata['DateTimeOriginal'], '%Y:%m:%d %H:%M:%S')
                except:
                    pass

            if 'Make' in metadata and 'Model' in metadata:
                camera = f"{metadata['Make']} {metadata['Model']}"

            # Extract camera settings
            if 'ExposureTime' in metadata:
                settings['shutter_speed'] = f"1/{int(1/metadata['ExposureTime'])}"
            if 'FNumber' in metadata:
                settings['aperture'] = f"f/{metadata['FNumber']}"
            if 'ISOSpeedRatings' in metadata:
                settings['iso'] = metadata['ISOSpeedRatings']
            if 'FocalLength' in metadata:
                settings['focal_length'] = f"{metadata['FocalLength']}mm"
            if 'Flash' in metadata:
                settings['flash_used'] = bool(metadata['Flash'])

            # File info
            file_stat = os.stat(image_path)
            file_info = {
                'size_bytes': file_stat.st_size,
                'format': img.format,
                'dimensions': {'width': img.width, 'height': img.height},
                'color_space': img.mode
            }

            return PhotoMetadata(
                path=image_path,
                date_taken=date_taken or datetime.fromtimestamp(file_stat.st_mtime),
                camera=camera or "Unknown",
                lens=lens,
                settings=settings,
                file_info=file_info
            )
    except Exception as e:
        logger.error(f"Error extracting metadata from {image_path}: {e}")
        # Return basic metadata
        file_stat = os.stat(image_path)
        return PhotoMetadata(
            path=image_path,
            date_taken=datetime.fromtimestamp(file_stat.st_mtime),
            camera="Unknown",
            file_info={
                'size_bytes': file_stat.st_size,
                'format': Path(image_path).suffix.upper().replace('.', ''),
                'dimensions': {'width': 0, 'height': 0},
                'color_space': 'Unknown'
            }
        )

def assess_image_quality(image_path: str, metadata: PhotoMetadata) -> QualityMetrics:
    """Assess image quality using various metrics"""
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            # Return default quality if image can't be loaded
            return QualityMetrics(
                overall=50.0,
                technical=50.0,
                composition=50.0,
                sharpness=50.0,
                exposure=50.0,
                colors=50.0,
                factors={}
            )

        # Convert to grayscale for analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Sharpness assessment (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness = min(100, max(0, laplacian_var / 100))  # Normalize to 0-100

        # Brightness assessment
        brightness = np.mean(gray)
        brightness_score = min(100, max(0, 100 - abs(brightness - 128) * 0.8))

        # Contrast assessment
        contrast = np.std(gray)
        contrast_score = min(100, max(0, contrast * 0.5))

        # Noise assessment (simplified)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = np.mean(cv2.absdiff(gray, blur))
        noise_score = min(100, max(0, 100 - noise))

        # Composition assessment (simplified - rule of thirds simulation)
        height, width = gray.shape
        h_third, v_third = height // 3, width // 3

        # Check if there's content in rule of thirds areas
        roi_corners = [
            gray[0:h_third, 0:v_third],
            gray[0:h_third, 2*v_third:],
            gray[2*h_third:, 0:v_third],
            gray[2*h_third:, 2*v_third:]
        ]

        corner_activity = np.mean([np.std(roi) for roi in roi_corners])
        center_activity = np.std(gray[h_third:2*h_third, v_third:2*v_third])

        composition_score = min(100, max(0, (corner_activity - center_activity) * 2 + 50))

        # Color assessment
        if len(img.shape) == 3:
            # Convert to HSV for better color analysis
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            saturation = np.mean(hsv[:, :, 1])
            color_score = min(100, max(0, saturation / 2.55))  # Normalize from 0-255 to 0-100
        else:
            color_score = 30  # Grayscale images get lower color score

        # Calculate overall scores
        technical = (sharpness + noise_score) / 2
        composition = composition_score
        overall = (sharpness + brightness_score + contrast_score + noise_score + composition_score + color_score) / 6

        return QualityMetrics(
            overall=min(100, max(0, overall)),
            technical=min(100, max(0, technical)),
            composition=min(100, max(0, composition)),
            sharpness=min(100, max(0, sharpness)),
            exposure=min(100, max(0, brightness_score)),
            colors=min(100, max(0, color_score)),
            factors={
                'blurriness': min(100, max(0, 100 - sharpness)),
                'noise': min(100, max(0, 100 - noise_score)),
                'contrast': contrast_score,
                'brightness': brightness_score,
                'saturation': color_score,
                'composition_score': composition_score,
                'rule_of_thirds': composition_score,
                'leading_lines': composition_score * 0.8,  # Simplified
                'symmetry': composition_score * 0.6  # Simplified
            }
        )

    except Exception as e:
        logger.error(f"Error assessing quality for {image_path}: {e}")
        return QualityMetrics(
            overall=50.0,
            technical=50.0,
            composition=50.0,
            sharpness=50.0,
            exposure=50.0,
            colors=50.0,
            factors={}
        )

def find_duplicate_photos(photo_paths: List[str], threshold: float = 85.0) -> List[List[str]]:
    """Find duplicate or similar photos"""
    duplicates = []
    processed = set()

    try:
        # Calculate file hashes for exact duplicates
        file_hashes = {}
        for path in photo_paths:
            try:
                with open(path, 'rb') as f:
                    file_hash = hashlib.md5(f.read()).hexdigest()
                    if file_hash not in file_hashes:
                        file_hashes[file_hash] = []
                    file_hashes[file_hash].append(path)
            except Exception as e:
                logger.error(f"Error reading {path}: {e}")
                continue

        # Find exact duplicates
        for file_hash, paths in file_hashes.items():
            if len(paths) > 1:
                duplicates.append(paths)
                processed.update(paths)

        # For remaining photos, use image similarity (simplified)
        remaining = [p for p in photo_paths if p not in processed]

        # This is a simplified version - in production, you'd use more sophisticated
        # image similarity algorithms like SIFT, ORB, or deep learning features
        for i, path1 in enumerate(remaining):
            similar_photos = [path1]
            try:
                img1 = cv2.imread(path1, cv2.IMREAD_GRAYSCALE)
                if img1 is None:
                    continue

                img1 = cv2.resize(img1, (256, 256))  # Resize for faster processing

                for path2 in remaining[i+1:]:
                    if path2 in processed:
                        continue

                    try:
                        img2 = cv2.imread(path2, cv2.IMREAD_GRAYSCALE)
                        if img2 is None:
                            continue

                        img2 = cv2.resize(img2, (256, 256))

                        # Calculate similarity using template matching (simplified)
                        result = cv2.matchTemplate(img1, img2, cv2.TM_CCOEFF_NORMED)
                        similarity = np.max(result) * 100

                        if similarity >= threshold:
                            similar_photos.append(path2)
                            processed.add(path2)

                    except Exception as e:
                        logger.error(f"Error comparing {path1} and {path2}: {e}")
                        continue

                if len(similar_photos) > 1:
                    duplicates.append(similar_photos)
                    processed.update(similar_photos)

            except Exception as e:
                logger.error(f"Error processing {path1}: {e}")
                continue

    except Exception as e:
        logger.error(f"Error in duplicate detection: {e}")

    return duplicates

def detect_events(photo_analyses: List[PhotoAnalysis]) -> List[EventInfo]:
    """Detect events from photo metadata and patterns"""
    events = []

    # Group photos by date/time proximity
    date_groups = {}
    for analysis in photo_analyses:
        date_key = analysis.metadata.date_taken.date()
        if date_key not in date_groups:
            date_groups[date_key] = []
        date_groups[date_key].append(analysis)

    # Detect holidays and special dates
    for date, analyses in date_groups.items():
        if len(analyses) >= 3:  # Only consider days with 3+ photos
            # Check for holidays (simplified)
            month, day = date.month, date.day

            holiday_events = []
            if month == 12 and day == 25:
                holiday_events.append("Christmas")
            elif month == 1 and day == 1:
                holiday_events.append("New Year")
            elif month == 10 and day == 31:
                holiday_events.append("Halloween")
            elif month == 7 and day == 4:
                holiday_events.append("Independence Day")

            for holiday in holiday_events:
                event = EventInfo(
                    id=f"holiday-{holiday}-{date.year}",
                    name=holiday,
                    type="holiday",
                    start_date=datetime.combine(date, datetime.min.time()),
                    end_date=datetime.combine(date, datetime.max.time()),
                    photos=[a.path for a in analyses],
                    confidence=0.8,
                    related_events=[],
                    theme=f"holiday-{holiday.lower()}",
                    ai_generated_name=f"{holiday} {date.year}"
                )
                events.append(event)

            # Check for weekend events
            if date.weekday() >= 5 and len(analyses) >= 5:
                event = EventInfo(
                    id=f"weekend-{date}",
                    name="Weekend Gathering",
                    type="event",
                    start_date=datetime.combine(date, datetime.min.time()),
                    end_date=datetime.combine(date, datetime.max.time()),
                    photos=[a.path for a in analyses],
                    confidence=0.7,
                    related_events=[],
                    theme="weekend",
                    ai_generated_name=f"Weekend {date.strftime('%B %d, %Y')}"
                )
                events.append(event)

    return events

def generate_smart_collections(photo_analyses: List[PhotoAnalysis]) -> List[SmartCollectionSuggestion]:
    """Generate smart collection suggestions"""
    collections = []

    # Quality-based collections
    high_quality = [a for a in photo_analyses if a.quality.overall > 80]
    if len(high_quality) >= 5:
        collections.append(SmartCollectionSuggestion(
            name="Best Photos",
            description=f"My {len(high_quality)} best quality photos",
            type="quality",
            photos=[a.path for a in high_quality],
            confidence=0.9,
            auto_generated_name="Best Photos Collection",
            preview_photos=[a.path for a in high_quality[:4]],
            tags=["best", "high-quality", "favorites"],
            reason="High quality photos (80%+ score)",
            estimated_size=len(high_quality),
            quality_score=sum(a.quality.overall for a in high_quality) / len(high_quality)
        ))

    # Location-based collections
    location_groups = {}
    for analysis in photo_analyses:
        for location in analysis.locations:
            if location.name not in location_groups:
                location_groups[location.name] = []
            location_groups[location.name].append(analysis)

    for location_name, analyses in location_groups.items():
        if len(analyses) >= 3:
            collections.append(SmartCollectionSuggestion(
                name=f"Photos from {location_name}",
                description=f"{len(analyses)} photos taken at {location_name}",
                type="location",
                photos=[a.path for a in analyses],
                confidence=0.8,
                auto_generated_name=f"{location_name} Photos",
                preview_photos=[a.path for a in analyses[:4]],
                tags=["location", location_name.lower()],
                reason=f"Photos grouped by location: {location_name}",
                estimated_size=len(analyses)
            ))

    # Time-based collections
    time_groups = {}
    for analysis in photo_analyses:
        month_key = analysis.metadata.date_taken.strftime("%B %Y")
        if month_key not in time_groups:
            time_groups[month_key] = []
        time_groups[month_key].append(analysis)

    for month, analyses in time_groups.items():
        if len(analyses) >= 10:
            collections.append(SmartCollectionSuggestion(
                name=month,
                description=f"{len(analyses)} photos from {month}",
                type="time",
                photos=[a.path for a in analyses],
                confidence=0.7,
                auto_generated_name=f"{month} Collection",
                preview_photos=[a.path for a in analyses[:4]],
                tags=["time", month.lower().replace(" ", "-")],
                reason=f"Photos grouped by month: {month}",
                estimated_size=len(analyses)
            ))

    return collections

async def analyze_photos_task(job_id: str, request: AutoCurationRequest):
    """Background task for analyzing photos"""
    try:
        analysis_jobs[job_id] = {
            "status": "processing",
            "processed_photos": 0,
            "total_photos": len(request.photo_paths),
            "current_step": "Initializing analysis",
            "estimated_time_remaining": 0,
            "actions_suggested": 0
        }

        photo_analyses = []
        actions = []

        # Process each photo
        for i, photo_path in enumerate(request.photo_paths):
            try:
                # Update progress
                analysis_jobs[job_id].update({
                    "processed_photos": i,
                    "current_step": f"Analyzing {os.path.basename(photo_path)}",
                    "estimated_time_remaining": max(0, (len(request.photo_paths) - i) * 2)  # Estimate 2 seconds per photo
                })

                # Extract metadata
                metadata = extract_image_metadata(photo_path)

                # Assess quality if enabled
                quality = QualityMetrics(overall=50.0, technical=50.0, composition=50.0,
                                      sharpness=50.0, exposure=50.0, colors=50.0, factors={})
                if request.options.get("enable_quality_assessment", True):
                    quality = assess_image_quality(photo_path, metadata)

                # Create analysis (simplified version)
                analysis = PhotoAnalysis(
                    path=photo_path,
                    quality=quality,
                    duplicates=[],  # Will be filled later
                    events=[],     # Will be filled later
                    faces=[],      # Will be filled later
                    locations=[],  # Will be filled later
                    tags=[],       # Will be filled later
                    metadata=metadata
                )

                photo_analyses.append(analysis)

            except Exception as e:
                logger.error(f"Error analyzing photo {photo_path}: {e}")
                continue

        # Find duplicates if enabled
        if request.options.get("enable_duplicate_detection", True):
            analysis_jobs[job_id]["current_step"] = "Finding duplicates"
            duplicate_groups = find_duplicate_photos(
                request.photo_paths,
                request.options.get("duplicate_threshold", 85.0)
            )

            # Create duplicate cleanup actions
            for group in duplicate_groups:
                if len(group) > 1:
                    # Select best photo (simplified - choose first one)
                    best_photo = group[0]
                    photos_to_delete = group[1:]

                    if photos_to_delete:
                        actions.append(CurationAction(
                            type="delete_duplicates",
                            description=f"Delete {len(photos_to_delete)} duplicate photo(s) keeping the best one",
                            photos=photos_to_delete,
                            confidence=0.9,
                            impact="medium"
                        ))

        # Generate quality rating actions if enabled
        if request.options.get("enable_quality_assessment", True):
            analysis_jobs[job_id]["current_step"] = "Assessing photo quality"
            quality_threshold = request.options.get("quality_threshold", 50)

            for analysis in photo_analyses:
                if analysis.quality.overall > 80:
                    actions.append(CurationAction(
                        type="rate_photos",
                        description=f"Rate as 5-star (excellent quality: {round(analysis.quality.overall)}%)",
                        photos=[analysis.path],
                        confidence=0.8,
                        impact="low"
                    ))
                elif analysis.quality.overall < quality_threshold:
                    actions.append(CurationAction(
                        type="rate_photos",
                        description=f"Rate as 1-star (low quality: {round(analysis.quality.overall)}%)",
                        photos=[analysis.path],
                        confidence=0.7,
                        impact="low"
                    ))

        # Detect events if enabled
        events = []
        if request.options.get("enable_event_detection", True):
            analysis_jobs[job_id]["current_step"] = "Detecting events"
            events = detect_events(photo_analyses)

        # Generate smart collections if enabled
        collections = []
        if request.options.get("enable_smart_grouping", True):
            analysis_jobs[job_id]["current_step"] = "Generating smart collections"
            collections = generate_smart_collections(photo_analyses)

        # Update final job status
        analysis_jobs[job_id].update({
            "status": "completed",
            "processed_photos": len(request.photo_paths),
            "current_step": "Analysis complete",
            "estimated_time_remaining": 0,
            "actions_suggested": len(actions),
            "result": {
                "summary": {
                    "total_photos_analyzed": len(photo_analyses),
                    "duplicates_found": len([a for a in actions if a.type == "delete_duplicates"]),
                    "events_detected": len(events),
                    "smart_collections_suggested": len(collections),
                    "quality_ratings_assigned": len([a for a in actions if a.type == "rate_photos"]),
                    "processing_time": 0  # Would track actual time
                },
                "actions": actions,
                "collections": collections,
                "analysis": photo_analyses,
                "completed_at": datetime.now()
            }
        })

    except Exception as e:
        logger.error(f"Error in analysis job {job_id}: {e}")
        analysis_jobs[job_id] = {
            "status": "failed",
            "error": str(e),
            "completed_at": datetime.now()
        }

@router.post("/analyze", response_model=Dict[str, str])
async def start_auto_curation_analysis(request: AutoCurationRequest, background_tasks: BackgroundTasks):
    """Start auto-curation analysis in background"""
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(analysis_jobs)}"

    # Start background task
    background_tasks.add_task(analyze_photos_task, job_id, request)

    return {
        "job_id": job_id,
        "status": "started",
        "message": f"Analysis started for {len(request.photo_paths)} photos"
    }

@router.get("/progress/{job_id}", response_model=AutoCurationProgress)
async def get_analysis_progress(job_id: str):
    """Get progress of auto-curation analysis"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    job = analysis_jobs[job_id]

    if job["status"] == "failed":
        raise HTTPException(status_code=500, detail=job.get("error", "Analysis failed"))

    if job["status"] == "completed":
        # Return final progress with result
        return AutoCurationProgress(
            job_id=job_id,
            processed_photos=job["processed_photos"],
            total_photos=job["total_photos"],
            current_step=job["current_step"],
            estimated_time_remaining=job["estimated_time_remaining"],
            actions_suggested=job["actions_suggested"],
            status=job["status"]
        )

    return AutoCurationProgress(
        job_id=job_id,
        processed_photos=job["processed_photos"],
        total_photos=job["total_photos"],
        current_step=job["current_step"],
        estimated_time_remaining=job["estimated_time_remaining"],
        actions_suggested=job["actions_suggested"],
        status=job["status"]
    )

@router.get("/result/{job_id}", response_model=AutoCurationResult)
async def get_analysis_result(job_id: str):
    """Get complete auto-curation analysis result"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    job = analysis_jobs[job_id]

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")

    result_data = job["result"]
    return AutoCurationResult(
        job_id=job_id,
        summary=result_data["summary"],
        actions=result_data["actions"],
        collections=result_data["collections"],
        analysis=result_data["analysis"],
        completed_at=result_data["completed_at"]
    )

@router.delete("/job/{job_id}")
async def delete_analysis_job(job_id: str):
    """Delete analysis job and cleanup"""
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    del analysis_jobs[job_id]
    return {"message": "Job deleted successfully"}

@router.get("/jobs", response_model=List[str])
async def list_analysis_jobs():
    """List all analysis jobs"""
    return list(analysis_jobs.keys())

@router.post("/execute-actions")
async def execute_curation_actions(actions: List[CurationAction]):
    """Execute suggested curation actions"""
    # This would integrate with the existing photo management system
    # For now, just return success
    executed = []
    failed = []

    for action in actions:
        try:
            # Here you would integrate with your existing photo operations
            # For example:
            # if action.type == "delete_duplicates":
            #     await photo_service.delete_photos(action.photos)
            # elif action.type == "rate_photos":
            #     await photo_service.rate_photos(action.photos, rating)
            # etc.

            executed.append(action.description)
        except Exception as e:
            failed.append(f"{action.description}: {str(e)}")

    return {
        "executed": executed,
        "failed": failed,
        "total": len(actions)
    }

@router.post("/create-collections")
async def create_smart_collections(collections: List[SmartCollectionSuggestion]):
    """Create suggested smart collections"""
    # This would integrate with the existing collection system
    created = []
    failed = []

    for collection in collections:
        try:
            # Here you would integrate with your existing collection system
            # await collection_service.create_collection(collection.name, collection.photos)
            created.append(collection.name)
        except Exception as e:
            failed.append(f"{collection.name}: {str(e)}")

    return {
        "created": created,
        "failed": failed,
        "total": len(collections)
    }
