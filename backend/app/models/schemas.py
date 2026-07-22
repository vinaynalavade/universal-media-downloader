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

class MediaInfo(BaseModel):
    id: str
    title: str
    thumbnail: str
    duration: int
    extractor: str
    formats: List[FormatInfo]

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
