from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models.user import User
from models.message import Message
from models.group import GroupMember, GroupDeniedMember
from utils.auth import get_current_user_dependency as get_current_user
from utils.image import process_image_upload

router = APIRouter()

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: Optional[int]
    group_id: Optional[int]
    text: Optional[str]
    attachment: Optional[dict]
    timestamp: datetime

    class Config:
        from_attributes = True

class SendMessageRequest(BaseModel):
    text: Optional[str] = None
    recipient_id: Optional[int] = None
    group_id: Optional[int] = None

@router.get("", response_model=List[MessageResponse])
async def get_messages(
    chat_type: str,  # 'personal' or 'group'
    target_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages for a chat"""
    if chat_type == "personal":
        # Personal chat: get messages between current_user and target_id
        messages = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.recipient_id == target_id),
                and_(Message.sender_id == target_id, Message.recipient_id == current_user.id)
            ),
            Message.group_id.is_(None)
        ).order_by(Message.timestamp.desc()).limit(limit).offset(offset).all()
        
    elif chat_type == "group":
        # Group chat: verify user is a member
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == target_id,
            GroupMember.user_id == current_user.id
        ).first()
        
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this group"
            )
        
        messages = db.query(Message).filter(
            Message.group_id == target_id
        ).order_by(Message.timestamp.desc()).limit(limit).offset(offset).all()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid chat_type. Must be 'personal' or 'group'"
        )
    
    # Convert to response format
    result = []
    for msg in reversed(messages):  # Reverse to get chronological order
        attachment = None
        if msg.attachment_url:
            attachment = {
                "url": msg.attachment_url,
                "name": msg.attachment_name or "",
                "mimeType": msg.attachment_type or "",
                "size": 0,  # Size not stored in DB
                "isImage": msg.attachment_type and msg.attachment_type.startswith("image/")
            }
        
        result.append(MessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            group_id=msg.group_id,
            text=msg.text,
            attachment=attachment,
            timestamp=msg.timestamp
        ))
    
    return result

@router.post("", response_model=MessageResponse)
async def send_message(
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a text message"""
    if not request.text and not request.recipient_id and not request.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either recipient_id or group_id must be provided"
        )
    
    if request.recipient_id and request.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot specify both recipient_id and group_id"
        )
    
    # Validate recipient or group
    if request.recipient_id:
        recipient = db.query(User).filter(User.id == request.recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found"
            )
    
    if request.group_id:
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == request.group_id,
            GroupMember.user_id == current_user.id
        ).first()
        
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this group"
            )
    
    # Create message
    new_message = Message(
        sender_id=current_user.id,
        recipient_id=request.recipient_id,
        group_id=request.group_id,
        text=request.text
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return MessageResponse(
        id=new_message.id,
        sender_id=new_message.sender_id,
        recipient_id=new_message.recipient_id,
        group_id=new_message.group_id,
        text=new_message.text,
        attachment=None,
        timestamp=new_message.timestamp
    )

@router.post("/upload", response_model=MessageResponse)
async def upload_message(
    file: UploadFile = File(...),
    recipient_id: Optional[int] = None,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload attachment (image/file) as message
    
    Note: recipient_id and group_id should be sent as form data fields
    """
    if not recipient_id and not group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either recipient_id or group_id must be provided"
        )
    
    if recipient_id and group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot specify both recipient_id and group_id"
        )
    
    # Validate recipient or group
    if recipient_id:
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found"
            )
    
    if group_id:
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()
        
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this group"
            )
    
    # Process upload
    attachment_info = await process_image_upload(file)
    
    # Create message
    new_message = Message(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        group_id=group_id,
        attachment_url=attachment_info["url"],
        attachment_name=attachment_info["name"],
        attachment_type=attachment_info["mimeType"]
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return MessageResponse(
        id=new_message.id,
        sender_id=new_message.sender_id,
        recipient_id=new_message.recipient_id,
        group_id=new_message.group_id,
        text=None,
        attachment=attachment_info,
        timestamp=new_message.timestamp
    )
