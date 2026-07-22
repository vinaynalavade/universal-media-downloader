import urllib.request
import urllib.parse
import json

base_url = "http://127.0.0.1:8000/api/v1"
test_video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

def test_endpoint(name, url):
    try:
        res = urllib.request.urlopen(url)
        print(f"[{name}] SUCCESS: {res.getcode()}")
        return json.loads(res.read().decode())
    except Exception as e:
        print(f"[{name}] FAILED: {e}")
        return None

print("=== API TESTS ===")
health = test_endpoint("HEALTH", f"{base_url}/health")
ffmpeg = test_endpoint("FFMPEG", f"{base_url}/system/ffmpeg")
info = test_endpoint("INFO", f"{base_url}/info?url={urllib.parse.quote(test_video)}")

print("\n--- Summary ---")
print("Health:", health)
print("FFMPEG:", ffmpeg)
if info:
    print("Info: Got", len(info.get('formats', [])), "formats")
