# api/dashboard.py - Complete dashboard routes for your accident detection system

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta
import json
import asyncio

from models.database import get_db, User
from auth.dependencies import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()

# WebSocket connections storage
alert_connections: Dict[str, WebSocket] = {}

# User Alert endpoints
@router.get("/user/alerts")
async def get_user_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user-specific alerts"""
    try:
        # Mock data - replace with your actual database queries
        alerts = [
            {
                "id": 1,
                "message": "Accident detected at Main Street intersection",
                "timestamp": datetime.now().isoformat(),
                "severity": "high",
                "read": False,
                "type": "accident_detection"
            },
            {
                "id": 2, 
                "message": "System maintenance completed successfully",
                "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
                "severity": "info",
                "read": True,
                "type": "system"
            }
        ]
        
        return {
            "success": True,
            "alerts": alerts,
            "total": len(alerts),
            "unread": len([a for a in alerts if not a["read"]])
        }
        
    except Exception as e:
        logger.error(f"Error fetching user alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/user/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark alert as read"""
    try:
        # Mock implementation - replace with actual database update
        return {
            "success": True,
            "message": f"Alert {alert_id} marked as read"
        }
    except Exception as e:
        logger.error(f"Error marking alert as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Logs endpoint
@router.get("/logs")
async def get_logs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100)
):
    """Get system logs"""
    try:
        # Mock logs data - replace with actual logging system
        logs = [
            {
                "id": 1,
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": f"User {current_user.username} accessed dashboard",
                "source": "dashboard",
                "user_id": current_user.id
            },
            {
                "id": 2,
                "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "level": "INFO", 
                "message": "Accident detection model loaded successfully",
                "source": "ai_model",
                "user_id": None
            },
            {
                "id": 3,
                "timestamp": (datetime.now() - timedelta(minutes=10)).isoformat(),
                "level": "WARNING",
                "message": "High confidence accident detected",
                "source": "detection",
                "user_id": None
            }
        ]
        
        return {
            "success": True,
            "logs": logs[:limit],
            "total": len(logs)
        }
        
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Dashboard stats endpoints
@router.get("/user/dashboard/stats")
async def get_user_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user-specific dashboard statistics"""
    try:
        stats = {
            "total_alerts": 5,
            "unread_alerts": 2,
            "last_24h_detections": 8,
            "user_uploads": 12,
            "user_accuracy": "94.5%",
            "department": getattr(current_user, 'department', 'General'),
            "last_activity": datetime.now().isoformat(),
            "user_since": current_user.created_at.isoformat() if hasattr(current_user, 'created_at') and current_user.created_at else datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "stats": stats,
            "user_info": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "department": getattr(current_user, 'department', 'General')
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching user dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/stats")
async def get_general_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get general dashboard statistics"""
    try:
        stats = {
            "total_alerts": 15,
            "unread_alerts": 7,
            "last_24h_detections": 23,
            "total_users": 45,
            "system_accuracy": "96.2%",
            "active_connections": len(alert_connections),
            "system_uptime": "99.8%",
            "last_updated": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "stats": stats,
            "system_info": {
                "version": "2.3.0",
                "status": "operational",
                "model_loaded": True
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket authentication helper
async def authenticate_websocket_user(websocket: WebSocket) -> Optional[User]:
    """Authenticate WebSocket connection"""
    try:
        # Get token from query parameters
        token = websocket.query_params.get("token")
        
        if not token:
            logger.warning("WebSocket: No token provided")
            return None
            
        # Import auth functions
        from auth.handlers import decode_access_token
        
        # Decode token
        payload = decode_access_token(token)
        if not payload:
            logger.warning("WebSocket: Invalid token")
            return None
        
        username = payload.get("sub")
        if not username:
            logger.warning("WebSocket: No username in token")
            return None
        
        # Get user from database
        db = next(get_db())
        try:
            user = db.query(User).filter(
                User.username == username, 
                User.is_active == True
            ).first()
            
            if not user:
                logger.warning(f"WebSocket: User {username} not found")
                return None
                
            return user
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"WebSocket authentication error: {str(e)}")
        return None

# WebSocket endpoint for alerts
@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alerts"""
    current_user = await authenticate_websocket_user(websocket)
    
    if not current_user:
        await websocket.close(code=403, reason="Authentication failed")
        return
    
    client_id = f"alerts_{current_user.id}_{int(datetime.now().timestamp())}"
    
    try:
        await websocket.accept()
        alert_connections[client_id] = websocket
        logger.info(f"Alert WebSocket connected for user: {current_user.username}")
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection",
            "status": "connected",
            "user": current_user.username,
            "timestamp": datetime.now().isoformat()
        }))
        
        # Keep connection alive
        while True:
            try:
                # Wait for ping or send heartbeat every 30 seconds
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }))
                    
            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_text(json.dumps({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        logger.info(f"Alert WebSocket disconnected for user: {current_user.username}")
    except Exception as e:
        logger.error(f"Alert WebSocket error: {str(e)}")
    finally:
        if client_id in alert_connections:
            del alert_connections[client_id]
            logger.info(f"Cleaned up WebSocket connection: {client_id}")

# Broadcast function for sending alerts
async def broadcast_alert(alert_data: dict):
    """Broadcast alert to all connected clients"""
    if not alert_connections:
        return
        
    message = json.dumps({
        "type": "alert",
        "data": alert_data,
        "timestamp": datetime.now().isoformat()
    })
    
    disconnected_clients = []
    for client_id, websocket in alert_connections.items():
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send alert to {client_id}: {str(e)}")
            disconnected_clients.append(client_id)
    
    # Clean up disconnected clients
    for client_id in disconnected_clients:
        del alert_connections[client_id]

# Additional health check endpoint
@router.get("/health")
async def dashboard_health():
    """Dashboard health check"""
    return {
        "status": "healthy",
        "active_connections": len(alert_connections),
        "timestamp": datetime.now().isoformat(),
        "service": "dashboard"
    }
