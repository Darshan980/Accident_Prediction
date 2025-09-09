# api/websocket.py
import json
import time
import uuid
import base64
import asyncio
import logging
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect

from config.settings import WEBSOCKET_TIMEOUT, FRAME_PROCESSING_INTERVAL
from services.analysis import analyze_frame_with_logging
from services.database import log_accident_detection
from models.database import SessionLocal

logger = logging.getLogger('websocket')

# Global connection tracking
websocket_connections: Dict[str, WebSocket] = {}
live_processors: Dict[str, object] = {}

# Import LiveStreamProcessor with fallback
try:
    from services.detection import LiveStreamProcessor
except ImportError:
    class LiveStreamProcessor:
        def __init__(self):
            pass
        def cleanup(self):
            pass

class WebSocketManager:
    """Manage WebSocket connections and processing"""
    
    def __init__(self):
        self.connections = websocket_connections
        self.processors = live_processors
    
    async def connect(self, websocket: WebSocket) -> str:
        """Handle new WebSocket connection"""
        await websocket.accept()
        
        client_id = f"client_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        self.connections[client_id] = websocket
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection_established",
            "client_id": client_id,
            "message": "Connected to Render-optimized live detection service",
            "timestamp": time.time(),
            "server_info": {
                "version": "2.3.0-render-optimized",
                "frame_interval": FRAME_PROCESSING_INTERVAL,
                "websocket_timeout": WEBSOCKET_TIMEOUT
            }
        })
        
        # Initialize processor
        self.processors[client_id] = LiveStreamProcessor()
        logger.info(f"WebSocket client {client_id} connected")
        
        return client_id
    
    def disconnect(self, client_id: str):
        """Handle WebSocket disconnection"""
        # Remove connection
        self.connections.pop(client_id, None)
        
        # Cleanup processor
        processor = self.processors.pop(client_id, None)
        if processor and hasattr(processor, 'cleanup'):
            try:
                processor.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up processor for {client_id}: {e}")
        
        logger.info(f"WebSocket client {client_id} disconnected")
    
    async def handle_ping(self, websocket: WebSocket, client_id: str, stats: dict):
        """Handle ping message"""
        await websocket.send_json({
            "type": "pong", 
            "timestamp": time.time(),
            "server_stats": {
                "active_connections": len(self.connections),
                **stats
            }
        })
    
    async def handle_frame(
        self, 
        websocket: WebSocket, 
        client_id: str, 
        data: dict,
        session_stats: dict
    ):
        """Handle frame processing"""
        try:
            frame_data = data["frame"]
            frame_id = data.get("frame_id", f"frame_{int(time.time() * 1000)}")
            
            # Decode frame
            try:
                frame_bytes = base64.b64decode(frame_data)
            except Exception as decode_error:
                await websocket.send_json({
                    "error": f"Frame decode failed: {str(decode_error)}",
                    "type": "error",
                    "frame_id": frame_id,
                    "client_id": client_id
                })
                return
            
            # Analyze frame
            result = await analyze_frame_with_logging(
                frame_bytes=frame_bytes,
                source=f"live_websocket_optimized_{client_id}",
                frame_id=frame_id
            )
            
            # Try to log to database (don't fail if DB is unavailable)
            db = SessionLocal()
            try:
                if result.get('accident_detected', False):
                    log_entry = log_accident_detection(
                        db=db, 
                        detection_data=result, 
                        frame=None,  # Don't save frame for live stream
                        source=f"live_websocket_{client_id}",
                        analysis_type="websocket_live"
                    )
                    if log_entry:
                        result["log_id"] = log_entry.id
            except Exception as e:
                logger.warning(f"Database logging failed: {e}")
            finally:
                try:
                    db.close()
                except:
                    pass
            
            # Add metadata
            result.update({
                "client_id": client_id,
                "received_timestamp": data.get("timestamp", time.time()),
                "analysis_timestamp": time.time(),
                "type": "detection_result",
                "optimization_level": "render-optimized",
                "session_stats": session_stats
            })
            
            # Send result
            await websocket.send_json(result)
            
        except Exception as analysis_error:
            await websocket.send_json({
                "error": f"Analysis failed: {str(analysis_error)}",
                "type": "error",
                "frame_id": data.get("frame_id", "unknown"),
                "client_id": client_id
            })

async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint handler"""
    manager = WebSocketManager()
    client_id = None
    
    try:
        client_id = await manager.connect(websocket)
        
        # Session tracking
        frames_processed = 0
        total_processing_time = 0
        connection_start_time = time.time()
        last_frame_time = 0
        
        while True:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(
                    websocket.receive_text(), 
                    timeout=WEBSOCKET_TIMEOUT
                )
                data = json.loads(message)
                
                # Handle ping
                if data.get("type") == "ping":
                    await manager.handle_ping(websocket, client_id, {
                        "frames_processed": frames_processed,
                        "avg_processing_time": total_processing_time / max(frames_processed, 1),
                        "connection_uptime": time.time() - connection_start_time
                    })
                    continue
                
                # Handle frame with rate limiting
                if "frame" in data:
                    current_time = time.time()
                    
                    # Rate limiting
                    if current_time - last_frame_time < FRAME_PROCESSING_INTERVAL:
                        continue
                    
                    last_frame_time = current_time
                    frame_start_time = current_time
                    frames_processed += 1
                    
                    # Process frame
                    await manager.handle_frame(websocket, client_id, data, {
                        "total_frames": frames_processed,
                        "avg_processing_time": total_processing_time / frames_processed,
                        "connection_uptime": time.time() - connection_start_time,
                        "rate_limited": True
                    })
                    
                    # Update stats
                    frame_processing_time = time.time() - frame_start_time
                    total_processing_time += frame_processing_time
                
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({
                    "type": "ping",
                    "timestamp": time.time(),
                    "server_stats": {
                        "render_optimized": True,
                        "active_connections": len(manager.connections)
                    }
                })
                
            except WebSocketDisconnect:
                break
                
            except Exception as e:
                try:
                    await websocket.send_json({
                        "error": f"WebSocket error: {str(e)}",
                        "type": "error",
                        "client_id": client_id
                    })
                except:
                    break
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Unexpected WebSocket error for {client_id}: {str(e)}")
    finally:
        if client_id:
            manager.disconnect(client_id)
