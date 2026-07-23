import sys
from app.services.metadata_service import get_media_info

def test():
    try:
        url = 'https://www.instagram.com/p/DTj9dxUkQOm/'
        res = get_media_info(url)
        print("Success:", res.success)
        print("Platform:", res.platform)
        print("Type:", res.type)
        print("Title:", res.title)
        print("Items Count:", len(res.items))
        for item in res.items:
            print(f"  - {item.id} | {item.media_type} | {len(item.formats)} formats | DL: {item.download_url}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    test()
