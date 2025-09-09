import cv2
from pathlib import Path
from typing import Optional

def extract_video_thumbnail(video_path: Path, thumbnail_path: Path, time_seconds: float = 1.0) -> bool:
    """
    Extract a thumbnail from a video at a specific time.
    
    Args:
        video_path: Path to the video file
        thumbnail_path: Path where the thumbnail should be saved
        time_seconds: Time in seconds to extract the frame from
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create the thumbnail directory if it doesn't exist
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Open the video
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return False
            
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Calculate the frame number to extract
        frame_number = int(fps * time_seconds)
        if frame_number >= total_frames:
            frame_number = total_frames - 1
            
        # Set the video to the desired frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        
        # Read the frame
        ret, frame = cap.read()
        if not ret:
            cap.release()
            return False
            
        # Save the frame as an image
        success = cv2.imwrite(str(thumbnail_path), frame)
        cap.release()
        
        return success
    except Exception:
        return False

def get_video_metadata(video_path: Path) -> dict:
    """
    Extract metadata from a video file.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Dictionary with video metadata
    """
    try:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return {}
            
        # Get video properties
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Calculate duration
        duration = frame_count / fps if fps > 0 else 0
        
        # Release the video
        cap.release()
        
        return {
            "width": width,
            "height": height,
            "fps": fps,
            "frame_count": frame_count,
            "duration": duration,
            "codec": None  # Would need additional libraries to extract codec info
        }
    except Exception:
        return {}