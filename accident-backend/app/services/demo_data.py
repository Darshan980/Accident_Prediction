# services/demo_data.py - User Demo Data Service
from datetime import datetime, timedelta
from typing import Union

from auth.dependencies import get_current_user_info
from models.database import User

def get_user_demo_data(current_user: Union[User, any]):
    """Return user-specific demo data"""
    now = datetime.now()
    user_info = get_current_user_info(current_user)
    username = user_info['username']
    user_dept = getattr(current_user, 'department', 'General')
    
    return {
        "alerts": [
            {
                "id": f"user_{user_info['id']}_1",
                "message": f"Your upload: High confidence accident detected with 92.5% confidence",
                "timestamp": now.isoformat(),
                "severity": "high",
                "read": False,
                "type": "accident_detection",
                "confidence": 0.925,
                "location": f"Uploaded by {username}",
                "snapshot_url": "/snapshots/user_accident_001.jpg",
                "accident_log_id": 1,
                "processing_time": 2.3,
                "video_source": f"{username}_upload",
                "severity_estimate": "major",
                "user_id": user_info['id'],
                "created_by": username
            },
            {
                "id": f"user_{user_info['id']}_2",
                "message": f"Your upload: Medium confidence incident detected with 78.2% confidence", 
                "timestamp": (now - timedelta(minutes=15)).isoformat(),
                "severity": "medium",
                "read": False,
                "type": "accident_detection",
                "confidence": 0.782,
                "location": f"Uploaded by {username}",
                "snapshot_url": "/snapshots/user_accident_002.jpg",
                "accident_log_id": 2,
                "processing_time": 1.8,
                "video_source": f"{username}_upload",
                "severity_estimate": "minor",
                "user_id": user_info['id'],
                "created_by": username
            }
        ],
        "stats": {
            "total_alerts": 2,
            "unread_alerts": 2,
            "last_24h_detections": 2,
            "user_uploads": 5,
            "user_accuracy": "89.2%",
            "department": user_dept,
            "last_activity": now.isoformat(),
            "user_since": (now - timedelta(days=30)).isoformat(),
            "feedback_count": 3,
            "username": username,
            "user_id": user_info['id'],
            "user_type": user_info['user_type']
        }
    }
