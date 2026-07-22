import urllib.request
import urllib.parse
import json
import time
import os

base_url = "http://127.0.0.1:8000/api/v1"
test_video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
download_dir = "x:/Universal-Media-Downloader/downloads"

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

def get_json(url):
    res = urllib.request.urlopen(url)
    return json.loads(res.read().decode())

print("Fetching metadata...")
info = get_json(f"{base_url}/info?url={urllib.parse.quote(test_video)}")
formats = info['formats']

test_qualities = [
    ('144p', 'video'),
    ('240p', 'video'),
    ('360p', 'video'),
    ('480p', 'video'),
    ('720p', 'video'),
    ('1080p', 'video'),
    ('1440p', 'video'),
    ('2160p', 'video'),
    ('audio only', 'audio') # We will map this to mp3 and m4a in the loop
]

def test_download(format_id, dl_type, name):
    print(f"\n--- Testing {name} (Format {format_id}) ---")
    down_res = post_json(f"{base_url}/download", {"url": test_video, "format_id": format_id, "type": dl_type})
    task_id = down_res['task_id']
    
    for _ in range(60):
        status = get_json(f"{base_url}/status/{task_id}")
        if status['status'] == 'completed':
            file_url = status['file_url']
            filename = urllib.parse.unquote(file_url.split('/')[-1])
            filepath = os.path.join(download_dir, filename)
            
            exists = os.path.exists(filepath)
            size_mb = os.path.getsize(filepath) / (1024*1024) if exists else 0
            print(f"[{name}] SUCCESS. File: {filename} | Exists: {exists} | Size: {size_mb:.2f} MB")
            return True
        elif status['status'] == 'error':
            print(f"[{name}] ERROR: {status['message']}")
            return False
        time.sleep(2)
    print(f"[{name}] TIMEOUT")
    return False

successes = 0
total = 0

for q, t in test_qualities:
    if t == 'video':
        matches = [f for f in formats if f.get('quality_label') == q and f.get('vcodec') != 'none']
        if matches:
            total += 1
            if test_download(matches[0]['format_id'], 'video', q): successes += 1
    elif t == 'audio':
        # Test MP3
        matches_m4a = [f for f in formats if f.get('ext') == 'm4a' and f.get('vcodec') == 'none']
        if matches_m4a:
            total += 1
            if test_download(matches_m4a[0]['format_id'], 'audio', 'MP3 (Audio)'): successes += 1
            
print(f"\nTESTS FINISHED: {successes}/{total} succeeded")
