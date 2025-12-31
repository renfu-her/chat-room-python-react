from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models.user import User
from utils.auth import get_current_user_dependency as get_current_user
from utils.image import process_image_upload

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str]
    status: str

    class Config:
        from_attributes = True

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

@router.get("", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users (for Strangers list)"""
    users = db.query(User).filter(User.id != current_user.id).all()
    return [UserResponse.model_validate(user) for user in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse.model_validate(user)

@router.put("/me", response_model=UserResponse)
async def update_me(
    request: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    if request.name is not None:
        current_user.name = request.name
    if request.email is not None:
        # Check if email is already taken
        existing_user = db.query(User).filter(
            User.email == request.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = request.email
    
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)

@router.post("/me/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar (UUID, webp)"""
    attachment_info = await process_image_upload(file)
    
    # Update user avatar
    current_user.avatar = attachment_info["url"]
    db.commit()
    
    return {
        "avatar": attachment_info["url"],
        "attachment": attachment_info
    }
