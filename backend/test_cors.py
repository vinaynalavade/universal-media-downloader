import urllib.request
import urllib.parse
from urllib.error import HTTPError

url = "http://127.0.0.1:8000/api/v1/info?url=" + urllib.parse.quote("https://www.youtube.com/watch?v=dQw4w9WgXcQ")

req = urllib.request.Request(url, headers={'Origin': 'null'})

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS")
    print("Headers:", response.headers)
except HTTPError as e:
    print(f"HTTP ERROR {e.code}")
    print("Headers:", e.headers)
    print(e.read().decode())
