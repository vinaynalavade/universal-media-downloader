from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Any

class DownloadRequest(BaseModel):
    url: HttpUrl
    format_id: Optional[str] = None
    quality: Optional[str] = "best"
    type: str = "video" # "video" or "audio"

class FormatInfo(BaseModel):
    format_id: str
    ext: str
    resolution: str
    filesize: Optional[int] = None
    filesize_approx: Optional[int] = None
    vcodec: str
    acodec: str
    quality_label: str

class MediaItem(BaseModel):
    id: str
    media_type: str # "video" or "image"
    thumbnail: str
    duration: Optional[int] = 0
    width: Optional[int] = None
    height: Optional[int] = None
    download_url: Optional[str] = None
    formats: List[FormatInfo] = []

class MediaResponse(BaseModel):
    success: bool = True
    platform: str
    type: str # "single", "carousel"
    title: str
    thumbnail: str
    uploader: Optional[str] = None
    upload_date: Optional[str] = None
    items: List[MediaItem]

class ErrorResponse(BaseModel):
    success: bool = False
    platform: str
    error_code: str
    message: str

class DownloadResponse(BaseModel):
    task_id: str
    status: str
    message: str
    file_url: Optional[str] = None

class TaskStatus(BaseModel):
    status: str
    progress: float
    message: str
    speed: Optional[str] = None
    eta: Optional[str] = None
    file_url: Optional[str] = None
