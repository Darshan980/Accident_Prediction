# models/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# User schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

# Admin schemas
class AdminCreate(BaseModel):
    username: str
    email: str
    password: str
    is_super_admin: bool = False
    permissions: Optional[List[str]] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_super_admin: bool
    permissions: Optional[List[str]] = None
    created_at: datetime
    last_login: Optional[datetime] = None

class AdminToken(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    admin_level: str

# Detection schemas
class DetectionResult(BaseModel):
    accident_detected: bool
    confidence: float
    predicted_class: str
    processing_time: float
    total_processing_time: Optional[float] = None
    frame_id: Optional[str] = None
    log_id: Optional[int] = None
    snapshot_url: Optional[str] = None
    error: Optional[bool] = False
    details: Optional[str] = None

class WebSocketMessage(BaseModel):
    type: str
    frame: Optional[str] = None
    frame_id: Optional[str] = None
    timestamp: Optional[float] = None
    data: Optional[dict] = None
