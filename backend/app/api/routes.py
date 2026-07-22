from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
import os
import uuid
import shutil

from app.models.schemas import DownloadRequest, MediaInfo, DownloadResponse, TaskStatus
from app.services.metadata_service import get_media_info
from app.services.downloader import process_download
from app.services.task_manager import task_manager
from app.utils.security import sanitize_url, rate_limit

router = APIRouter()

@router.get("/system/ffmpeg")
async def check_ffmpeg():
    has_ffmpeg = shutil.which("ffmpeg") is not None
    return {"ffmpeg_installed": has_ffmpeg}

@router.get("/info", response_model=MediaInfo)
async def fetch_info(request: Request, url: str):
    if not rate_limit(request.client.host):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
    valid_url = sanitize_url(url)
    if not valid_url:
        raise HTTPException(status_code=400, detail="Invalid or unsupported URL")
    
    try:
        info = get_media_info(valid_url)
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/download", response_model=DownloadResponse)
async def start_download(request: Request, req: DownloadRequest, background_tasks: BackgroundTasks):
    if not rate_limit(request.client.host):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
    valid_url = sanitize_url(str(req.url))
    if not valid_url:
        raise HTTPException(status_code=400, detail="Invalid or unsupported URL")
    
    task_id = str(uuid.uuid4())
    task_manager.create_task(task_id)
    
    # Spawn background task
    background_tasks.add_task(process_download, valid_url, req.format_id, req.type, task_id)
    
    return DownloadResponse(
        task_id=task_id,
        status="processing",
        message="Download queued"
    )

@router.get("/status/{task_id}", response_model=TaskStatus)
async def get_status(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatus(**task)

@router.post("/cancel/{task_id}")
async def cancel_download(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task_manager.request_cancel(task_id)
    return {"status": "cancel_requested"}

@router.get("/file/{filename}")
async def get_file(filename: str):
    downloads_dir = os.getenv("DOWNLOAD_DIR", "/app/downloads")
    file_path = os.path.join(downloads_dir, filename)
    
    # Path traversal protection
    real_downloads_dir = os.path.realpath(downloads_dir)
    real_file_path = os.path.realpath(file_path)
    
    if not real_file_path.startswith(real_downloads_dir):
        raise HTTPException(status_code=403, detail="Forbidden path")
        
    if not os.path.exists(real_file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    # Phase 6: Streaming response can be optimized via nginx or aiofiles, but FileResponse handles streaming well natively in Starlette.
    return FileResponse(path=real_file_path, filename=filename, media_type='application/octet-stream')
