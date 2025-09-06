# app/routers/live.py - Fixed WebSocket handler
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse
import json
import asyncio
import logging
import base64
import uuid
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Store active connections
active_connections = {}

async def analyze_frame(frame_bytes):
    """
    Mock analyze_frame function - replace with your actual AI model
    """
    import random
    import asyncio
    
    # Simulate processing time
    await asyncio.sleep(0.05)  # 50ms processing time
    
    # Mock detection result
    accident_detected = random.choice([True, False])
    confidence = random.uniform(0.4, 0.95)
    
    return {
        "accident_detected": accident_detected,
        "confidence": confidence,
        "details": f"Mock detection result - {'Accident' if accident_detected else 'Normal traffic'}",
        "processing_time": 0.05
    }

@router.websocket("/api/live/ws")
async def websocket_live_detection(websocket: WebSocket):
    """
    WebSocket endpoint for real-time accident detection
    """
    client_id = str(uuid.uuid4())
    
    try:
        await websocket.accept()
        active_connections[client_id] = websocket
        logger.info(f"WebSocket client {client_id} connected")
        
        while True:
            try:
                # Wait for frame data from frontend
                data = await websocket.receive_text()
                logger.info(f"Received frame data from client {client_id}: {len(data)} characters")
                
                # Parse frame data
                frame_data = json.loads(data)
                
                # Decode base64 image
                frame_bytes = base64.b64decode(frame_data['frame'])
                logger.info(f"Decoded frame: {len(frame_bytes)} bytes")
                
                # Analyze frame
                start_time = time.time()
                result = await analyze_frame(frame_bytes)
                processing_time = time.time() - start_time
                
                logger.info(f"Analysis result: accident={result['accident_detected']}, confidence={result['confidence']:.2f}")
                
                # Prepare response
                response = {
                    "timestamp": frame_data.get("timestamp"),
                    "accident_detected": result["accident_detected"],
                    "confidence": result["confidence"],
                    "details": result.get("details", ""),
                    "frame_id": frame_data.get("frame_id"),
                    "processing_time": processing_time
                }
                
                # Send result back to frontend
                await websocket.send_text(json.dumps(response))
                logger.info(f"Response sent to client {client_id}")
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {str(e)}")
                error_response = {
                    "error": True,
                    "message": "Invalid JSON format"
                }
                await websocket.send_text(json.dumps(error_response))
                
            except Exception as e:
                logger.error(f"Error processing frame: {str(e)}")
                error_response = {
                    "error": True,
                    "message": f"Processing error: {str(e)}"
                }
                try:
                    await websocket.send_text(json.dumps(error_response))
                except:
                    logger.error("Failed to send error response")
                    break
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_id} disconnected normally")
        
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        
    finally:
        # Clean up connection
        if client_id in active_connections:
            del active_connections[client_id]
        logger.info(f"WebSocket client {client_id} cleaned up")

@router.post("/api/live/frame")
async def analyze_single_frame(frame_data: dict):
    """
    Analyze a single frame from live stream (HTTP alternative)
    """
    try:
        # Decode base64 frame
        frame_bytes = base64.b64decode(frame_data['frame'])
        
        # Analyze frame
        start_time = time.time()
        result = await analyze_frame(frame_bytes)
        processing_time = time.time() - start_time
        
        return {
            "timestamp": frame_data.get("timestamp"),
            "accident_detected": result["accident_detected"],
            "confidence": result["confidence"],
            "details": result.get("details", ""),
            "processing_time": processing_time
        }
        
    except Exception as e:
        logger.error(f"Error analyzing frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing frame: {str(e)}")

@router.get("/api/live/status")
async def get_live_status():
    """
    Get status of live detection service
    """
    return {
        "active_connections": len(active_connections),
        "status": "running"
    }