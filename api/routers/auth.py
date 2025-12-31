from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from database import get_db
from models.user import User
from utils.auth import (
    hash_password, verify_password, create_session,
    get_current_user_dependency, delete_session
)

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str]
    status: str

    class Config:
        from_attributes = True

@router.post("/register", response_model=dict)
async def register(
    request: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    password_hash = hash_password(request.password)
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=password_hash,
        avatar=f"https://picsum.photos/seed/{request.name}/200"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Update user status to online
    new_user.status = "online"
    db.commit()
    
    # Create session
    session_id = create_session(new_user.id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="lax")
    
    # Broadcast user online status via WebSocket (if connected)
    try:
        from websocket.chat import broadcast_user_status, broadcast_to_all
        await broadcast_user_status(new_user.id, "online", broadcast_to_all_users=True)
        
        # Send login notification to all users
        login_notification = {
            "type": "user_login",
            "user_id": new_user.id,
            "user_name": new_user.name,
            "message": f"{new_user.name} 已登入",
            "timestamp": datetime.utcnow().isoformat()
        }
        await broadcast_to_all(login_notification, exclude_user_id=new_user.id)
    except:
        pass  # WebSocket might not be available
    
    return {
        "user": UserResponse.model_validate(new_user),
        "session_id": session_id
    }

@router.post("/login", response_model=dict)
async def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login user"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update user status to online
    user.status = "online"
    db.commit()
    
    # Create session
    session_id = create_session(user.id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="lax")
    
    # Broadcast user online status via WebSocket (if connected)
    try:
        from websocket.chat import broadcast_user_status, broadcast_to_all
        await broadcast_user_status(user.id, "online", broadcast_to_all_users=True)
        
        # Send login notification to all users
        login_notification = {
            "type": "user_login",
            "user_id": user.id,
            "user_name": user.name,
            "message": f"{user.name} 已登入",
            "timestamp": datetime.utcnow().isoformat()
        }
        await broadcast_to_all(login_notification, exclude_user_id=user.id)
    except:
        pass  # WebSocket might not be available
    
    return {
        "user": UserResponse.model_validate(user),
        "session_id": session_id
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Logout user"""
    # Update user status to offline
    current_user.status = "offline"
    db.commit()
    
    # Broadcast user offline status to all friends via WebSocket
    try:
        from websocket.chat import broadcast_user_status, active_connections, broadcast_to_all
        user_id = current_user.id
        
        # Close WebSocket connection if exists
        if user_id in active_connections:
            try:
                ws = active_connections[user_id]
                await ws.close()
            except:
                pass
            del active_connections[user_id]
        
        # Broadcast status change
        await broadcast_user_status(user_id, "offline", broadcast_to_all_users=True)
        
        # Send logout notification to all users
        logout_notification = {
            "type": "user_logout",
            "user_id": user_id,
            "user_name": current_user.name,
            "message": f"{current_user.name} 已登出",
            "timestamp": datetime.utcnow().isoformat()
        }
        await broadcast_to_all(logout_notification)
    except Exception as e:
        print(f"Error in logout WebSocket broadcast: {e}")
        pass  # WebSocket might not be available
    
    # Delete session
    session_id = request.cookies.get("session_id")
    if session_id:
        delete_session(session_id)
    response.delete_cookie(key="session_id")
    
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user_dependency)):
    """Get current user information"""
    return UserResponse.model_validate(user)
