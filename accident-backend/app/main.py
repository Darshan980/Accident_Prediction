# main.py - Enhanced Main Application Entry Point with Model Debugging
import os
import sys
import signal
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

# Import configuration
from config.settings import SNAPSHOTS_DIR, PORT, HOST, get_cors_origins

# Import database setup
from models.database import create_tables, SessionLocal
from auth.handlers import create_default_super_admin

# Import services
from services.analysis import warmup_model, cleanup_thread_pool

# Import middleware
from middleware.cors import CustomCORSMiddleware

# Import routers
from routes.health import router as health_router
from routes.dashboard import router as dashboard_router
from routes.debug import router as debug_router
from auth.routes import router as auth_router
from api.core import router as core_router
from api.upload import router as upload_router
from api.logs import router as logs_router
from api.websocket import websocket_endpoint

# Import error handlers
from handlers.exceptions import setup_exception_handlers

# Setup logging
from utils.logging import setup_logging

# Initialize logging
logger_dict = setup_logging()
logger = logging.getLogger(__name__)

# Import lifespan and signal handlers
from handlers.lifecycle import lifespan, signal_handler

# Create FastAPI app
app = FastAPI(
    title="Accident Detection API - Enhanced with Model Debug",
    description="AI-powered accident detection system with comprehensive model debugging for production deployment",
    version="2.5.2",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add custom CORS middleware FIRST
app.add_middleware(CustomCORSMiddleware)

# Log CORS configuration
cors_origins = get_cors_origins()
logger.info(f"CORS origins configured: {cors_origins}")
logger.info("Using custom CORS middleware for dynamic origin handling")

# Add trusted host middleware for production
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=[
            "accident-prediction-1-mpm0.onrender.com",
            "*.vercel.app",
            "*.onrender.com",
            "localhost"
        ]
    )

# Mount static files for snapshots
try:
    app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")
    logger.info("Snapshots static files mounted")
except Exception as e:
    logger.warning(f"Could not mount snapshots directory: {str(e)}")

# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(debug_router, prefix="/debug", tags=["debug"])
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(core_router, prefix="/api", tags=["core"])
app.include_router(upload_router, prefix="/api", tags=["upload"])
app.include_router(logs_router, prefix="/api", tags=["logs"])

# WebSocket endpoints
app.websocket("/api/live/ws")(websocket_endpoint)

# Setup error handlers
setup_exception_handlers(app)

# Enhanced Model Debug Endpoints
@app.get("/model-debug")
async def model_debug_info():
    """Get comprehensive model debug information"""
    try:
        from services.detection import get_model_debug_info
        debug_info = get_model_debug_info()
        
        # Add deployment-specific info
        debug_info.update({
            "deployment_info": {
                "environment": os.getenv("ENVIRONMENT", "development"),
                "platform": "render" if "render" in os.getenv("RENDER", "").lower() else "local",
                "python_executable": sys.executable,
                "working_directory": os.getcwd(),
                "python_path": sys.path[:3]  # First 3 entries
            }
        })
        
        return JSONResponse(content=debug_info)
        
    except Exception as e:
        logger.error(f"Error getting model debug info: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "message": "Failed to get model debug information"
            }
        )

@app.get("/model-test")
async def test_model_prediction():
    """Test the model with a dummy prediction"""
    try:
        from services.detection import test_model_prediction
        result = test_model_prediction()
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error testing model: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "test_successful": False,
                "message": "Model test failed"
            }
        )

@app.get("/available-models")
async def list_available_models():
    """List all available model files found on the system"""
    try:
        from services.detection import list_available_models
        result = list_available_models()
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "message": "Failed to list available models"
            }
        )

@app.post("/reload-model")
async def force_reload_model(model_path: str = None):
    """Force reload the model with optional custom path"""
    try:
        from services.detection import force_model_reload
        result = force_model_reload(model_path)
        
        status_code = 200 if result.get("success") else 400
        return JSONResponse(status_code=status_code, content=result)
        
    except Exception as e:
        logger.error(f"Error reloading model: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "message": "Model reload failed"
            }
        )

