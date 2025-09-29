"""
Custom exception classes for the photo search API.

These exceptions provide specific error types for different failure scenarios
in the photo search application, allowing for more granular error handling
and consistent error responses.
"""


class PhotoSearchException(Exception):
    """Base exception class for all photo search related errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class FolderNotFoundException(PhotoSearchException):
    """Raised when a specified folder does not exist."""
    def __init__(self, folder_path: str):
        super().__init__(f"Folder not found: {folder_path}", 400)


class DirectoryPathRequiredException(PhotoSearchException):
    """Raised when a directory path is required but not provided."""
    def __init__(self):
        super().__init__("Directory path is required", 400)


class PathIsNotDirectoryException(PhotoSearchException):
    """Raised when a path is provided but it's not a directory."""
    def __init__(self, path: str):
        super().__init__(f"Path is not a directory: {path}", 400)


class PermissionDeniedException(PhotoSearchException):
    """Raised when permission is denied to access a folder."""
    def __init__(self, folder_path: str):
        super().__init__(f"Permission denied to access folder: {folder_path}", 403)


class CannotAccessException(PhotoSearchException):
    """Raised when a folder cannot be accessed for other reasons."""
    def __init__(self, folder_path: str, reason: str):
        super().__init__(f"Cannot access folder: {folder_path}. Reason: {reason}", 400)


class ShareNotFoundException(PhotoSearchException):
    """Raised when a share token is not found."""
    def __init__(self, token: str):
        super().__init__(f"Share not found: {token}", 404)


class ShareExpiredException(PhotoSearchException):
    """Raised when a share token has expired."""
    def __init__(self, token: str):
        super().__init__(f"Share expired: {token}", 400)


class EmbeddingFailedException(PhotoSearchException):
    """Raised when embedding generation fails."""
    def __init__(self, reason: str = "Embedding failed"):
        super().__init__(reason, 500)


class FileNotFoundException(PhotoSearchException):
    """Raised when a requested file is not found."""
    def __init__(self, file_path: str):
        super().__init__(f"File not found: {file_path}", 404)


class InvalidSearchParametersException(PhotoSearchException):
    """Raised when search parameters are invalid."""
    def __init__(self, reason: str):
        super().__init__(f"Invalid search parameters: {reason}", 400)


class ModelDownloadFailedException(PhotoSearchException):
    """Raised when model download fails."""
    def __init__(self, model_name: str, reason: str = ""):
        message = f"Model download failed: {model_name}"
        if reason:
            message += f". Reason: {reason}"
        super().__init__(message, 500)


class VideoMetadataExtractionFailedException(PhotoSearchException):
    """Raised when video metadata extraction fails."""
    def __init__(self, video_path: str):
        super().__init__(f"Could not extract video metadata: {video_path}", 500)


class VideoThumbnailGenerationFailedException(PhotoSearchException):
    """Raised when video thumbnail generation fails."""
    def __init__(self, video_path: str):
        super().__init__(f"Could not generate video thumbnail: {video_path}", 500)


class FaceClusterNotFoundException(PhotoSearchException):
    """Raised when a face cluster is not found."""
    def __init__(self, cluster_id: str):
        super().__init__(f"Face cluster not found: {cluster_id}", 404)


class FaceClusterMergeFailedException(PhotoSearchException):
    """Raised when face cluster merge operation fails."""
    def __init__(self, reason: str = "Could not merge face clusters"):
        super().__init__(reason, 500)


class FaceClusterSplitFailedException(PhotoSearchException):
    """Raised when face cluster split operation fails."""
    def __init__(self, reason: str = "Could not split face cluster"):
        super().__init__(reason, 500)


class UnsafeAppDataPathException(PhotoSearchException):
    """Raised when an unsafe app data path is provided."""
    def __init__(self, path: str):
        super().__init__(f"Unsafe app data path: {path}", 400)


class PSAppDataDirNotSetException(PhotoSearchException):
    """Raised when PS_APPDATA_DIR environment variable is not set."""
    def __init__(self):
        super().__init__("PS_APPDATA_DIR not set", 400)