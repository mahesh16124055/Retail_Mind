"""
Database configuration and session management.

Provides SQLAlchemy engine, session factory, and database utilities
with connection pooling, health checks, and migration support.
"""

import logging
from typing import Generator, Optional
from contextlib import contextmanager

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Database engine configuration
engine_kwargs = {
    "pool_pre_ping": True,  # Validate connections before use
    "pool_recycle": 300,    # Recycle connections every 5 minutes
    "pool_size": 10,        # Connection pool size
    "max_overflow": 20,     # Maximum overflow connections
    "echo": settings.DEBUG, # Log SQL queries in debug mode
}

# Handle SQLite for development/testing
if settings.database_url.startswith("sqlite"):
    engine_kwargs = {
        "poolclass": StaticPool,
        "connect_args": {"check_same_thread": False},
        "echo": settings.DEBUG, # Log SQL queries in debug mode
    }
else:
    # PostgreSQL configuration
    engine_kwargs.update({
        "pool_size": 10,        # Connection pool size
        "max_overflow": 20,     # Maximum overflow connections
    })

# Create database engine
engine = create_engine(settings.database_url, **engine_kwargs)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite pragmas for better performance and reliability."""
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=1000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session.
    
    Yields:
        Session: SQLAlchemy database session
        
    Example:
        @app.get("/items/")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions.
    
    Example:
        with get_db_context() as db:
            items = db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def init_db():
    """Initialize database asynchronously."""
    create_tables()


def create_tables():
    """Create all database tables."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except SQLAlchemyError as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


def drop_tables():
    """Drop all database tables. Use with caution!"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except SQLAlchemyError as e:
        logger.error(f"Failed to drop database tables: {e}")
        raise


def check_database_health() -> bool:
    """
    Check database connectivity and health.
    
    Returns:
        bool: True if database is healthy, False otherwise
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError as e:
        logger.error(f"Database health check failed: {e}")
        return False


def get_database_info() -> dict:
    """
    Get database information and statistics.
    
    Returns:
        dict: Database information including version, size, etc.
    """
    info = {
        "url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url,
        "engine": str(engine.url.drivername),
        "pool_size": engine.pool.size(),
        "checked_out": engine.pool.checkedout(),
        "overflow": engine.pool.overflow(),
        "checked_in": engine.pool.checkedin(),
    }
    
    try:
        with engine.connect() as connection:
            if settings.database_url.startswith("postgresql"):
                result = connection.execute(text("SELECT version()"))
                info["version"] = result.scalar()
                
                result = connection.execute(text(
                    "SELECT pg_size_pretty(pg_database_size(current_database()))"
                ))
                info["size"] = result.scalar()
                
            elif settings.database_url.startswith("sqlite"):
                result = connection.execute(text("SELECT sqlite_version()"))
                info["version"] = f"SQLite {result.scalar()}"
                
    except SQLAlchemyError as e:
        logger.warning(f"Could not retrieve database info: {e}")
        info["error"] = str(e)
    
    return info


class DatabaseManager:
    """Database management utilities."""
    
    @staticmethod
    def initialize():
        """Initialize database with tables and initial data."""
        try:
            create_tables()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    @staticmethod
    def reset():
        """Reset database by dropping and recreating all tables."""
        try:
            drop_tables()
            create_tables()
            logger.info("Database reset successfully")
        except Exception as e:
            logger.error(f"Database reset failed: {e}")
            raise
    
    @staticmethod
    def health_check() -> dict:
        """Comprehensive database health check."""
        return {
            "healthy": check_database_health(),
            "info": get_database_info(),
            "settings": {
                "pool_size": engine.pool.size(),
                "max_overflow": engine.pool._max_overflow,
                "pool_recycle": engine.pool._recycle,
            }
        }