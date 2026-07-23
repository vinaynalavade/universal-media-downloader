import yt_dlp
import os
import uuid
import re
import time
import httpx
from urllib.parse import urlparse
from app.services.task_manager import task_manager

class DownloadCancelled(Exception):
    pass

def process_download(url: str, format_id: str, media_type: str, task_id: str):
    downloads_dir = os.getenv("DOWNLOAD_DIR", "/app/downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    
    if media_type == "image":
        download_image(url, task_id, downloads_dir)
    elif media_type == "audio":
        download_audio(url, task_id, downloads_dir)
    else:
        download_video(url, format_id, task_id, downloads_dir)

def _get_progress_hook(task_id):
    def progress_hook(d):
        task = task_manager.get_task(task_id)
        if task and task.get("cancel_requested"):
            raise DownloadCancelled("Download cancelled by user")
            
        if d['status'] == 'downloading':
            try:
                percent_str = re.sub(r'\x1b[^m]*m', '', d.get('_percent_str', '0.0%')).strip('%')
                progress = float(percent_str)
                
                speed_str = re.sub(r'\x1b[^m]*m', '', d.get('_speed_str', 'Unknown')).strip()
                eta_str = re.sub(r'\x1b[^m]*m', '', d.get('_eta_str', 'Unknown')).strip()
                
                if not speed_str or speed_str.isspace(): speed_str = "Unknown"
                if not eta_str or eta_str.isspace(): eta_str = "Unknown"
                
                msg = f"Catching every byte... {progress}%"
                if progress > 90: msg = "Almost there..."
                elif progress < 10: msg = "Your internet is doing cardio..."
                
                task_manager.update_task(task_id, progress=progress, message=msg, speed=speed_str, eta=eta_str)
            except Exception:
                pass
        elif d['status'] == 'finished':
            task_manager.update_task(task_id, message="Marrying video with audio...", speed="Merging...", eta="Hold tight")
    return progress_hook

def _get_base_ydl_opts(downloads_dir):
    unique_id = str(uuid.uuid4())[:8]
    output_template = os.path.join(downloads_dir, f"%(title)s_{unique_id}.%(ext)s")
    
    return {
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "writethumbnail": True,
        "writesubtitles": True,
        "subtitleslangs": ["en"],
        "nocheckcertificate": True,
        "geo_bypass": True,
        "extractor_retries": 5,
        "fragment_retries": 5,
        "retries": 5
    }

def download_video(url: str, format_id: str, task_id: str, downloads_dir: str):
    task_manager.update_task(task_id, speed="0 B/s", eta="Unknown")
    ydl_opts = _get_base_ydl_opts(downloads_dir)
    ydl_opts["progress_hooks"] = [_get_progress_hook(task_id)]
    
    if format_id:
        ydl_opts['format'] = f"{format_id}+bestaudio/best"
        ydl_opts['merge_output_format'] = 'mp4'
    else:
        ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            if not filename.endswith('.mp4'):
                filename = os.path.splitext(filename)[0] + ".mp4"
                
            task_manager.update_task(task_id, status="completed", progress=100.0, 
                                     message="Mission accomplished.", speed="-", eta="-",
                                     file_url=f"/api/v1/file/{os.path.basename(filename)}")
    except DownloadCancelled:
        task_manager.update_task(task_id, status="cancelled", message="Download cancelled.")
    except Exception as e:
        task_manager.update_task(task_id, status="error", message="Even the internet has bad days.")

def download_audio(url: str, task_id: str, downloads_dir: str):
    task_manager.update_task(task_id, speed="0 B/s", eta="Unknown")
    ydl_opts = _get_base_ydl_opts(downloads_dir)
    ydl_opts["progress_hooks"] = [_get_progress_hook(task_id)]
    
    ydl_opts['format'] = 'bestaudio/best'
    ydl_opts['postprocessors'] = [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',
    }]

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            filename = os.path.splitext(filename)[0] + ".mp3"
                
            task_manager.update_task(task_id, status="completed", progress=100.0, 
                                     message="Mission accomplished.", speed="-", eta="-",
                                     file_url=f"/api/v1/file/{os.path.basename(filename)}")
    except DownloadCancelled:
        task_manager.update_task(task_id, status="cancelled", message="Download cancelled.")
    except Exception as e:
        task_manager.update_task(task_id, status="error", message="Even the internet has bad days.")

def download_image(url: str, task_id: str, downloads_dir: str):
    task_manager.update_task(task_id, speed="0 B/s", eta="Unknown")
    
    unique_id = str(uuid.uuid4())[:8]
    parsed = urlparse(url)
    ext = os.path.splitext(parsed.path)[1]
    if not ext:
        ext = ".webp"
        
    filename = f"image_{unique_id}{ext}"
    file_path = os.path.join(downloads_dir, filename)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.instagram.com/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
    
    try:
        with httpx.stream("GET", url, headers=headers, follow_redirects=True) as response:
            response.raise_for_status()
            total_size = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            start_time = time.time()
            
            with open(file_path, 'wb') as f:
                for chunk in response.iter_bytes(chunk_size=8192):
                    task = task_manager.get_task(task_id)
                    if task and task.get("cancel_requested"):
                        raise DownloadCancelled("Download cancelled by user")
                    
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        progress = 0
                        if total_size > 0:
                            progress = round((downloaded / total_size) * 100, 1)
                        else:
                            progress = min(99.0, downloaded / (1024 * 1024) * 10)
                        
                        elapsed = time.time() - start_time
                        speed_str = "Unknown"
                        if elapsed > 0:
                            speed_bps = downloaded / elapsed
                            if speed_bps > 1024 * 1024:
                                speed_str = f"{speed_bps / (1024 * 1024):.2f} MiB/s"
                            elif speed_bps > 1024:
                                speed_str = f"{speed_bps / 1024:.2f} KiB/s"
                            else:
                                speed_str = f"{speed_bps:.0f} B/s"
                        
                        msg = f"Catching every byte... {progress}%"
                        if progress > 90: msg = "Almost there..."
                        elif progress < 10: msg = "Your internet is doing cardio..."
                        
                        task_manager.update_task(task_id, progress=progress, message=msg, speed=speed_str, eta="Unknown")
                        
        task_manager.update_task(task_id, status="completed", progress=100.0, 
                                 message="Mission accomplished.", speed="-", eta="-",
                                 file_url=f"/api/v1/file/{filename}")
    except DownloadCancelled:
        if os.path.exists(file_path):
            os.remove(file_path)
        task_manager.update_task(task_id, status="cancelled", message="Download cancelled.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        if os.path.exists(file_path):
            os.remove(file_path)
        task_manager.update_task(task_id, status="error", message="Even the internet has bad days.")
