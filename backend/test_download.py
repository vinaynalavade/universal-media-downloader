import urllib.request
import urllib.parse
import json
import time

base_url = "http://127.0.0.1:8000/api/v1"
root_url = "http://127.0.0.1:8000"
test_video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

def get_json(url):
    res = urllib.request.urlopen(url)
    return json.loads(res.read().decode())

print("Testing /health...")
print(get_json(f"{root_url}/health"))

print("Testing /info...")
info = get_json(f"{base_url}/info?url={urllib.parse.quote(test_video)}")
print("Info success! Formats:", len(info['formats']))

print("Testing download (1080p)...")
format_1080 = [f for f in info['formats'] if f.get('quality_label') == '1080p' and f.get('vcodec') != 'none'][0]
print("Selected format:", format_1080['format_id'])

down_res = post_json(f"{base_url}/download", {"url": test_video, "format_id": format_1080['format_id'], "type": "video"})
task_id = down_res['task_id']
print(f"Task ID: {task_id}")

for _ in range(30):
    status = get_json(f"{base_url}/status/{task_id}")
    print("Status:", status['status'], status.get('progress', 0), "%")
    if status['status'] == 'completed':
        print("File URL:", status['file_url'])
        break
    if status['status'] == 'error':
        print("Error:", status['message'])
        break
    time.sleep(2)
