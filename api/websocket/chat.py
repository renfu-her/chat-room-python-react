from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Dict, Set
import json
from datetime import datetime

from database import get_db, SessionLocal
from models.user import User
from models.message import Message
from models.group import GroupMember
from utils.auth import get_session_user_id, sessions

router = APIRouter()

# WebSocket connection pool: {user_id: websocket}
active_connections: Dict[int, WebSocket] = {}

async def get_user_from_session(websocket: WebSocket) -> User:
    """Get user from session cookie"""
    session_id = websocket.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user_id = sessions[session_id]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return user
    finally:
        db.close()

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    
    try:
        # Get user from session
        user = await get_user_from_session(websocket)
        
        # Update user status to online
        db = SessionLocal()
        try:
            user.status = "online"
            db.commit()
        finally:
            db.close()
        
        # Store connection
        active_connections[user.id] = websocket
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "message": "Connected to chat"
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                await handle_message(user, message_data)
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": "Unknown message type"
                })
                
    except WebSocketDisconnect:
        # Remove connection
        if user.id in active_connections:
            del active_connections[user.id]
        
        # Update user status to offline
        if 'user' in locals():
            db = SessionLocal()
            try:
                db_user = db.query(User).filter(User.id == user.id).first()
                if db_user:
                    db_user.status = "offline"
                    db.commit()
            finally:
                db.close()
    except Exception as e:
        # Remove connection on error
        if user.id in active_connections:
            del active_connections[user.id]
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

async def handle_message(sender: User, message_data: dict):
    """Handle incoming message and broadcast"""
    recipient_id = message_data.get("recipient_id")
    group_id = message_data.get("group_id")
    text = message_data.get("text")
    attachment = message_data.get("attachment")
    
    if not recipient_id and not group_id:
        # Send error back to sender
        if sender.id in active_connections:
            await active_connections[sender.id].send_json({
                "type": "error",
                "message": "Either recipient_id or group_id must be provided"
            })
        return
    
    db = SessionLocal()
    try:
        # Save message to database
        new_message = Message(
            sender_id=sender.id,
            recipient_id=recipient_id,
            group_id=group_id,
            text=text,
            attachment_url=attachment.get("url") if attachment else None,
            attachment_name=attachment.get("name") if attachment else None,
            attachment_type=attachment.get("mimeType") if attachment else None
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        # Prepare message response
        message_response = {
            "type": "message",
            "id": new_message.id,
            "sender_id": new_message.sender_id,
            "recipient_id": new_message.recipient_id,
            "group_id": new_message.group_id,
            "text": new_message.text,
            "attachment": attachment if attachment else None,
            "timestamp": new_message.timestamp.isoformat()
        }
        
        # Broadcast message
        if recipient_id:
            # Personal chat: send to recipient
            if recipient_id in active_connections:
                await active_connections[recipient_id].send_json(message_response)
            
            # Also send confirmation to sender
            if sender.id in active_connections:
                await active_connections[sender.id].send_json(message_response)
                
        elif group_id:
            # Group chat: send to all members
            members = db.query(GroupMember).filter(
                GroupMember.group_id == group_id
            ).all()
            
            member_ids = {m.user_id for m in members}
            
            for member_id in member_ids:
                if member_id in active_connections:
                    await active_connections[member_id].send_json(message_response)
                    
    finally:
        db.close()
