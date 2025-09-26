import asyncio
import time
from typing import Dict, Any, Optional
from fastapi import WebSocket
from threading import Lock


class ProgressTracker:
    """Simple progress tracking system for long-running operations."""

    def __init__(self):
        self.operations: Dict[str, Dict[str, Any]] = {}
        self.lock = Lock()

    def start_operation(self, operation_id: str, operation_type: str, total_items: int = 0) -> None:
        """Start tracking a new operation."""
        with self.lock:
            self.operations[operation_id] = {
                "type": operation_type,
                "status": "running",
                "total": total_items,
                "processed": 0,
                "start_time": time.time(),
                "last_update": time.time(),
                "message": "Operation started"
            }

    def update_progress(self, operation_id: str, processed: int, message: Optional[str] = None) -> None:
        """Update progress for an operation."""
        with self.lock:
            if operation_id in self.operations:
                self.operations[operation_id]["processed"] = processed
                self.operations[operation_id]["last_update"] = time.time()
                if message:
                    self.operations[operation_id]["message"] = message

    def complete_operation(self, operation_id: str, message: Optional[str] = None) -> None:
        """Mark an operation as completed."""
        with self.lock:
            if operation_id in self.operations:
                self.operations[operation_id]["status"] = "completed"
                self.operations[operation_id]["last_update"] = time.time()
                if message:
                    self.operations[operation_id]["message"] = message

    def fail_operation(self, operation_id: str, message: Optional[str] = None) -> None:
        """Mark an operation as failed."""
        with self.lock:
            if operation_id in self.operations:
                self.operations[operation_id]["status"] = "failed"
                self.operations[operation_id]["last_update"] = time.time()
                if message:
                    self.operations[operation_id]["message"] = message

    def cancel_operation(self, operation_id: str) -> None:
        """Mark an operation as cancelled."""
        with self.lock:
            if operation_id in self.operations:
                self.operations[operation_id]["status"] = "cancelled"
                self.operations[operation_id]["last_update"] = time.time()
                self.operations[operation_id]["message"] = "Operation cancelled by user"

    def get_operation_status(self, operation_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific operation."""
        with self.lock:
            return self.operations.get(operation_id, None)

    def remove_operation(self, operation_id: str) -> None:
        """Remove an operation from tracking."""
        with self.lock:
            if operation_id in self.operations:
                del self.operations[operation_id]


# Global progress tracker instance
progress_tracker = ProgressTracker()


async def websocket_progress_handler(websocket: WebSocket, operation_id: str):
    """WebSocket handler for sending real-time progress updates."""
    await websocket.accept()

    try:
        while True:
            # Get operation status
            status = progress_tracker.get_operation_status(operation_id)

            if status is None:
                await websocket.send_json({
                    "type": "error",
                    "message": "Operation not found"
                })
                break

            # Send status update
            await websocket.send_json({
                "type": "progress",
                "operation_id": operation_id,
                "status": status
            })

            # Check if operation is completed or failed
            if status["status"] in ["completed", "failed", "cancelled"]:
                await websocket.send_json({
                    "type": "complete",
                    "operation_id": operation_id,
                    "status": status["status"],
                    "message": status.get("message", "")
                })
                break

            # Wait before sending next update
            await asyncio.sleep(1)

    except Exception:
        pass
    finally:
        await websocket.close()


# Simple operation cancellation registry
class OperationCanceller:
    """Simple system for cancelling long-running operations."""

    def __init__(self):
        self.cancelled_operations = set()
        self.lock = Lock()

    def request_cancellation(self, operation_id: str) -> None:
        """Request cancellation of an operation."""
        with self.lock:
            self.cancelled_operations.add(operation_id)

    def is_cancelled(self, operation_id: str) -> bool:
        """Check if an operation has been cancelled."""
        with self.lock:
            return operation_id in self.cancelled_operations

    def clear_cancellation(self, operation_id: str) -> None:
        """Clear cancellation flag for an operation."""
        with self.lock:
            if operation_id in self.cancelled_operations:
                self.cancelled_operations.remove(operation_id)


# Global operation canceller instance
operation_canceller = OperationCanceller()