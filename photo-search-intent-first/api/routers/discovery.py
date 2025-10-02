"""
Discovery Router
Handles smart photo discovery and recommendation endpoints
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from pydantic import BaseModel, Field

from api.utils import _emb
from api.runtime_flags import is_offline
from adapters.provider_factory import get_provider
from infra.index_store import IndexStore

logger = logging.getLogger(__name__)
router = APIRouter()

# Global index store instance
index_store = None

def get_index_store():
    """Get or create the index store instance"""
    global index_store
    if index_store is None:
        index_store = IndexStore("index")  # Use default index path
    return index_store

# Pydantic models for request/response
class DiscoveryRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=100, description="Number of recommendations to return")
    user_id: Optional[str] = Field(default=None, description="User identifier for personalization")
    algorithm: Optional[str] = Field(default="hybrid", description="Recommendation algorithm")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Discovery context")
    exclude_recently_viewed: bool = Field(default=True, description="Exclude recently viewed photos")

class ContentBasedRequest(BaseModel):
    recent_photos: List[str] = Field(default=[], description="Recently viewed photo IDs")
    preferences: Dict[str, Any] = Field(default={}, description="User preferences")
    context: Dict[str, Any] = Field(default={}, description="Context information")
    limit: int = Field(default=20, ge=1, le=100, description="Number of recommendations")

class TimeBasedRequest(BaseModel):
    current_date: str = Field(description="Current date in ISO format")
    season: Optional[str] = Field(default=None, description="Current season")
    day_of_week: Optional[str] = Field(default=None, description="Day of week")
    time_of_day: Optional[str] = Field(default=None, description="Time of day")
    limit: int = Field(default=20, ge=1, le=100, description="Number of recommendations")

class MoodBasedRequest(BaseModel):
    mood: str = Field(description="Target mood (nostalgic, creative, organized, exploratory)")
    limit: int = Field(default=20, ge=1, le=100, description="Number of recommendations")

class SerendipityRequest(BaseModel):
    user_history: List[Dict[str, Any]] = Field(default=[], description="User interaction history")
    context: Dict[str, Any] = Field(default={}, description="Context information")
    limit: int = Field(default=20, ge=1, le=100, description="Number of recommendations")

class DiscoveryResponse(BaseModel):
    photos: List[Dict[str, Any]] = Field(description="Recommended photos")
    algorithm: str = Field(description="Algorithm used")
    total_available: int = Field(description="Total photos available")
    metadata: Dict[str, Any] = Field(default={}, description="Additional metadata")

@router.post("/discovery/recommendations")
async def get_recommendations(request: DiscoveryRequest) -> DiscoveryResponse:
    """
    Get personalized photo recommendations based on various algorithms
    """
    try:
        store = get_index_store()

        # Get all photos from index
        all_photos = store.get_all_photos()
        if not all_photos:
            return DiscoveryResponse(
                photos=[],
                algorithm=request.algorithm or "hybrid",
                total_available=0,
                metadata={"error": "No photos found in library"}
            )

        # Apply different recommendation strategies based on algorithm
        algorithm = request.algorithm or "hybrid"
        recommendations = []

        if algorithm == "hybrid":
            # Mix of different strategies
            recommendations = get_hybrid_recommendations(all_photos, request)
        elif algorithm == "content_based":
            recommendations = get_content_based_recommendations(all_photos, request)
        elif algorithm == "trending":
            recommendations = get_trending_recommendations(all_photos, request)
        elif algorithm == "time_decay":
            recommendations = get_time_based_recommendations(all_photos, request)
        elif algorithm == "diversity_focused":
            recommendations = get_diversity_focused_recommendations(all_photos, request)
        elif algorithm == "quality_focused":
            recommendations = get_quality_focused_recommendations(all_photos, request)
        elif algorithm == "serendipity":
            recommendations = get_serendipity_recommendations(all_photos, request)
        else:
            recommendations = get_hybrid_recommendations(all_photos, request)

        # Apply limit
        recommendations = recommendations[:request.limit]

        return DiscoveryResponse(
            photos=recommendations,
            algorithm=algorithm,
            total_available=len(all_photos),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "user_id": request.user_id,
                "context": request.context
            }
        )

    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/content-based")
async def get_content_based_discovery(request: ContentBasedRequest) -> DiscoveryResponse:
    """
    Get content-based recommendations similar to recently viewed photos
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        recommendations = []

        # If we have recent photos, find similar ones
        if request.recent_photos:
            recommendations = find_similar_photos(store, request.recent_photos, request.limit)
        else:
            # Fallback to quality-based recommendations
            recommendations = get_quality_focused_recommendations(all_photos, request)

        return DiscoveryResponse(
            photos=recommendations,
            algorithm="content_based",
            total_available=len(all_photos),
            metadata={"similar_to": request.recent_photos[:5]}
        )

    except Exception as e:
        logger.error(f"Error getting content-based recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/trending")
