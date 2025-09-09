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

# CORS configuration - FIXED
def get_cors_origins() -> List[str]:
    """Get CORS origins from environment or use defaults"""
    
    # Get from environment variable first
    env_origins = os.getenv("CORS_ORIGINS", "")
    
    if env_origins:
        origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    else:
        # Comprehensive list of allowed origins
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
            
            # All Vercel deployments (wildcards)
            "https://accident-prediction-7wnp-git-main-darshan-ss-projects-39372c06.vercel.app",
            
            # Generic patterns for your domains
        ]
        
        # Add wildcard patterns for Vercel
        vercel_patterns = [
            "https://*.vercel.app",
            "https://*.onrender.com"
        ]
        origins.extend(vercel_patterns)
    
    # In development or testing, allow all origins
    environment = os.getenv("ENVIRONMENT", "development")
    if environment in ["development", "testing"]:
        origins.append("*")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_origins = []
    for origin in origins:
        if origin not in seen:
            seen.add(origin)
            unique_origins.append(origin)
    
    return unique_origins

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
