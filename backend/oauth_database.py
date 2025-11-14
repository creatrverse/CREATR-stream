from sqlmodel import SQLModel, Field, create_engine, Session
from typing import Optional
from datetime import datetime
import os

class TokenData(SQLModel, table=True):
    """Store OAuth tokens for authenticated users"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str
    username: str
    access_token: str
    refresh_token: str
    expires_at: datetime
    scopes: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./oauth_tokens.db')
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

def create_db_and_tables():
    """Initialize database tables"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session