@app.get("/system-info")
async def system_info():
    """Get comprehensive system information for debugging"""
    try:
        import platform
        import psutil
        
        # Get memory info
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get environment variables (filtered for security)
        env_vars = {}
        safe_env_keys = [
            "ENVIRONMENT", "PORT", "HOST", "PYTHON_VERSION",
            "RENDER", "RENDER_SERVICE_NAME", "RENDER_INSTANCE_ID"
        ]
        for key in safe_env_keys:
            if key in os.environ:
                env_vars[key] = os.environ[key]
        
        system_info = {
            "platform": {
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor(),
                "python_version": platform.python_version(),
                "python_implementation": platform.python_implementation()
            },
            "resources": {
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "memory_percent": memory.percent,
                "disk_total_gb": round(disk.total / (1024**3), 2),
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "disk_percent": round((disk.used / disk.total) * 100, 1)
            },
            "environment": env_vars,
            "paths": {
                "working_directory": os.getcwd(),
                "python_executable": sys.executable,
                "main_file": __file__
            }
        }
        
        return JSONResponse(content=system_info)
        
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "message": "Failed to get system information"
            }
        )

@app.get("/deployment-status")
async def deployment_status():
    """Get deployment-specific status and health check"""
    try:
        # Import here to avoid circular imports
        from services.analysis import model_health_check, get_model_info
        
        # Get model health
        model_health = model_health_check()
        model_info = get_model_info()
        
        # Check if running on Render
        is_render = "render" in os.getenv("RENDER", "").lower()
        
        # Database check
        try:
            db = SessionLocal()
            db.execute("SELECT 1")
            db.close()
            db_status = "healthy"
            db_error = None
        except Exception as e:
            db_status = "unhealthy"
            db_error = str(e)
        
        status = {
            "deployment": {
                "platform": "render" if is_render else "unknown",
                "environment": os.getenv("ENVIRONMENT", "development"),
                "service_name": os.getenv("RENDER_SERVICE_NAME", "local"),
                "instance_id": os.getenv("RENDER_INSTANCE_ID", "local")
            },
            "health": {
                "overall": "healthy" if model_health.get("status") == "healthy" and db_status == "healthy" else "degraded",
                "model": model_health,
                "database": {
                    "status": db_status,
                    "error": db_error
                }
            },
            "model_summary": {
                "available": model_info.get("model_available", False),
                "loaded": model_info.get("model_loaded", False),
                "type": model_info.get("model_type", "unknown"),
                "path": model_info.get("model_path", "unknown")
            }
        }
        
        return JSONResponse(content=status)
        
    except Exception as e:
        logger.error(f"Error getting deployment status: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "message": "Failed to get deployment status"
            }
        )

# Enhanced root endpoint with debug links
@app.get("/")
async def root():
    """Enhanced root endpoint with debug information"""
    base_response = {
        "message": "Accident Detection API - Enhanced with Model Debug",
        "version": "2.5.2",
        "status": "operational",
        "dashboard_status": "user_specific_enabled",
        "cors": "custom_middleware_enabled",
        "authentication": "fixed",
        "deployment": {
            "platform": "render" if "render" in os.getenv("RENDER", "").lower() else "local",
            "environment": os.getenv("ENVIRONMENT", "development")
        },
        "docs": "/docs",
        "health": "/health"
    }
    
    # Add debug endpoints
    base_response["debug_endpoints"] = {
        "model_debug": "/model-debug",
        "model_test": "/model-test", 
        "available_models": "/available-models",
        "reload_model": "/reload-model",
        "system_info": "/system-info",
        "deployment_status": "/deployment-status",
        "auth_status": "/debug/auth-status"
    }
    
    # Add existing endpoints
    base_response["dashboard_endpoints"] = {
        "user_alerts": "/api/dashboard/user/alerts",
        "user_stats": "/api/dashboard/user/stats",
        "user_profile": "/api/dashboard/user/profile",
        "websocket": "/api/dashboard/ws/alerts",
        "health": "/api/dashboard/health"
    }
    
    base_response["api_endpoints"] = {
        "logs": "/api/logs",
        "logs_stats": "/api/logs/stats",
        "upload": "/api/upload",
        "analyze_url": "/api/analyze-url",
        "core": "/api/*"
    }
    
    base_response["system_endpoints"] = {
        "health": "/health",
        "model_info": "/model-info",
        "admin_health": "/admin/api/health",
        "api_health": "/api/health"
    }
    
    base_response["features"] = [
        "enhanced_model_debugging",
        "production_diagnostics",
        "fixed_authentication",
        "admin_and_user_support",
        "user_specific_filtering",
        "personal_analytics", 
        "real_time_user_alerts",
        "department_based_access",
        "logs_management",
        "file_upload_analysis",
        "health_monitoring",
        "model_status_tracking"
    ]
    
    return JSONResponse(content=base_response)

