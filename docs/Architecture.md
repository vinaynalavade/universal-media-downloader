# System Architecture

## Overview
Universal Media Downloader follows a standard client-server architecture.

1. **Frontend**: A static HTML/CSS/JS single-page-like application served via Nginx. It handles UI state, user inputs, validation, and visual feedback (Apple-inspired glassmorphism).
2. **Backend API**: A Python FastAPI service that acts as the coordinator. It exposes RESTful endpoints (`/info` and `/download`).
3. **Core Engine**: `yt-dlp` is used for extraction logic due to its robust support for 1,000+ sites.
4. **Media Processing**: `FFmpeg` is utilized by the backend to merge high-quality video and audio streams that are distributed separately by platforms like YouTube.

## Data Flow
1. User inputs a URL.
2. Frontend `validation.js` ensures it's a valid HTTP/HTTPS URL.
3. Frontend makes a `GET /api/v1/info` request.
4. Backend `security.py` sanitizes the URL.
5. `metadata_service.py` uses `yt-dlp` to fetch metadata and available formats without downloading.
6. Backend returns JSON to frontend.
7. User selects format and quality, clicks Download.
8. Frontend makes `POST /api/v1/download`.
9. Backend `downloader.py` triggers `yt-dlp` (and `FFmpeg` if merging is required).
10. File is saved to `/downloads`.
11. Backend returns a temporary file URL.
12. Frontend triggers the browser's native download for that URL.