async def get_trending_discovery(
    limit: int = Query(default=10, ge=1, le=50)
) -> DiscoveryResponse:
    """
    Get trending photos based on recent activity patterns
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        # Simulate trending by combining recency and diversity
        trending = get_trending_recommendations(all_photos, {"limit": limit})

        return DiscoveryResponse(
            photos=trending,
            algorithm="trending",
            total_available=len(all_photos),
            metadata={"trending_score": "simulated"}
        )

    except Exception as e:
        logger.error(f"Error getting trending photos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/forgotten-gems")
async def get_forgotten_gems_discovery(
    limit: int = Query(default=10, ge=1, le=50)
) -> DiscoveryResponse:
    """
    Get high-quality photos that haven't been viewed recently
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        # Find older, high-quality photos
        gems = find_forgotten_gems(store, all_photos, limit)

        return DiscoveryResponse(
            photos=gems,
            algorithm="forgotten_gems",
            total_available=len(all_photos),
            metadata={"gem_score": "quality + age"}
        )

    except Exception as e:
        logger.error(f"Error getting forgotten gems: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/time-based")
async def get_time_based_discovery(request: TimeBasedRequest) -> DiscoveryResponse:
    """
    Get time-based recommendations (anniversaries, seasonal, etc.)
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        recommendations = get_time_based_recommendations(all_photos, request)

        return DiscoveryResponse(
            photos=recommendations,
            algorithm="time_based",
            total_available=len(all_photos),
            metadata={
                "season": request.season,
                "day_of_week": request.day_of_week,
                "time_of_day": request.time_of_day
            }
        )

    except Exception as e:
        logger.error(f"Error getting time-based recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/mood-based")
async def get_mood_based_discovery(request: MoodBasedRequest) -> DiscoveryResponse:
    """
    Get mood-based photo recommendations
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        recommendations = get_mood_based_recommendations(store, all_photos, request.mood, request.limit)

        return DiscoveryResponse(
            photos=recommendations,
            algorithm="mood_based",
            total_available=len(all_photos),
            metadata={"mood": request.mood}
        )

    except Exception as e:
        logger.error(f"Error getting mood-based recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/serendipity")