# Enhanced model info endpoint
@app.get("/model-info")
async def enhanced_model_info():
    """Enhanced model information endpoint"""
    try:
        from services.analysis import get_model_info
        from services.detection import accident_model
        
        model_info = get_model_info()
        
        # Add additional debug info if available
        if hasattr(accident_model, 'get_model_info'):
            detailed_info = accident_model.get_model_info()
            model_info.update(detailed_info)
        
        # Add timestamp
        from datetime import datetime
        model_info["timestamp"] = datetime.now().isoformat()
        
        return JSONResponse(content=model_info)
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "model_available": False,
                "message": "Failed to get model information"
            }
        )

# Signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Development server
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 ACCIDENT DETECTION API v2.5.2 - ENHANCED MODEL DEBUG")
    print("=" * 80)
    print(f"📍 Server URL: http://{HOST}:{PORT}")
    print(f"📍 API Docs: http://{HOST}:{PORT}/docs")
    print("🔧 Enhanced Debug Endpoints:")
    print("   - /model-debug (comprehensive model debug info)")
    print("   - /model-test (test model prediction)")
    print("   - /available-models (list all found models)")
    print("   - /reload-model (force reload model)")
    print("   - /system-info (system diagnostics)")
    print("   - /deployment-status (deployment health)")
    print(f"🔧 Debug Auth: http://{HOST}:{PORT}/debug/auth-status")
    print("🔧 Authentication: FIXED for admin/user tokens")
    print("📋 Main Dashboard Endpoints:")
    print("   - /api/dashboard/user/alerts (user-specific)")
    print("   - /api/dashboard/user/stats (user-specific)")
    print("   - /api/dashboard/user/profile")
    print("   - /api/dashboard/ws/alerts (user WebSocket)")
    print("   - /api/dashboard/health")
    print("📊 API Endpoints:")
    print("   - /api/upload (FIXED - works for admin & user)")
    print("   - /api/analyze-url (FIXED - works for admin & user)")
    print("   - /api/logs (logs management)")
    print("   - /api/core (core API functions)")
    print("🔧 System Endpoints:")
    print("   - /health (MAIN HEALTH CHECK)")
    print("   - /model-info (ENHANCED MODEL STATUS)")
    print("   - /admin/api/health (ADMIN HEALTH)")
    print("   - /api/health (API HEALTH)")
    print("🔒 Authentication: FIXED - supports both admin and user tokens")
    print("📊 Features: Enhanced debugging, model diagnostics, production monitoring")
    print("=" * 80)
    
    # Try to get initial model status
    try:
        from services.detection import accident_model
        if hasattr(accident_model, 'get_model_info'):
            model_info = accident_model.get_model_info()
            print(f"🤖 Model Status: {model_info.get('detection_method', 'unknown')}")
            print(f"🤖 Model Loaded: {model_info.get('is_loaded', False)}")
        else:
            print("🤖 Model Status: Basic model loaded")
    except Exception as e:
        print(f"🤖 Model Status: Error - {str(e)}")
    
    print("=" * 80)
    
    uvicorn.run(
        app, 
        host=HOST, 
        port=PORT,
        log_level="info",
        access_log=True
    )
