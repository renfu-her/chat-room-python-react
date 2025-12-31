from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from models.user import User
import bcrypt
from database import get_db

# In-memory session store (in production, use Redis)
sessions = {}  # {session_id: user_id}

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_session(user_id: int) -> str:
    """Create a new session and return session_id"""
    import secrets
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = user_id
    return session_id

def get_session_user_id(request: Request) -> int:
    """Get user_id from session"""
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return sessions[session_id]

def get_current_user(request: Request, db: Session) -> User:
    """Get current authenticated user - direct call"""
    user_id = get_session_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def get_current_user_dependency(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user - FastAPI dependency"""
    user_id = get_session_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def delete_session(session_id: str):
    """Delete session"""
    if session_id and session_id in sessions:
        del sessions[session_id]
