# auth/dependencies.py - FIXED ADMIN TOKEN VALIDATION
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from config.settings import SECRET_KEY, ALGORITHM
from models.database import get_db, User, Admin
from typing import Union, Optional
import logging

logger = logging.getLogger(__name__)

class OptionalHTTPBearer(HTTPBearer):
    def __init__(self, auto_error: bool = False):
        super().__init__(auto_error=auto_error)

security = HTTPBearer()
optional_security = OptionalHTTPBearer(auto_error=False)

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username from database"""
    try:
        return db.query(User).filter(User.username == username).first()
    except Exception as e:
        logger.error(f"Error getting user {username}: {str(e)}")
        return None

def get_admin_by_username(db: Session, username: str) -> Optional[Admin]:
    """Get admin by username from database"""
    try:
        return db.query(Admin).filter(Admin.username == username).first()
    except Exception as e:
        logger.error(f"Error getting admin {username}: {str(e)}")
        return None

def verify_and_decode_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            return None
        return payload
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate user credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_and_decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    username = payload.get("sub")
    user = get_user_by_username(db, username)
    if user is None or not getattr(user, 'is_active', True):
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to get current active user"""
    if not getattr(current_user, 'is_active', True):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> Admin:
    """Dependency to get current authenticated admin"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_and_decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    username = payload.get("sub")
    is_admin = payload.get("is_admin", False)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    admin = get_admin_by_username(db, username)
    if admin is None or not getattr(admin, 'is_active', True):
        raise credentials_exception
    return admin

def get_current_user_or_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Union[User, Admin]:
    """
    FIXED: Dependency that properly handles both admin and user tokens
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode and verify the token first
    payload = verify_and_decode_token(credentials.credentials)
    if payload is None:
        logger.error("Token verification failed")
        raise credentials_exception
    
    username = payload.get("sub")
    is_admin = payload.get("is_admin", False)
    
    if username is None:
        logger.error("No username in token payload")
        raise credentials_exception
    
    logger.info(f"Token decoded - Username: {username}, Is Admin: {is_admin}")
    
    # If token indicates admin, try admin authentication first
    if is_admin:
        admin = get_admin_by_username(db, username)
        if admin and getattr(admin, 'is_active', True):
            logger.info(f"Admin authenticated successfully: {username}")
            return admin
        else:
            logger.warning(f"Admin not found or inactive: {username}")
    
    # Try regular user authentication as fallback
    user = get_user_by_username(db, username)
    if user and getattr(user, 'is_active', True):
        logger.info(f"User authenticated successfully: {username}")
        return user
    
    logger.error(f"No valid user or admin found for: {username}")
    raise credentials_exception

def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(optional_security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Optional dependency to get current user (returns None if not authenticated)"""
    if credentials is None:
        return None
        
    try:
        payload = verify_and_decode_token(credentials.credentials)
        if payload is None:
            return None
        
        username = payload.get("sub")
        if username is None:
            return None
            
        user = get_user_by_username(db, username)
        if user and getattr(user, 'is_active', True):
            return user
        return None
    except Exception as e:
        logger.debug(f"Optional user auth failed: {str(e)}")
        return None

def get_optional_user_or_admin(
    credentials: HTTPAuthorizationCredentials = Depends(optional_security),
    db: Session = Depends(get_db)
) -> Union[User, Admin, None]:
    """Optional dependency that accepts both admin and user tokens"""
    if credentials is None:
        return None
        
    try:
        return get_current_user_or_admin(credentials, db)
    except HTTPException as e:
        logger.debug(f"Optional user/admin auth failed: {str(e)}")
        return None
    except Exception as e:
        logger.debug(f"Optional user/admin auth error: {str(e)}")
        return None

def require_admin(current_user: Union[User, Admin] = Depends(get_current_user_or_admin)) -> Admin:
    """Dependency that requires admin access"""
    # Check if it's an Admin object
    if hasattr(current_user, 'admin_id'):
        return current_user
    
    # Check if it's a User object with admin privileges
    if hasattr(current_user, 'is_admin') and getattr(current_user, 'is_admin', False):
        return current_user
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )

def get_current_user_info(current_user: Union[User, Admin]) -> dict:
    """Extract user information from User or Admin object"""
    if hasattr(current_user, 'admin_id'):  # Admin object
        return {
            'id': current_user.admin_id,
            'username': current_user.username,
            'email': getattr(current_user, 'email', ''),
            'is_admin': True,
            'user_type': 'admin',
            'is_active': getattr(current_user, 'is_active', True)
        }
    else:  # User object
        return {
            'id': current_user.id,
            'username': current_user.username,
            'email': getattr(current_user, 'email', ''),
            'is_admin': getattr(current_user, 'is_admin', False),
            'user_type': 'user',
            'is_active': getattr(current_user, 'is_active', True)
        }
