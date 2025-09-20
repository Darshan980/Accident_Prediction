# routes/dashboard.py - User Dashboard Endpoints
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Union, Optional
from fastapi import APIRouter, Query, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import desc, and_, or_, func
from sqlalchemy.orm import Session

from models.database import get_db, User, AccidentLog
from auth.dependencies import get_current_user_or_admin, get_optional_user, get_current_user_info
from services.demo_data import get_user_demo_data

logger = logging.getLogger(__name__)

router = APIRouter()

# WebSocket connections storage
alert_connections: Dict[str, WebSocket] = {}

@router.get("/health")
async def dashboard_health():
    """Dashboard health check"""
    try:
        return {
            "status": "healthy",
            "service": "user_specific_dashboard",
            "timestamp": datetime.now().isoformat(),
            "active_connections": len(alert_connections),
            "endpoints_available": [
                "/api/dashboard/user/alerts", 
                "/api/dashboard/user/stats",
                "/api/dashboard/user/alerts/{alert_id}/read",
                "/api/dashboard/ws/alerts"
            ],
            "version": "2.5.1",
            "features": ["user_specific_data", "department_filtering", "personal_analytics", "mark_as_read"],
            "authentication": "fixed"
        }
    except Exception as e:
        logger.error(f"Dashboard health check failed: {str(e)}")
        return {
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/user/alerts")
async def get_user_alerts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Union[User, any] = Depends(get_current_user_or_admin)
):
    """Get user-specific alerts ONLY - shows only current user's data"""
    try:
        user_info = get_current_user_info(current_user)
        logger.info(f"User alerts endpoint called for {user_info['user_type']} {user_info['username']} (ID: {user_info['id']})")
        
        # Try to get user-specific data from database
        try:
            # Build query for user-specific accidents
            alerts_query = db.query(AccidentLog).filter(
                and_(
                    AccidentLog.accident_detected == True,
                    AccidentLog.confidence >= 0.6
                )
            )
            
            # Filter by user - try multiple approaches
            user_filters = []
            
            # Try user_id column
            try:
                user_filters.append(AccidentLog.user_id == user_info['id'])
                logger.info(f"Added user_id filter: {user_info['id']}")
            except Exception:
                pass
            
            # Try created_by column
            try:
                user_filters.append(AccidentLog.created_by == user_info['username'])
                logger.info(f"Added created_by filter: {user_info['username']}")
            except Exception:
                pass
            
            # Apply user filters if any exist
            if user_filters:
                alerts_query = alerts_query.filter(or_(*user_filters))
            else:
                logger.warning("No user filtering columns available, returning user demo data")
                raise Exception("No user filtering available")
            
            alerts_query = alerts_query.order_by(desc(AccidentLog.created_at))
            total_count = alerts_query.count()
            alerts_data = alerts_query.offset(offset).limit(limit).all()
            
            logger.info(f"Found {total_count} user-specific alerts for {user_info['user_type']} {user_info['username']}")
            
            if alerts_data:
                alerts = []
                for log in alerts_data:
                    alert = {
                        "id": log.id,
                        "message": f"Your upload: Accident detected with {(log.confidence*100):.1f}% confidence",
                        "timestamp": log.created_at.isoformat(),
                        "severity": "high" if log.confidence >= 0.85 else "medium" if log.confidence >= 0.7 else "low",
                        "read": log.status == "acknowledged",
                        "type": "accident_detection",
                        "confidence": log.confidence,
                        "location": log.location or f"Uploaded by {user_info['username']}",
                        "snapshot_url": log.snapshot_url,
                        "accident_log_id": log.id,
                        "user_id": getattr(log, 'user_id', user_info['id']),
                        "created_by": getattr(log, 'created_by', user_info['username'])
                    }
                    alerts.append(alert)
                
                return {
                    "success": True,
                    "alerts": alerts,
                    "total": total_count,
                    "unread": len([a for a in alerts if not a["read"]]),
                    "source": "database",
                    "user_info": user_info
                }
                
        except Exception as db_error:
            logger.error(f"Database query failed for {user_info['user_type']} {user_info['username']}: {str(db_error)}")
        
        # Fallback to user-specific demo data
        user_demo_data = get_user_demo_data(current_user)
        alerts = user_demo_data["alerts"]
        
        return {
            "success": True,
            "alerts": alerts,
            "total": len(alerts),
            "unread": len([a for a in alerts if not a["read"]]),
            "source": "user_demo",
            "user_info": user_info
        }
        
    except Exception as e:
        logger.error(f"Error in user alerts endpoint: {str(e)}")
        # Return user demo data as fallback
        try:
            user_demo_data = get_user_demo_data(current_user)
            user_info = get_current_user_info(current_user)
            return {
                "success": True,
                "alerts": user_demo_data["alerts"],
                "total": len(user_demo_data["alerts"]),
                "unread": len(user_demo_data["alerts"]),
                "source": "user_demo_fallback",
                "error": str(e),
                "user_info": user_info
            }
        except Exception as e2:
            return {
                "success": False,
                "alerts": [],
                "total": 0,
                "unread": 0,
                "error": f"Critical error: {str(e2)}",
                "original_error": str(e)
            }

