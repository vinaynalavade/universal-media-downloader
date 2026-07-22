import urllib.request
import urllib.parse
from urllib.error import HTTPError

url = "http://127.0.0.1:8000/api/v1/info?url=" + urllib.parse.quote("https://www.youtube.com/watch?v=dQw4w9WgXcQ")

try:
    response = urllib.request.urlopen(url)
    print("SUCCESS")
    print(response.read().decode())
except HTTPError as e:
    print(f"HTTP ERROR {e.code}")
    print(e.read().decode())
