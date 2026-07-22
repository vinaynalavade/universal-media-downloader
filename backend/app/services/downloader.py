import yt_dlp
import os
import uuid
import re
from app.services.task_manager import task_manager

class DownloadCancelled(Exception):
    pass

def process_download(url: str, format_id: str, media_type: str, task_id: str):
    downloads_dir = os.getenv("DOWNLOAD_DIR", "/app/downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    
    unique_id = str(uuid.uuid4())[:8]
    output_template = os.path.join(downloads_dir, f"%(title)s_{unique_id}.%(ext)s")
    
    # Store initial state in task manager
    task_manager.update_task(task_id, speed="0 B/s", eta="Unknown")
    
    def progress_hook(d):
        task = task_manager.get_task(task_id)
        if task and task.get("cancel_requested"):
            raise DownloadCancelled("Download cancelled by user")
            
        if d['status'] == 'downloading':
            # Calculate progress
            try:
                # _percent_str can have ANSI escape codes in some environments, so strip them
                percent_str = re.sub(r'\x1b[^m]*m', '', d.get('_percent_str', '0.0%')).strip('%')
                progress = float(percent_str)
                
                speed_str = re.sub(r'\x1b[^m]*m', '', d.get('_speed_str', 'Unknown')).strip()
                eta_str = re.sub(r'\x1b[^m]*m', '', d.get('_eta_str', 'Unknown')).strip()
                
                # Default empty/invalid strings to Unknown
                if not speed_str or speed_str.isspace(): speed_str = "Unknown"
                if not eta_str or eta_str.isspace(): eta_str = "Unknown"
                
                # Apply Humor & Personality dynamically based on progress
                msg = f"Catching every byte... {progress}%"
                if progress > 90: msg = "Almost there..."
                elif progress < 10: msg = "Your internet is doing cardio..."
                
                task_manager.update_task(task_id, progress=progress, message=msg, speed=speed_str, eta=eta_str)
            except Exception:
                pass
        elif d['status'] == 'finished':
            task_manager.update_task(task_id, message="Marrying video with audio...", speed="Merging...", eta="Hold tight")

    ydl_opts = {
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook],
        'writethumbnail': True, # Request: Thumbnail extraction
        'writesubtitles': True, # Request: Subtitle extraction
        'subtitleslangs': ['en'],
    }
    
    if media_type == "audio":
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    else:
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
            
            if media_type == "audio":
                filename = os.path.splitext(filename)[0] + ".mp3"
                
            if media_type == "video" and not filename.endswith('.mp4'):
                filename = os.path.splitext(filename)[0] + ".mp4"
                
            task_manager.update_task(task_id, 
                                     status="completed", 
                                     progress=100.0, 
                                     message="Mission accomplished.", 
                                     speed="-",
                                     eta="-",
                                     file_url=f"/api/v1/file/{os.path.basename(filename)}")
    except DownloadCancelled:
        task_manager.update_task(task_id, status="cancelled", message="Download cancelled.")
    except Exception as e:
        task_manager.update_task(task_id, status="error", message="Even the internet has bad days.")
