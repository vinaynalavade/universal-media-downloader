import threading
from typing import Dict, Any

class TaskManager:
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        
    def create_task(self, task_id: str):
        with self.lock:
            self.tasks[task_id] = {
                "status": "processing",
                "progress": 0.0,
                "message": "Initializing...",
                "speed": "0 B/s",
                "eta": "Unknown",
                "file_url": None,
                "cancel_requested": False
            }
            
    def update_task(self, task_id: str, **kwargs):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id].update(kwargs)
                
    def get_task(self, task_id: str) -> Dict[str, Any] | None:
        with self.lock:
            return self.tasks.get(task_id)
            
    def request_cancel(self, task_id: str):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id]["cancel_requested"] = True

task_manager = TaskManager()
