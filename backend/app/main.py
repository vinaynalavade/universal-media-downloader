from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
import os
import time
import threading
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Universal Media Downloader API",
    description="API for extracting and downloading media from various platforms.",
    version="1.0.0"
)

# CORS configuration
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:8080")
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Background cleanup worker
def cleanup_worker():
    downloads_dir = os.getenv("DOWNLOAD_DIR", "/app/downloads")
    while True:
        try:
            if os.path.exists(downloads_dir):
                now = time.time()
                for filename in os.listdir(downloads_dir):
                    file_path = os.path.join(downloads_dir, filename)
                    if os.path.isfile(file_path):
                        # Delete files older than 1 hour (3600 seconds)
                        if os.stat(file_path).st_mtime < now - 3600:
                            os.remove(file_path)
                            print(f"Cleaned up old file: {filename}")
        except Exception as e:
            print(f"Cleanup error: {e}")
        time.sleep(900) # Run every 15 minutes

# Start cleanup worker on startup
@app.on_event("startup")
async def startup_event():
    thread = threading.Thread(target=cleanup_worker, daemon=True)
    thread.start()
