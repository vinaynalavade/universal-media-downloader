import yt_dlp
import os
import logging
from app.models.schemas import MediaResponse, MediaItem, FormatInfo

logger = logging.getLogger(__name__)

class MetadataExtractionError(Exception):
    def __init__(self, message, error_code, platform="unknown"):
        self.message = message
        self.error_code = error_code
        self.platform = platform
        super().__init__(self.message)

def get_media_info(url: str) -> MediaResponse:
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'dump_single_json': True,
        'extract_flat': False,
        'ignore_no_formats_error': True,
    }
    
    # Check for optional cookies.txt
    if os.path.exists('cookies.txt'):
        ydl_opts['cookiefile'] = 'cookies.txt'
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        logger.exception("yt-dlp download error")
        error_msg = str(e).lower()
        if "login" in error_msg or "sign in" in error_msg:
            raise MetadataExtractionError("This post requires login.", "LOGIN_REQUIRED", "instagram")
        elif "rate-limit" in error_msg or "too many requests" in error_msg:
            raise MetadataExtractionError("Instagram rate limit reached. Retry in a few minutes.", "RATE_LIMIT", "instagram")
        elif "temporarily blocked" in error_msg:
            raise MetadataExtractionError("Instagram temporarily blocked this request. Please try again later.", "BLOCKED", "instagram")
        else:
            # Clean up the yt-dlp error string for the user
            clean_err = str(e).replace('ERROR: ', '')
            raise MetadataExtractionError(f"yt-dlp failed to extract metadata. Reason: {clean_err}", "EXTRACTION_FAILED", "unknown")
    except Exception as e:
        logger.exception(f"Failed to fetch media info: {str(e)}")
        raise MetadataExtractionError(f"Internal extraction error: {str(e)}", "INTERNAL_ERROR", "unknown")
        
    platform = info.get('extractor', 'unknown').lower()
    title = info.get('title', 'Unknown Title')
    uploader = info.get('uploader')
    upload_date = info.get('upload_date')
    
    items = []
    
    # Check if it's a playlist / carousel
    entries = info.get('entries')
    if entries and len(entries) > 0:
        media_type = "carousel"
        for idx, entry in enumerate(entries):
            if not entry:
                continue
            item = _parse_item(entry, f"{info.get('id', 'item')}_{idx}")
            items.append(item)
    else:
        media_type = "single"
        items.append(_parse_item(info, info.get('id', 'item')))
        
    # Determine the top-level thumbnail
    thumbnail = ""
    if items:
        thumbnail = items[0].thumbnail
    # Fallback to top level info thumbnail if items thumbnail is missing
    thumbnail = info.get('thumbnail') or thumbnail

    return MediaResponse(
        success=True,
        platform=platform,
        type=media_type,
        title=title,
        thumbnail=thumbnail,
        uploader=uploader,
        upload_date=upload_date,
        items=items
    )

def _parse_item(data: dict, fallback_id: str) -> MediaItem:
    item_id = data.get('id') or fallback_id
    formats_source = data.get('formats', [])
    
    formats = []
    has_video = False
    for f in formats_source:
        vcodec = f.get('vcodec', 'none')
        acodec = f.get('acodec', 'none')
        ext = f.get('ext', '')
        
        # yt-dlp for Instagram Reels often returns vcodec='none' and acodec='none' 
        # despite it being a valid mp4 video format.
        is_video_format = (vcodec != 'none' or acodec != 'none' or ext == 'mp4')
        
        if is_video_format:
            # Images in yt-dlp formats often have vcodec mhtml or none, video usually has real codec or mp4 ext
            if (vcodec != 'none' and vcodec != 'mhtml') or ext == 'mp4':
                has_video = True
            formats.append(FormatInfo(
                format_id=f.get('format_id', ''),
                ext=f.get('ext', ''),
                resolution=f.get('resolution') or f"{f.get('width', 'audio')}x{f.get('height', 'only')}",
                filesize=f.get('filesize'),
                filesize_approx=f.get('filesize_approx'),
                vcodec=vcodec,
                acodec=acodec,
                quality_label=f.get('format_note', 'unknown')
            ))
            
    # Determine media_type
    media_type = "video" if has_video else "image"
    
    # Extract best thumbnail/image
    thumbnail = data.get('thumbnail', '')
    original_url = data.get('url')
    display_url = data.get('display_url')
    
    download_url = None
    
    if media_type == "image":
        # Priority 1: Original URL from yt-dlp
        if original_url:
            download_url = original_url
        # Priority 2: Display URL
        elif display_url:
            download_url = display_url
            
        thumbnails = data.get('thumbnails', [])
        best_thumb_url = None
        if thumbnails:
            import re
            best_res = -1
            best_thumb_url = thumbnails[-1].get('url', thumbnail)
            for t in thumbnails:
                url = t.get('url', '')
                if not url: continue
                # Look for resize parameters like s1080x1080 or p1080x1080
                match = re.search(r'(?:s|p)(\d+)x(\d+)', url)
                if not match:
                    # No resize parameter found, this is the original uncropped image
                    best_thumb_url = url
                    break
                w, h = int(match.group(1)), int(match.group(2))
                res = w * h
                if res > best_res:
                    best_res = res
                    best_thumb_url = url
                        
        # If we didn't get an original URL, fallback to the best thumbnail
        if not download_url:
            download_url = best_thumb_url or thumbnail
            
        # Ensure thumbnail is set
        thumbnail = best_thumb_url or thumbnail
    else:
        # For videos and audio, we MUST NOT return the direct stream URL (original_url)
        # because it contains & characters that break sanitize_url() and it breaks 
        # yt-dlp's generic downloader which expects the clean page URL.
        # By keeping download_url = None, the frontend falls back to the clean input URL.
        download_url = None
        
    width = data.get('width')
    height = data.get('height')
    duration = data.get('duration', 0)
    
    return MediaItem(
        id=item_id,
        media_type=media_type,
        thumbnail=thumbnail,
        duration=duration,
        width=width,
        height=height,
        download_url=download_url,
        formats=formats
    )
