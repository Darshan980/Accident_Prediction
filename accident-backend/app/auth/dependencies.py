# auth/dependencies.py - FIXED VERSION
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from config.settings import SECRET_KEY, ALGORITHM
from models.database import get_db, User, Admin
from auth.handlers import verify_token, get_user_by_username, get_admin_by_username
from typing import Union
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    user = get_user_by_username(db, token_data["username"])
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to get current active user"""
    if not current_user.is_active:
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
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)
        if username is None or not is_admin:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    admin = get_admin_by_username(db, username)
    if admin is None or not admin.is_active:
        raise credentials_exception
    return admin

# NEW: Combined dependency that accepts BOTH admin and user tokens
def get_current_user_or_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Union[User, Admin]:
    """
    Dependency that accepts both admin and user tokens
    Use this for endpoints that should work for both admins and users (like upload)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # First try to decode the token
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)
        
        if username is None:
            raise credentials_exception
            
        logger.info(f"Token validation - Username: {username}, Is Admin: {is_admin}")
        
        # If it's an admin token, get admin user
        if is_admin:
            admin = get_admin_by_username(db, username)
            if admin and admin.is_active:
                logger.info(f"Admin authenticated: {username}")
                return admin
            else:
                logger.warning(f"Admin not found or inactive: {username}")
        
        # Try as regular user (either non-admin token or admin fallback)
        token_data = verify_token(credentials.credentials)
        if token_data:
            user = get_user_by_username(db, token_data["username"])
            if user and user.is_active:
                logger.info(f"User authenticated: {username}")
                return user
        
        logger.error(f"No valid user or admin found for: {username}")
        raise credentials_exception
        
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise credentials_exception

# Optional user dependency (allows both authenticated and anonymous access)
def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Optional dependency to get current user (returns None if not authenticated)"""
    try:
        token_data = verify_token(credentials.credentials)
        if token_data is None:
            return None
        
        user = get_user_by_username(db, token_data["username"])
        if user is None or not user.is_active:
            return None
        return user
    except:
        return None

# NEW: Optional dependency that works with both admin and user tokens
def get_optional_user_or_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Union[User, Admin, None]:
    """Optional dependency that accepts both admin and user tokens"""
    try:
        return get_current_user_or_admin(credentials, db)
    except HTTPException:
        return None
