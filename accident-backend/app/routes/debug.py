# routes/debug.py - Authentication Debug Endpoints
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import get_db, User
from auth.dependencies import OptionalHTTPBearer

logger = logging.getLogger(__name__)

router = APIRouter()

optional_security = OptionalHTTPBearer(auto_error=False)

@router.get("/auth-status")
async def debug_auth_status(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check authentication status"""
    debug_info = {
        "timestamp": datetime.now().isoformat(),
        "has_credentials": credentials is not None,
        "headers": {},
        "token_info": {},
        "database_check": {},
        "auth_result": "no_token"
    }
    
    # Check headers
    debug_info["headers"] = {
        "authorization": request.headers.get("authorization", "NOT_PRESENT"),
        "origin": request.headers.get("origin", "NOT_PRESENT"),
        "user_agent": request.headers.get("user-agent", "NOT_PRESENT")[:100],
        "content_type": request.headers.get("content-type", "NOT_PRESENT")
    }
    
    if credentials:
        try:
            # Try to decode token
            from jose import jwt
            from config.settings import SECRET_KEY, ALGORITHM
            
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            debug_info["token_info"] = {
                "username": payload.get("sub"),
                "is_admin": payload.get("is_admin", False),
                "exp": payload.get("exp"),
                "token_valid": True
            }
            
            username = payload.get("sub")
            is_admin = payload.get("is_admin", False)
            
            # Check database
            if is_admin:
                try:
                    from models.database import Admin
                    admin = db.query(Admin).filter(Admin.username == username).first()
                    debug_info["database_check"]["admin"] = {
                        "exists": admin is not None,
                        "is_active": getattr(admin, 'is_active', False) if admin else False,
                        "username": getattr(admin, 'username', None) if admin else None
                    }
                    if admin and getattr(admin, 'is_active', False):
                        debug_info["auth_result"] = "admin_authenticated"
                except Exception as e:
                    debug_info["database_check"]["admin_error"] = str(e)
            
            # Check regular user
            user = db.query(User).filter(User.username == username).first()
            debug_info["database_check"]["user"] = {
                "exists": user is not None,
                "is_active": getattr(user, 'is_active', False) if user else False,
                "username": getattr(user, 'username', None) if user else None,
                "is_admin": getattr(user, 'is_admin', False) if user else False
            }
            
            if user and getattr(user, 'is_active', False):
                if debug_info["auth_result"] == "no_token":
                    debug_info["auth_result"] = "user_authenticated"
                
        except Exception as e:
            debug_info["token_info"]["error"] = str(e)
            debug_info["auth_result"] = "token_invalid"
    
    return debug_info
