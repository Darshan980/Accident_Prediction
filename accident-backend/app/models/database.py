# models/database.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func
from config.settings import SQLALCHEMY_DATABASE_URL

# Database setup
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False, "timeout": 20},
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    department = Column(String, nullable=True)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    permissions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, nullable=True)

class AccidentLog(Base):
    __tablename__ = "accident_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    video_source = Column(String, default="unknown")
    confidence = Column(Float)
    accident_detected = Column(Boolean)
    predicted_class = Column(String)
    processing_time = Column(Float)
    snapshot_filename = Column(String, nullable=True)
    snapshot_url = Column(String, nullable=True)
    frame_id = Column(String, nullable=True)
    analysis_type = Column(String, default="unknown")
    status = Column(String, default="unresolved")
    notes = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    weather_conditions = Column(String, nullable=True)
    severity_estimate = Column(String, nullable=True)
    user_feedback = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