async def get_serendipity_discovery(request: SerendipityRequest) -> DiscoveryResponse:
    """
    Get serendipitous recommendations - unexpected but delightful discoveries
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        recommendations = get_serendipity_recommendations(all_photos, request)

        return DiscoveryResponse(
            photos=recommendations,
            algorithm="serendipity",
            total_available=len(all_photos),
            metadata={
                "serendipity_score": "unexpected_connections",
                "user_history_length": len(request.user_history)
            }
        )

    except Exception as e:
        logger.error(f"Error getting serendipity recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discovery/quality-focused")
async def get_quality_focused_discovery(
    limit: int = Query(default=10, ge=1, le=50)
) -> DiscoveryResponse:
    """
    Get recommendations focused on technical excellence
    """
    try:
        store = get_index_store()
        all_photos = store.get_all_photos()

        recommendations = get_quality_focused_recommendations(all_photos, {"limit": limit})

        return DiscoveryResponse(
            photos=recommendations,
            algorithm="quality_focused",
            total_available=len(all_photos),
            metadata={"quality_factors": ["resolution", "composition", "clarity"]}
        )

    except Exception as e:
        logger.error(f"Error getting quality-focused recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions for different recommendation strategies

def get_hybrid_recommendations(all_photos: List[Dict], request: DiscoveryRequest) -> List[Dict]:
    """Hybrid recommendation mixing multiple strategies"""
    recommendations = []

    # Mix of different recommendation types
    quality_recs = get_quality_focused_recommendations(all_photos, request)[:5]
    time_recs = get_time_based_recommendations(all_photos, request)[:5]
    trending_recs = get_trending_recommendations(all_photos, request)[:5]

    recommendations.extend(quality_recs)
    recommendations.extend(time_recs)
    recommendations.extend(trending_recs)

    # Remove duplicates and shuffle for variety
    seen = set()
    unique_recs = []
    for rec in recommendations:
        if rec.get('path') not in seen:
            seen.add(rec.get('path'))
            unique_recs.append(rec)

    return unique_recs[:request.limit]

def get_content_based_recommendations(all_photos: List[Dict], request: DiscoveryRequest) -> List[Dict]:
    """Content-based recommendations using photo similarity"""
    # This would use embeddings for real similarity
    # For now, return a diverse selection
    return select_diverse_photos(all_photos, request.limit)

def get_trending_recommendations(all_photos: List[Dict], request: DiscoveryRequest) -> List[Dict]:
    """Trending recommendations based on simulated activity patterns"""
    # Simulate trending by favoring recent and diverse photos
    recent_photos = [p for p in all_photos if is_recent_photo(p)]

    if len(recent_photos) >= request.limit:
        return recent_photos[:request.limit]
    else:
        # Fill with older photos
        older_photos = [p for p in all_photos if not is_recent_photo(p)]
        return recent_photos + older_photos[:request.limit - len(recent_photos)]

def get_time_based_recommendations(all_photos: List[Dict], request) -> List[Dict]:
    """Time-based recommendations considering current date/time"""
    current_date = datetime.now()
    recommendations = []

    # Find photos from current date in previous years
    for photo in all_photos:
        photo_date = parse_photo_date(photo)
        if photo_date and is_same_day_and_month(photo_date, current_date):
            recommendations.append(photo)

    # If not enough, add seasonal photos
    if len(recommendations) < request.limit:
        season = getattr(request, 'season', get_current_season())
        seasonal_photos = [p for p in all_photos if is_seasonal_photo(p, season)]
        recommendations.extend(seasonal_photos)

    return remove_duplicates(recommendations)[:request.limit]

def get_diversity_focused_recommendations(all_photos: List[Dict], request: DiscoveryRequest) -> List[Dict]:
    """Diverse recommendations covering different categories"""
    return select_diverse_photos(all_photos, request.limit)

def get_quality_focused_recommendations(all_photos: List[Dict], request) -> List[Dict]:
    """Quality-focused recommendations based on technical excellence"""
    # Sort by quality indicators (file size, resolution, etc.)
    quality_photos = sorted(
        all_photos,
       	key=lambda p: calculate_quality_score(p),
        reverse=True
    )
    return quality_photos[:request.limit]

def get_serendipity_recommendations(all_photos: List[Dict], request) -> List[Dict]:
    """Serendipitous recommendations - unexpected discoveries"""
    # Randomly select photos from different time periods and categories
    if len(all_photos) <= request.limit:
        return all_photos

    # Ensure temporal diversity
    recommendations = []
    sorted_by_date = sorted(all_photos, key=lambda p: parse_photo_date(p) or datetime.min)

    # Sample from different periods
    step = len(sorted_by_date) // request.limit
    for i in range(0, len(sorted_by_date), step):
        if len(recommendations) < request.limit:
            recommendations.append(sorted_by_date[i])

    return recommendations[:request.limit]

def find_similar_photos(store: IndexStore, photo_ids: List[str], limit: int) -> List[Dict]:
    """Find photos similar to the given photo IDs"""
    # This would use embeddings for real similarity search
    # For now, return photos with similar metadata
    all_photos = store.get_all_photos()
    return select_diverse_photos(all_photos, limit)

def find_forgotten_gems(store: IndexStore, all_photos: List[Dict], limit: int) -> List[Dict]:
    """Find old, high-quality photos that haven't been viewed recently"""
    # Sort by quality and age
    cutoff_date = datetime.now() - timedelta(days=90)

    old_photos = [p for p in all_photos if parse_photo_date(p) and parse_photo_date(p) < cutoff_date]
    quality_photos = sorted(old_photos, key=lambda p: calculate_quality_score(p), reverse=True)

    return quality_photos[:limit]

def get_mood_based_recommendations(store: IndexStore, all_photos: List[Dict], mood: str, limit: int) -> List[Dict]:
    """Get mood-based photo recommendations"""
    # This would use AI to analyze photo mood
    # For now, use heuristics based on metadata
    mood_keywords = {
        'nostalgic': ['family', 'old', 'childhood', 'memory'],
        'creative': ['art', 'creative', 'abstract', 'colorful'],
        'organized': ['group', 'collection', 'organized'],
        'exploratory': ['travel', 'new', 'adventure', 'explore']
    }

    keywords = mood_keywords.get(mood, [])
    matching_photos = []

    for photo in all_photos:
        if any(keyword in str(photo).lower() for keyword in keywords):
            matching_photos.append(photo)

    # If not enough matches, add random photos
    if len(matching_photos) < limit:
        remaining = limit - len(matching_photos)
        other_photos = [p for p in all_photos if p not in matching_photos]
        matching_photos.extend(other_photos[:remaining])

    return matching_photos[:limit]

