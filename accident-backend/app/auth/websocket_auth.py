# auth/websocket_auth.py - WebSocket authentication helper

from fastapi import WebSocket, status
from sqlalchemy.orm import Session
from models.database import get_db, User
from auth.handlers import decode_access_token
import logging

logger = logging.getLogger(__name__)

async def authenticate_websocket(websocket: WebSocket) -> User:
    """
    Authenticate WebSocket connection using token from query params or headers
    """
    try:
        # Try to get token from query parameters
        token = websocket.query_params.get("token")
        
        if not token:
            # Try to get from headers (if supported by client)
            token = websocket.headers.get("Authorization")
            if token and token.startswith("Bearer "):
                token = token[7:]
        
        if not token:
            logger.warning("WebSocket authentication failed: No token provided")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
            return None
        
        # Decode the token
        payload = decode_access_token(token)
        if not payload:
            logger.warning("WebSocket authentication failed: Invalid token")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return None
        
        username = payload.get("sub")
        if not username:
            logger.warning("WebSocket authentication failed: No username in token")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
            return None
        
        # Get user from database
        db = next(get_db())
        try:
            user = db.query(User).filter(User.username == username, User.is_active == True).first()
            if not user:
                logger.warning(f"WebSocket authentication failed: User {username} not found or inactive")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
                return None
            
            logger.info(f"WebSocket authenticated successfully for user: {username}")
            return user
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"WebSocket authentication error: {str(e)}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Authentication error")
        except:
            pass
        return None