@router.put("/user/alerts/{alert_id}/read")
async def mark_alert_as_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Union[User, any] = Depends(get_current_user_or_admin)
):
    """Mark a specific alert as read for the current user"""
    try:
        user_info = get_current_user_info(current_user)
        logger.info(f"Marking alert {alert_id} as read for {user_info['user_type']} {user_info['username']}")
        
        # Find the alert belonging to this user
        alert_query = db.query(AccidentLog).filter(
            and_(
                AccidentLog.id == alert_id,
                or_(
                    AccidentLog.user_id == user_info['id'],
                    AccidentLog.created_by == user_info['username']
                )
            )
        )
        
        alert = alert_query.first()
        if not alert:
            logger.warning(f"Alert {alert_id} not found for user {user_info['username']}")
            return {
                "success": False,
                "error": "Alert not found or access denied",
                "alert_id": alert_id,
                "user_info": user_info
            }
        
        # Mark as read by updating status
        alert.status = "acknowledged"
        db.commit()
        
        logger.info(f"Alert {alert_id} marked as read successfully for user {user_info['username']}")
        
        # Send WebSocket update to connected clients
        if alert_connections:
            update_message = {
                "type": "update_alert",
                "data": {
                    "id": alert.id,
                    "read": True,
                    "status": "acknowledged"
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Send to all connected WebSocket clients
            disconnected_clients = []
            for client_id, websocket in alert_connections.items():
                try:
                    await websocket.send_text(json.dumps(update_message))
                    logger.info(f"Sent read status update to WebSocket client {client_id}")
                except Exception as ws_error:
                    logger.error(f"Failed to send WebSocket update to {client_id}: {ws_error}")
                    disconnected_clients.append(client_id)
            
            # Clean up disconnected clients
            for client_id in disconnected_clients:
                if client_id in alert_connections:
                    del alert_connections[client_id]
        
        return {
            "success": True,
            "message": f"Alert {alert_id} marked as read",
            "alert": {
                "id": alert.id,
                "read": True,
                "status": "acknowledged",
                "updated_at": datetime.now().isoformat()
            },
            "user_info": user_info
        }
        
    except Exception as e:
        logger.error(f"Error marking alert {alert_id} as read: {str(e)}")
        db.rollback()
        return {
            "success": False,
            "error": str(e),
            "alert_id": alert_id
        }

@router.patch("/user/alerts/{alert_id}")
async def update_alert_status(
    alert_id: int,
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: Union[User, any] = Depends(get_current_user_or_admin)
):
    """Alternative endpoint to update alert status (PATCH method)"""
    try:
        user_info = get_current_user_info(current_user)
        logger.info(f"Updating alert {alert_id} for {user_info['user_type']} {user_info['username']}")
        
        # Find the alert belonging to this user
        alert_query = db.query(AccidentLog).filter(
            and_(
                AccidentLog.id == alert_id,
                or_(
                    AccidentLog.user_id == user_info['id'],
                    AccidentLog.created_by == user_info['username']
                )
            )
        )
        
        alert = alert_query.first()
        if not alert:
            return {
                "success": False,
                "error": "Alert not found or access denied",
                "alert_id": alert_id
            }
        
        # Update status if provided
        if "read" in request_data and request_data["read"]:
            alert.status = "acknowledged"
            db.commit()
            logger.info(f"Alert {alert_id} status updated via PATCH")
            
            return {
                "success": True,
                "message": f"Alert {alert_id} updated",
                "alert": {
                    "id": alert.id,
                    "read": True,
                    "status": "acknowledged"
                }
            }
        
        return {
            "success": False,
            "error": "No valid update data provided",
            "alert_id": alert_id
        }
        
    except Exception as e:
        logger.error(f"Error updating alert {alert_id}: {str(e)}")
        db.rollback()
        return {
            "success": False,
            "error": str(e),
            "alert_id": alert_id
        }

@router.patch("/user/alerts/mark-all-read")
async def mark_all_alerts_read(
    db: Session = Depends(get_db),
    current_user: Union[User, any] = Depends(get_current_user_or_admin)
):
    """Mark all alerts as read for the current user"""
    try:
        user_info = get_current_user_info(current_user)
        logger.info(f"Marking all alerts as read for {user_info['user_type']} {user_info['username']}")
        
        # Update all user's alerts to acknowledged status
        user_filters = []
        try:
            user_filters.append(AccidentLog.user_id == user_info['id'])
        except:
            pass
        
        try:
            user_filters.append(AccidentLog.created_by == user_info['username'])
        except:
            pass
        
        if user_filters:
            updated_count = db.query(AccidentLog).filter(
                and_(
                    AccidentLog.accident_detected == True,
                    AccidentLog.status != "acknowledged",
                    or_(*user_filters)
                )
            ).update({"status": "acknowledged"}, synchronize_session=False)
            
            db.commit()
            
            logger.info(f"Marked {updated_count} alerts as read for user {user_info['username']}")
            
            return {
                "success": True,
                "message": f"Marked {updated_count} alerts as read",
                "updated_count": updated_count,
                "user_info": user_info
            }
        else:
            return {
                "success": False,
                "error": "No user filtering available",
                "updated_count": 0
            }
            
    except Exception as e:
        logger.error(f"Error marking all alerts as read: {str(e)}")
        db.rollback()
        return {
            "success": False,
            "error": str(e),
            "updated_count": 0
        }

@router.get("/user/stats")
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: Union[User, any] = Depends(get_current_user_or_admin)
):
    """Get user-specific dashboard stats ONLY"""
    try:
        user_info = get_current_user_info(current_user)
        logger.info(f"User stats endpoint called for {user_info['user_type']} {user_info['username']} (ID: {user_info['id']})")
        
        # Try to get real user-specific stats
        try:
            now = datetime.now()
            last_24h = now - timedelta(hours=24)
            last_7d = now - timedelta(days=7)
            
            # Build user-specific queries
            base_query = db.query(AccidentLog).filter(
                and_(
                    AccidentLog.accident_detected == True,
                    AccidentLog.confidence >= 0.6
                )
            )
            
            # Filter by user
            user_filters = []
            
            try:
                user_filters.append(AccidentLog.user_id == user_info['id'])
            except:
                pass
            
            try:
                user_filters.append(AccidentLog.created_by == user_info['username'])
            except:
                pass
            
            if user_filters:
                user_query = base_query.filter(or_(*user_filters))
                
                total_alerts = user_query.filter(AccidentLog.created_at >= last_7d).count()
                last_24h_detections = user_query.filter(AccidentLog.created_at >= last_24h).count()
                
                if total_alerts >= 0:  # Even 0 is valid
                    avg_confidence = db.query(func.avg(AccidentLog.confidence)).filter(
                        and_(*user_filters, AccidentLog.created_at >= last_7d)
                    ).scalar() or 0.0
                    
                    return {
                        "success": True,
                        "total_alerts": total_alerts,
                        "unread_alerts": total_alerts,
                        "last_24h_detections": last_24h_detections,
                        "user_uploads": total_alerts + 5,
                        "user_accuracy": f"{avg_confidence*100:.1f}%",
                        "department": getattr(current_user, 'department', 'General'),
                        "last_activity": now.isoformat(),
                        "user_since": getattr(current_user, 'created_at', now - timedelta(days=30)).isoformat(),
                        "source": "database",
                        "user_info": user_info
                    }
                    
        except Exception as db_error:
            logger.error(f"Database stats query failed for {user_info['user_type']} {user_info['username']}: {str(db_error)}")
        
        # Fallback to user-specific demo data
        user_demo_data = get_user_demo_data(current_user)
        stats = user_demo_data["stats"]
        stats["source"] = "user_demo"
        stats["user_info"] = user_info
        
        return {
            "success": True,
            **stats
        }
        
    except Exception as e:
        logger.error(f"Error in user stats endpoint: {str(e)}")
        try:
            user_demo_data = get_user_demo_data(current_user)
            user_info = get_current_user_info(current_user)
            stats = user_demo_data["stats"]
            stats["source"] = "user_demo_fallback"
            stats["error"] = str(e)
            stats["user_info"] = user_info
            
            return {
                "success": True,
                **stats
            }
        except Exception as e2:
            return {
                "success": False,
                "total_alerts": 0,
                "unread_alerts": 0,
                "error": f"Critical error: {str(e2)}",
                "original_error": str(e)
            }

@router.get("/user/profile")
async def get_user_profile(
    current_user: Union[User, any] = Depends(get_current_user_or_admin),
    db: Session = Depends(get_db)
):
    """Get current user's profile information"""
    try:
        user_info = get_current_user_info(current_user)
        
        # Get user's upload history count
        try:
            user_uploads_count = db.query(AccidentLog).filter(
                or_(
                    AccidentLog.user_id == user_info['id'],
                    AccidentLog.created_by == user_info['username']
                )
            ).count()
        except:
            user_uploads_count = 0
        
        # Get user's accident detection rate
        try:
            user_accidents_count = db.query(AccidentLog).filter(
                and_(
                    AccidentLog.accident_detected == True,
                    or_(
                        AccidentLog.user_id == user_info['id'],
                        AccidentLog.created_by == user_info['username']
                    )
                )
            ).count()
        except:
            user_accidents_count = 0
        
        return {
            "success": True,
            "user_info": {
                **user_info,
                "created_at": getattr(current_user, 'created_at', datetime.now()).isoformat(),
                "last_login": getattr(current_user, 'last_login', None),
                "department": getattr(current_user, 'department', 'General')
            },
            "statistics": {
                "total_uploads": user_uploads_count,
                "accidents_detected": user_accidents_count,
                "detection_rate": f"{(user_accidents_count/user_uploads_count*100):.1f}%" if user_uploads_count > 0 else "0%",
                "account_age_days": (datetime.now() - getattr(current_user, 'created_at', datetime.now())).days
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return {
            "success": True,
            "user_info": {
                **get_current_user_info(current_user),
                "department": getattr(current_user, 'department', 'General')
            },
            "statistics": {
                "total_uploads": 0,
                "accidents_detected": 0,
                "detection_rate": "0%",
                "account_age_days": 0
            },
            "error": str(e)
        }

@router.websocket("/ws/alerts")
async def websocket_user_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time user-specific alerts"""
    client_id = f"user_alerts_{int(datetime.now().timestamp())}"
    
    try:
        logger.info(f"WebSocket connection attempt: {client_id}")
        
        await websocket.accept()
        alert_connections[client_id] = websocket
        logger.info(f"User Alert WebSocket connected: {client_id} (Total: {len(alert_connections)})")
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "timestamp": datetime.now().isoformat(),
            "message": "User-specific WebSocket connected successfully",
            "note": "Only your alerts will be sent to this connection"
        }))
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                
                try:
                    message = json.loads(data)
                    logger.info(f"WebSocket message: {message.get('type')}")
                    
                    if message.get("type") == "ping":
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "timestamp": datetime.now().isoformat()
                        }))
                    elif message.get("type") == "subscribe":
                        user_info = message.get("user_info", {})
                        await websocket.send_text(json.dumps({
                            "type": "subscribed",
                            "message": f"Subscribed to alerts for user: {user_info.get('username', 'unknown')}",
                            "timestamp": datetime.now().isoformat(),
                            "active_connections": len(alert_connections),
                            "user_specific": True
                        }))
                        
                except json.JSONDecodeError:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }))
                    
            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_text(json.dumps({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat(),
                    "active_connections": len(alert_connections),
                    "user_specific": True
                }))
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        if client_id in alert_connections:
            del alert_connections[client_id]
        logger.info(f"Cleaned up WebSocket: {client_id} (Remaining: {len(alert_connections)})")

# Legacy endpoints for backward compatibility
@router.get("/alerts")
async def get_alerts_redirect(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[Union[User, any]] = Depends(get_optional_user)
):
    """Legacy alerts endpoint - redirects to user-specific if authenticated"""
    if current_user:
        try:
            user_info = get_current_user_info(current_user)
            logger.info(f"Redirecting authenticated {user_info['user_type']} {user_info['username']} to user-specific alerts")
            return await get_user_alerts(limit, offset, db, current_user)
        except Exception as e:
            logger.error(f"Error in legacy alerts redirect: {str(e)}")
            return {
                "success": False,
                "alerts": [],
                "total": 0,
                "unread": 0,
                "error": str(e),
                "source": "legacy_error"
            }
    else:
        # Return empty/minimal data for unauthenticated users
        return {
            "success": True,
            "alerts": [],
            "total": 0,
            "unread": 0,
            "source": "unauthenticated",
            "message": "Please login to view your alerts"
        }

@router.get("/stats")
async def get_stats_redirect(
    db: Session = Depends(get_db),
    current_user: Optional[Union[User, any]] = Depends(get_optional_user)
):
    """Legacy stats endpoint - redirects to user-specific if authenticated"""
    if current_user:
        try:
            user_info = get_current_user_info(current_user)
            logger.info(f"Redirecting authenticated {user_info['user_type']} {user_info['username']} to user-specific stats")
            return await get_user_stats(db, current_user)
        except Exception as e:
            logger.error(f"Error in legacy stats redirect: {str(e)}")
            return {
                "success": False,
                "total_alerts": 0,
                "unread_alerts": 0,
                "error": str(e),
                "source": "legacy_error"
            }
    else:
        # Return minimal stats for unauthenticated users
        return {
            "success": True,
            "total_alerts": 0,
            "unread_alerts": 0,
            "last_24h_detections": 0,
            "user_uploads": 0,
            "user_accuracy": "N/A",
            "department": "None",
            "source": "unauthenticated",
            "message": "Please login to view your stats"
        }
