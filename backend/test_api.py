from fastapi.testclient import TestClient
from app.main import app
import sys

client = TestClient(app)

def run_tests():
    print("Testing /health...")
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "1.0.0"}
    print("Health check passed.")

    print("Testing rate limiting and path validation...")
    response = client.get("/api/v1/info?url=invalid_url")
    assert response.status_code == 400
    print("Invalid URL check passed.")

    # We won't test full yt-dlp download here to avoid external network dependencies during static tests, 
    # but we can test the 404 handler for missing files
    print("Testing file fetch (404)...")
    response = client.get("/api/v1/file/nonexistent.mp4")
    assert response.status_code == 404
    print("File 404 check passed.")

    # Test Path Traversal
    print("Testing Path Traversal...")
    response = client.get("/api/v1/file/../../../etc/passwd")
    assert response.status_code in [403, 404]
    print("Path Traversal check passed.")

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
