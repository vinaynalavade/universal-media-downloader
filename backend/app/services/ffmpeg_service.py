import subprocess
import os

class FFmpegService:
    @staticmethod
    def check_ffmpeg():
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    @staticmethod
    def merge_audio_video(video_path: str, audio_path: str, output_path: str) -> bool:
        if not os.path.exists(video_path) or not os.path.exists(audio_path):
            return False
            
        try:
            cmd = [
                'ffmpeg', '-y',
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', 'aac',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False

ffmpeg_service = FFmpegService()
