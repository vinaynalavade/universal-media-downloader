import yt_dlp
import json

def test():
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'ignore_no_formats_error': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info('https://www.instagram.com/p/DTj9dxUkQOm/', download=False)
            with open('test_info3.json', 'w') as f:
                json.dump(info, f, indent=2)
            print("Success")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == '__main__':
    test()
