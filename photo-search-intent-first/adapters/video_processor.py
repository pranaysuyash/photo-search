import cv2
from pathlib import Path
from typing import Dict, Any, Optional, List


def extract_video_thumbnail(video_path: Path, thumbnail_path: Path, frame_time: float = 1.0) -> bool:
    """Extract a thumbnail frame from a video at a specific time.

    Args:
        video_path: Path to the video file
        thumbnail_path: Path where the thumbnail should be saved
        frame_time: Time in seconds to extract the frame from

    Returns:
        True if thumbnail was successfully extracted, False otherwise
    """
    try:
        # Open the video file
        cap = cv2.VideoCapture(str(video_path))

        # Check if video was opened successfully
        if not cap.isOpened():
            return False

        # Get the frame rate
        fps = cap.get(cv2.CAP_PROP_FPS)

        # Calculate the frame number to extract
        frame_number = int(frame_time * fps)

        # Set the video to the desired frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)

        # Read the frame
        ret, frame = cap.read()

        if ret:
            # Save the frame as an image
            thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
            success = cv2.imwrite(str(thumbnail_path), frame)
            cap.release()
            return success
        else:
            cap.release()
            return False

    except Exception:
        # Handle any exceptions that might occur
        if 'cap' in locals():
            cap.release()
        return False


def get_video_metadata(video_path: Path) -> Dict[str, Any]:
    """Extract basic metadata from a video file.

    Args:
        video_path: Path to the video file

    Returns:
        Dictionary containing video metadata
    """
    try:
        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            return {}

        # Extract metadata
        metadata = {
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            "duration": 0  # Will calculate below
        }

        # Calculate duration
        if metadata["fps"] > 0:
            metadata["duration"] = metadata["frame_count"] / metadata["fps"]

        cap.release()
        return metadata

    except Exception:
        if 'cap' in locals():
            cap.release()
        return {}


def list_videos(root: Path) -> List[Path]:
    """List all video files in the directory tree.

    Args:
        root: Root directory to scan for videos

    Returns:
        List of paths to video files
    """
    from domain.models import SUPPORTED_VIDEO_EXTS

    video_paths = []

    for file_path in root.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_VIDEO_EXTS:
            video_paths.append(file_path)

    return video_paths