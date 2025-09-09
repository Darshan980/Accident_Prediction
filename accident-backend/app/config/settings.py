# config/settings.py
import os
from pathlib import Path

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

# CORS configuration
def get_cors_origins():
    env_origins = os.getenv("ALLOWED_ORIGINS", "")
    if env_origins:
        origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    else:
        origins = [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://127.0.0.1:3000",
            "https://accident-prediction-1-mpm0.onrender.com",
            "https://accident-prediction-7wnp-git-main-darshan-ss-projects-39372c06.vercel.app",
            "https://*.vercel.app",
            "https://*.onrender.com"
        ]
    
    if os.getenv("ENVIRONMENT", "development") == "development":
        origins = ["*"]
    
    return origins

# File validation
ALLOWED_FILE_TYPES = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
