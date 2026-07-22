import yt_dlp
from app.models.schemas import MediaInfo, FormatInfo

def get_media_info(url: str) -> MediaInfo:
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'dump_single_json': True,
        'extract_flat': False,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        
        formats = []
        for f in info.get('formats', []):
            if f.get('vcodec') != 'none' or f.get('acodec') != 'none':
                formats.append(FormatInfo(
                    format_id=f.get('format_id', ''),
                    ext=f.get('ext', ''),
                    resolution=f.get('resolution') or f"{f.get('width', 'audio')}x{f.get('height', 'only')}",
                    filesize=f.get('filesize'),
                    filesize_approx=f.get('filesize_approx'),
                    vcodec=f.get('vcodec', 'none'),
                    acodec=f.get('acodec', 'none'),
                    quality_label=f.get('format_note', 'unknown')
                ))
                
        return MediaInfo(
            id=info.get('id', ''),
            title=info.get('title', 'Unknown Title'),
            thumbnail=info.get('thumbnail', ''),
            duration=info.get('duration', 0),
            extractor=info.get('extractor', 'unknown'),
            formats=formats
        )