# Utility functions

def is_recent_photo(photo: Dict) -> bool:
    """Check if photo is recent (last 30 days)"""
    photo_date = parse_photo_date(photo)
    if photo_date:
        return photo_date > datetime.now() - timedelta(days=30)
    return False

def is_seasonal_photo(photo: Dict, season: str) -> bool:
    """Check if photo matches the given season"""
    photo_date = parse_photo_date(photo)
    if photo_date:
        photo_season = get_season(photo_date)
        return photo_season == season
    return False

def parse_photo_date(photo: Dict) -> Optional[datetime]:
    """Extract date from photo metadata"""
    # Try different date fields
    date_fields = ['date_taken', 'date', 'created', 'timestamp']

    for field in date_fields:
        if field in photo:
            try:
                if isinstance(photo[field], str):
                    return datetime.fromisoformat(photo[field].replace('Z', '+00:00'))
                elif isinstance(photo[field], (int, float)):
                    return datetime.fromtimestamp(photo[field])
            except (ValueError, OSError):
                continue

    # Try to extract from file path
    if 'path' in photo:
        path = Path(photo['path'])
        # Look for date patterns in filename/path
        import re
        date_pattern = r'(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})'
        match = re.search(date_pattern, str(path))
        if match:
            try:
                year, month, day = map(int, match.groups())
                return datetime(year, month, day)
            except ValueError:
                pass

    return None

def is_same_day_and_month(date1: datetime, date2: datetime) -> bool:
    """Check if two dates have the same day and month"""
    return date1.day == date2.day and date1.month == date2.month

def get_current_season() -> str:
    """Get current season"""
    month = datetime.now().month
    if month in [3, 4, 5]:
        return 'spring'
    elif month in [6, 7, 8]:
        return 'summer'
    elif month in [9, 10, 11]:
        return 'fall'
    else:
        return 'winter'

def get_season(date: datetime) -> str:
    """Get season for a given date"""
    month = date.month
    if month in [3, 4, 5]:
        return 'spring'
    elif month in [6, 7, 8]:
        return 'summer'
    elif month in [9, 10, 11]:
        return 'fall'
    else:
        return 'winter'

def calculate_quality_score(photo: Dict) -> float:
    """Calculate a quality score for a photo"""
    score = 0.0

    # File size (larger files often indicate higher quality)
    if 'file_size' in photo:
        score += min(photo['file_size'] / (10 * 1024 * 1024), 1.0) * 0.3

    # Resolution
    if 'width' in photo and 'height' in photo:
        megapixels = (photo['width'] * photo['height']) / (1024 * 1024)
        score += min(megapixels / 10, 1.0) * 0.4

    # Camera quality
    if 'camera' in photo:
        # Professional cameras often have specific patterns
        camera = str(photo['camera']).lower()
        if any(brand in camera for brand in ['canon', 'nikon', 'sony', 'fujifilm']):
            score += 0.2

    # Random factor for variety
    import random
    score += random.random() * 0.1

    return score

def select_diverse_photos(photos: List[Dict], limit: int) -> List[Dict]:
    """Select diverse photos covering different time periods and categories"""
    if len(photos) <= limit:
        return photos

    # Sort by date
    dated_photos = [(p, parse_photo_date(p)) for p in photos]
    dated_photos = [(p, d) for p, d in dated_photos if d is not None]

    if not dated_photos:
        return photos[:limit]

    # Sort by date
    dated_photos.sort(key=lambda x: x[1])

    # Sample evenly across the time range
    step = len(dated_photos) // limit
    selected = []

    for i in range(0, len(dated_photos), step):
        if len(selected) < limit:
            selected.append(dated_photos[i][0])

    return selected

def remove_duplicates(photos: List[Dict]) -> List[Dict]:
    """Remove duplicate photos based on path"""
    seen = set()
    unique = []

    for photo in photos:
        path = photo.get('path')
        if path and path not in seen:
            seen.add(path)
            unique.append(photo)

    return unique