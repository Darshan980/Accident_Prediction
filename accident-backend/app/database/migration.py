# database/migration.py - Database Migration Handler
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)

def run_migration():
    """Add department and user_id columns to users/accident_logs tables if they don't exist"""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            try:
                from config.settings import DATABASE_URL as SETTINGS_DB_URL
                database_url = SETTINGS_DB_URL
            except ImportError:
                pass
        
        if not database_url:
            database_url = "sqlite:///./accident_detection.db"
            
        logger.info(f"Using database URL: {database_url.split('://')[0]}://...")
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Add department column to users table
            try:
                result = connection.execute(text("SELECT department FROM users LIMIT 1"))
                logger.info("Department column already exists in users table")
            except OperationalError:
                logger.info("Adding department column to users table...")
                
                if "sqlite" in database_url.lower():
                    connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR DEFAULT 'General'"))
                else:
                    connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(255) DEFAULT 'General'"))
                
                connection.execute(text("UPDATE users SET department = 'General' WHERE department IS NULL"))
                connection.commit()
                logger.info("Department column added successfully to users table")
            
            # Add user_id column to accident_logs table
            try:
                result = connection.execute(text("SELECT user_id FROM accident_logs LIMIT 1"))
                logger.info("user_id column already exists in accident_logs table")
            except OperationalError:
                logger.info("Adding user_id column to accident_logs table...")
                
                if "sqlite" in database_url.lower():
                    connection.execute(text("ALTER TABLE accident_logs ADD COLUMN user_id INTEGER"))
                    connection.execute(text("ALTER TABLE accident_logs ADD COLUMN created_by VARCHAR"))
                else:
                    connection.execute(text("ALTER TABLE accident_logs ADD COLUMN user_id INTEGER"))
                    connection.execute(text("ALTER TABLE accident_logs ADD COLUMN created_by VARCHAR(255)"))
                
                connection.commit()
                logger.info("user_id and created_by columns added successfully to accident_logs table")
                
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
