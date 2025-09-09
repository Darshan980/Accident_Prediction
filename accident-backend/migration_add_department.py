# migration_add_department.py
"""
Migration script to add department column to users table
Run this script once to update your existing database
"""

import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

# Try to import database URL from your config, fallback to environment variable
try:
    from models.database import DATABASE_URL
except ImportError:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./accident_detection.db")

def add_department_column():
    """Add department column to users table if it doesn't exist"""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            # Check if department column exists
            try:
                result = connection.execute(text("SELECT department FROM users LIMIT 1"))
                print("Department column already exists")
                return
            except OperationalError:
                # Column doesn't exist, add it
                print("Adding department column to users table...")
                
                if "sqlite" in DATABASE_URL.lower():
                    # SQLite syntax
                    connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR DEFAULT 'General'"))
                else:
                    # PostgreSQL/MySQL syntax
                    connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(255) DEFAULT 'General'"))
                
                # Update existing users to have a default department
                connection.execute(text("UPDATE users SET department = 'General' WHERE department IS NULL"))
                connection.commit()
                
                print("Department column added successfully")
                
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    add_department_column()
