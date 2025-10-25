"""
SQLModel database configuration and session utilities.
"""

from __future__ import annotations

import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

# Load .env file if it exists
load_dotenv()

# Database URL from environment or default
DB_NAME = os.getenv(
    "POSTGRES_DB",
    "sqlmodel_db",
)


DB_USER = os.getenv(
    "POSTGRES_USER",
    "postgres",
)

DB_PASSWORD = os.getenv(
    "POSTGRES_PASSWORD",
    "postgres",
)

DB_HOST = os.getenv(
    "DB_HOST",
    "localhost",
)

DB_PORT = os.getenv(
    "DB_PORT",
    "5432",
)

# Create engine
engine = create_engine(f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}", echo=True)


def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI to get database sessions."""

    with Session(engine) as session:
        yield session


def init_db() -> None:
    """
    Initialize database tables.

    WARNING: Only use this for development/testing.
    For production, use proper migrations (Alembic).
    """
    SQLModel.metadata.create_all(bind=engine)


def check_db_connection() -> bool:
    """Check if database connection is healthy."""

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print(f"❌ Database connection failed: {exc}")
        return False
