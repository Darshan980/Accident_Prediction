# config/settings.py - FIXED CORS configuration
import os
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

# FIXED CORS configuration - NO WILDCARDS with credentials
def get_cors_origins() -> List[str]:
    """Get CORS origins from environment or use defaults - FIXED VERSION"""
    
    # Get from environment variable first
    env_origins = os.getenv("CORS_ORIGINS", "")
    
    if env_origins:
        origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
        # Filter out wildcards when using credentials
        origins = [origin for origin in origins if origin != "*"]
    else:
        # Comprehensive list of allowed origins - NO WILDCARDS
        origins = [
            # Local development
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://localhost:8000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
            
            # Your specific deployments
            "https://accident-prediction-xi.vercel.app",
            "https://accident-prediction-1-mpm0.onrender.com",
            "https://accident-prediction-7wnp-git-main-darshan-ss-projects-39372c06.vercel.app",
        ]
    
    # Add your actual frontend URL if deployed
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url and frontend_url not in origins and frontend_url != "*":
        origins.append(frontend_url)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_origins = []
    for origin in origins:
        if origin not in seen and origin != "*":  # Explicitly exclude wildcards
            seen.add(origin)
            unique_origins.append(origin)
    
    return unique_origins

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
