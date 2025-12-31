from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import List

from database import get_db
from models.user import User
from models.friendship import Friendship, FriendshipStatus
from utils.auth import get_current_user_dependency as get_current_user

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar: str
    status: str

    class Config:
        from_attributes = True

@router.get("", response_model=List[UserResponse])
async def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get friends list"""
    # Get all accepted friendships where current user is involved
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        ),
        Friendship.status == FriendshipStatus.accepted
    ).all()
    
    # Collect friend IDs
    friend_ids = set()
    for friendship in friendships:
        if friendship.user_id == current_user.id:
            friend_ids.add(friendship.friend_id)
        else:
            friend_ids.add(friendship.user_id)
    
    # Get friend users
    friends = db.query(User).filter(User.id.in_(friend_ids)).all()
    return [UserResponse.model_validate(friend) for friend in friends]

@router.post("/{user_id}", response_model=dict)
async def add_friend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add friend (convert Stranger to Friend)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as friend"
        )
    
    # Check if user exists
    friend_user = db.query(User).filter(User.id == user_id).first()
    if not friend_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if friendship already exists
    existing = db.query(Friendship).filter(
        or_(
            (Friendship.user_id == current_user.id) & (Friendship.friend_id == user_id),
            (Friendship.user_id == user_id) & (Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status == FriendshipStatus.accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends"
            )
        else:
            # Update to accepted
            existing.status = FriendshipStatus.accepted
            db.commit()
            return {"message": "Friend added successfully"}
    
    # Create bidirectional friendship
    friendship1 = Friendship(
        user_id=current_user.id,
        friend_id=user_id,
        status=FriendshipStatus.accepted
    )
    friendship2 = Friendship(
        user_id=user_id,
        friend_id=current_user.id,
        status=FriendshipStatus.accepted
    )
    db.add(friendship1)
    db.add(friendship2)
    db.commit()
    
    # Broadcast friend change via WebSocket
    try:
        from websocket.chat import broadcast_friend_change
        await broadcast_friend_change(current_user.id, user_id, "added")
    except:
        pass  # WebSocket might not be available
    
    return {"message": "Friend added successfully"}

@router.delete("/{user_id}", response_model=dict)
async def remove_friend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove friend"""
    # Delete both directions of friendship
    db.query(Friendship).filter(
        or_(
            (Friendship.user_id == current_user.id) & (Friendship.friend_id == user_id),
            (Friendship.user_id == user_id) & (Friendship.friend_id == current_user.id)
        )
    ).delete()
    db.commit()
    
    # Broadcast friend change via WebSocket
    try:
        from websocket.chat import broadcast_friend_change
        await broadcast_friend_change(current_user.id, user_id, "removed")
    except:
        pass  # WebSocket might not be available
    
    return {"message": "Friend removed successfully"}
