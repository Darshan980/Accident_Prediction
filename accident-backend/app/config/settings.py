# config/settings.py - FIXED regex escape sequences
import os
import re
from pathlib import Path
from typing import List

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./accident_detection.db"

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Performance configuration
WORKER_TIMEOUT = 300
MAX_PREDICTION_TIME = 25
THREAD_POOL_SIZE = 2
WEBSOCKET_TIMEOUT = 60
FRAME_PROCESSING_INTERVAL = 2.0

# File paths
SNAPSHOTS_DIR = BASE_DIR / "snapshots"

def get_cors_origins() -> List[str]:
    """Get CORS origins - COMPREHENSIVE VERSION that handles Vercel preview URLs"""
    
    # Get from environment variable first
    env_origins = os.getenv("CORS_ORIGINS", "")
    
    if env_origins:
        origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
        # Filter out wildcards when using credentials
        origins = [origin for origin in origins if origin != "*"]
    else:
        # Base list of known origins
        origins = [
            # Local development
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://localhost:8000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
            
            # Your main deployments
            "https://accident-prediction-xi.vercel.app",
            "https://accident-prediction-1-mpm0.onrender.com",
        ]
    
    # Add frontend URL from environment
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url and frontend_url not in origins and frontend_url != "*":
        origins.append(frontend_url)
    
    # FIXED: Properly escaped regex patterns - using raw strings
    vercel_patterns = [
        # Your project patterns - FIXED with raw strings
        r"https://accident-prediction-.*-darshan-ss-projects-.*\.vercel\.app",
        r"https://accident-prediction-.*\.vercel\.app",
        # Add more patterns as needed
    ]
    
    # Add specific preview URLs you know about
    origins.extend([
        # Add specific preview URLs you know about
        "https://accident-prediction-ff5ymi7ps-darshan-ss-projects-39372c06.vercel.app",
        # Add more as you discover them
    ])
    
    # Remove duplicates
    return list(set(origins))

def is_allowed_origin(origin: str) -> bool:
    """Check if an origin is allowed - handles dynamic Vercel URLs"""
    if not origin:
        return False
    
    # Get static origins
    allowed_origins = get_cors_origins()
    
    # Check exact matches first
    if origin in allowed_origins:
        return True
    
    # FIXED: Check Vercel patterns with raw strings
    vercel_patterns = [
        r"^https://accident-prediction-[a-zA-Z0-9]+-darshan-ss-projects-[a-zA-Z0-9]+\.vercel\.app$",
        r"^https://accident-prediction-[a-zA-Z0-9-]+\.vercel\.app$",
    ]
    
    for pattern in vercel_patterns:
        if re.match(pattern, origin):
            return True
    
    # Check localhost patterns for development
    localhost_patterns = [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
    ]
    
    for pattern in localhost_patterns:
        if re.match(pattern, origin):
            return True
    
    return False

# Alternative: If you need wildcard behavior, disable credentials
def get_cors_origins_no_credentials() -> List[str]:
    """Alternative CORS config without credentials for wildcard support"""
    return ["*"]

# File validation
ALLOWED_FILE_TYPES = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Environment variables for production
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
