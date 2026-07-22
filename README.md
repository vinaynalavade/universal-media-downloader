# Universal Media Downloader

An extremely fast, modern, Apple-inspired website that allows users to download media from supported platforms safely and efficiently.

## Features

- **Multi-Platform Support**: YouTube, Instagram, Twitter/X, TikTok, Vimeo, and more.
- **High-Quality Downloads**: Audio, video, subtitles, and thumbnails.
- **Premium Design**: Apple-inspired clean UI, liquid glassmorphism, responsive to all devices.
- **Fast Performance**: GPU-accelerated animations and an instant user experience.
- **Secure Backend**: FastAPI with yt-dlp, FFmpeg integration, input validation, and proper rate limiting.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JS (No frameworks)
- **Backend**: Python 3.10+, FastAPI, yt-dlp, FFmpeg
- **QA / Automation**: Java, Selenium, TestNG

## Quick Start (Docker)

To run the complete stack including the backend API and frontend static server, use Docker Compose:

```bash
docker-compose up --build -d
```

Access the frontend at `http://localhost:8080` and the API at `http://localhost:8000`.

## Local Development

See [Installation.md](docs/Installation.md) for detailed local development setup.

## License

MIT License. See [LICENSE](LICENSE) for details.
