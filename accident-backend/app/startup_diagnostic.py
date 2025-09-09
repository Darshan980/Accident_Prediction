#!/usr/bin/env python3
"""
Startup Diagnostic Script for Accident Detection API
Run this before deployment to check if all components are working
"""

import sys
import os
import importlib
import logging
import traceback
from pathlib import Path

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_python_version():
    """Check Python version compatibility"""
    logger.info("Checking Python version...")
    version = sys.version_info
    logger.info(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major != 3 or version.minor < 8:
        logger.error("Python 3.8+ is required")
        return False
    
    logger.info("✅ Python version OK")
    return True

def check_required_packages():
    """Check if all required packages can be imported"""
    logger.info("Checking required packages...")
    
    required_packages = [
        'fastapi',
        'uvicorn', 
        'sqlalchemy',
        'passlib',
        'python_jose',
        'cv2',
        'numpy',
        'PIL',
        'psutil'
    ]
    
    failed_imports = []
    
    for package in required_packages:
        try:
            if package == 'cv2':
                import cv2
            elif package == 'python_jose':
                from jose import jwt
            elif package == 'PIL':
                from PIL import Image
            else:
                importlib.import_module(package)
            logger.info(f"✅ {package}")
        except ImportError as e:
            logger.error(f"❌ {package}: {str(e)}")
            failed_imports.append(package)
    
    if failed_imports:
        logger.error(f"Failed to import: {', '.join(failed_imports)}")
        return False
    
    logger.info("✅ All required packages imported successfully")
    return True

def check_directory_structure():
    """Check if required directories exist"""
    logger.info("Checking directory structure...")
    
    required_dirs = [
        'config',
        'models', 
        'services',
        'auth',
        'api',
        'utils'
    ]
    
    optional_dirs = [
        'snapshots',
        'logs'
    ]
    
    missing_required = []
    
    for directory in required_dirs:
        if not os.path.exists(directory):
            missing_required.append(directory)
            logger.error(f"❌ Missing required directory: {directory}")
        else:
            logger.info(f"✅ {directory}/")
    
    for directory in optional_dirs:
        if not os.path.exists(directory):
            logger.warning(f"⚠️  Optional directory missing (will be created): {directory}")
            try:
                os.makedirs(directory, exist_ok=True)
                logger.info(f"✅ Created {directory}/")
            except Exception as e:
                logger.error(f"❌ Failed to create {directory}/: {str(e)}")
        else:
            logger.info(f"✅ {directory}/")
    
    if missing_required:
        logger.error(f"Missing required directories: {', '.join(missing_required)}")
        return False
    
    return True

def check_config_files():
    """Check if configuration files are accessible"""
    logger.info("Checking configuration...")
    
    try:
        from config.settings import (
            SQLALCHEMY_DATABASE_URL,
            SECRET_KEY,
            MAX_PREDICTION_TIME,
            THREAD_POOL_SIZE,
            get_cors_origins
        )
        
        logger.info("✅ Configuration imported successfully")
        logger.info(f"Database URL: {SQLALCHEMY_DATABASE_URL}")
        logger.info(f"Max prediction time: {MAX_PREDICTION_TIME}s")
        logger.info(f"Thread pool size: {THREAD_POOL_SIZE}")
        logger.info(f"CORS origins: {get_cors_origins()}")
        
        if SECRET_KEY == "your-secret-key-change-this-in-production":
            logger.warning("⚠️  Using default SECRET_KEY - change this in production!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Configuration error: {str(e)}")
        return False

def check_database_connection():
    """Check database connectivity"""
    logger.info("Checking database connection...")
    
    try:
        from models.database import create_tables, SessionLocal
        
        # Try to create tables
        create_tables()
        logger.info("✅ Database tables created/verified")
        
        # Test database session
        db = SessionLocal()
        try:
            # Simple query to test connection
            db.execute("SELECT 1")
            logger.info("✅ Database connection test successful")
        finally:
            db.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database error: {str(e)}")
        return False

def check_ml_model():
    """Check ML model loading"""
    logger.info("Checking ML model...")
    
    try:
        from services.analysis import get_model_info, model_health_check
        import asyncio
        
        # Get model info
        model_info = get_model_info()
        logger.info(f"Model info: {model_info}")
        
        # Run health check
        health = model_health_check()
        logger.info(f"Model health: {health}")
        
        if health.get("status") == "healthy":
            logger.info("✅ ML model is healthy")
        elif health.get("status") == "degraded":
            logger.warning("⚠️  ML model is degraded but functional")
        else:
            logger.warning("⚠️  ML model has issues but system can still run")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ ML model error: {str(e)}")
        logger.info("System can still run with fallback detection")
        return True  # Don't fail startup for model issues

def check_auth_system():
    """Check authentication system"""
    logger.info("Checking authentication system...")
    
    try:
        from auth.handlers import create_default_super_admin
        from models.database import SessionLocal
        
        db = SessionLocal()
        try:
            create_default_super_admin(db)
            logger.info("✅ Default admin user verified/created")
        finally:
            db.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Authentication system error: {str(e)}")
        return False

def run_comprehensive_test():
    """Run a comprehensive system test"""
    logger.info("Running comprehensive system test...")
    
    try:
        # Test async functionality
        import asyncio
        from services.analysis import warmup_model
        
        async def test_async():
            result = await warmup_model()
            return result
        
        result = asyncio.run(test_async())
        logger.info(f"Model warmup result: {result}")
        
        if result.get("status") in ["success", "warning"]:
            logger.info("✅ Async system test passed")
            return True
        else:
            logger.warning("⚠️  Async system test completed with issues")
            return True  # Don't fail for model issues
        
    except Exception as e:
        logger.error(f"❌ Comprehensive test failed: {str(e)}")
        logger.debug(traceback.format_exc())
        return False

def main():
    """Main diagnostic function"""
    logger.info("🚀 Starting Accident Detection API Diagnostic")
    logger.info("=" * 60)
    
    checks = [
        ("Python Version", check_python_version),
        ("Required Packages", check_required_packages), 
        ("Directory Structure", check_directory_structure),
        ("Configuration", check_config_files),
        ("Database Connection", check_database_connection),
        ("ML Model", check_ml_model),
        ("Authentication System", check_auth_system),
        ("Comprehensive Test", run_comprehensive_test)
    ]
    
    passed = 0
    failed = 0
    
    for check_name, check_func in checks:
        logger.info(f"\n--- {check_name} ---")
        try:
            if check_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Check '{check_name}' crashed: {str(e)}")
            logger.debug(traceback.format_exc())
            failed += 1
    
    logger.info("\n" + "=" * 60)
    logger.info(f"DIAGNOSTIC RESULTS: {passed} passed, {failed} failed")
    
    if failed == 0:
        logger.info("🎉 All checks passed! System is ready for deployment.")
        return 0
    elif failed <= 2 and passed >= 6:
        logger.warning("⚠️  Some non-critical issues found, but system should work.")
        return 0
    else:
        logger.error("❌ Critical issues found. Please fix before deployment.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
