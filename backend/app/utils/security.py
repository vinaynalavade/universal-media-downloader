import re
from urllib.parse import urlparse
import time
from collections import defaultdict
import threading

SUPPORTED_DOMAINS = [
    'youtube.com', 'youtu.be', 'instagram.com', 'facebook.com',
    'twitter.com', 'x.com', 'tiktok.com', 'vimeo.com',
    'dailymotion.com', 'pinterest.com', 'threads.net', 'soundcloud.com'
]

# Simple Token Bucket Rate Limiter
class RateLimiter:
    def __init__(self, limit=20, window=60):
        self.limit = limit
        self.window = window
        self.requests = defaultdict(list)
        self.lock = threading.Lock()

    def is_allowed(self, ip: str) -> bool:
        with self.lock:
            now = time.time()
            # Clean up old requests
            self.requests[ip] = [req_time for req_time in self.requests[ip] if now - req_time < self.window]
            
            if len(self.requests[ip]) >= self.limit:
                return False
                
            self.requests[ip].append(now)
            return True

# Initialize global limiter (20 requests per minute by default)
limiter = RateLimiter()

def sanitize_url(url: str) -> str | None:
    """Validates and sanitizes the input URL to prevent SSRF and path traversal via malformed URLs."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ['http', 'https']:
            return None
            
        domain = parsed.netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
            
        # Ensure no weird characters are injected for bash/cmd execution
        if re.search(r'[;&|`$><]', url):
            return None
            
        return url
    except Exception:
        return None

def rate_limit(client_ip: str) -> bool:
    """Check if the client IP has exceeded the rate limit."""
    return limiter.is_allowed(client_ip)
