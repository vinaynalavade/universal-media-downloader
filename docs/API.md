# API Documentation

Base URL: `/api/v1`

## Endpoints

### 1. Check Health
`GET /health`
Returns the status of the API.
**Response**: `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### 2. Fetch Media Info
`GET /info?url=<MEDIA_URL>`
Fetches metadata and available formats for a given URL without downloading.
**Response**: `200 OK`
```json
{
  "id": "video_id",
  "title": "Video Title",
  "thumbnail": "https://...",
  "duration": 120,
  "extractor": "youtube",
  "formats": [
    {
      "format_id": "137",
      "ext": "mp4",
      "resolution": "1920x1080",
      "filesize": 50000000,
      "vcodec": "avc1.640028",
      "acodec": "none",
      "quality_label": "1080p"
    }
  ]
}
```

### 3. Start Download
`POST /download`
Initiates a download and format merge (if applicable).
**Request Body**:
```json
{
  "url": "https://...",
  "format_id": "137",
  "quality": "best",
  "type": "video"
}
```
**Response**: `200 OK`
```json
{
  "task_id": "sync_for_now",
  "status": "completed",
  "message": "Download successful",
  "file_url": "/api/v1/file/filename.mp4"
}
```

### 4. Fetch Downloaded File
`GET /file/{filename}`
Serves the actual downloaded file as an `application/octet-stream`.
