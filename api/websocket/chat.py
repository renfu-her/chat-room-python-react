from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Dict, Set
import json
from datetime import datetime

from database import get_db, SessionLocal
from models.user import User
from models.message import Message
from models.group import Group, GroupMember
from models.friendship import Friendship, FriendshipStatus
from utils.auth import get_session_user_id, sessions

router = APIRouter()

# WebSocket connection pool: {user_id: websocket}
active_connections: Dict[int, WebSocket] = {}

async def broadcast_to_all(message: dict, exclude_user_id: int = None):
    """Broadcast message to all connected users"""
    for user_id, websocket in list(active_connections.items()):
        if exclude_user_id and user_id == exclude_user_id:
            continue
        try:
            await websocket.send_json(message)
        except:
            pass  # Connection might be closed

async def broadcast_user_status(user_id: int, status: str, broadcast_to_all_users: bool = False):
    """Broadcast user status change to all friends, or all users if broadcast_to_all_users=True"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Prepare status update message
        status_update = {
            "type": "user_status_update",
            "user_id": user_id,
            "user_name": user.name,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if broadcast_to_all_users:
            # Broadcast to all connected users
            await broadcast_to_all(status_update, exclude_user_id=user_id)
        else:
            # Get all friends
            friendships = db.query(Friendship).filter(
                ((Friendship.user_id == user_id) | (Friendship.friend_id == user_id)),
                Friendship.status == FriendshipStatus.accepted
            ).all()
            
            friend_ids = set()
            for friendship in friendships:
                if friendship.user_id == user_id:
                    friend_ids.add(friendship.friend_id)
                else:
                    friend_ids.add(friendship.user_id)
            
            # Broadcast to all friends
            for friend_id in friend_ids:
                if friend_id in active_connections:
                    try:
                        await active_connections[friend_id].send_json(status_update)
                    except:
                        pass  # Connection might be closed
    finally:
        db.close()

async def broadcast_friend_change(user_id: int, friend_id: int, action: str):
    """Broadcast friend change (add/remove) to both users"""
    change_notification = {
        "type": "friend_change",
        "action": action,  # "added" or "removed"
        "user_id": user_id,
        "friend_id": friend_id
    }
    
    # Notify both users if they're connected
    if user_id in active_connections:
        try:
            await active_connections[user_id].send_json(change_notification)
        except:
            pass
    
    if friend_id in active_connections:
        try:
            await active_connections[friend_id].send_json(change_notification)
        except:
            pass

async def broadcast_group_change(group_id: int, action: str, data: dict = None):
    """Broadcast group change to all members"""
    db = SessionLocal()
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return
        
        members = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).all()
        
        member_ids = {m.user_id for m in members}
        
        # Get user info for member_added/member_removed actions
        user_info = None
        if data and "user_id" in data:
            user = db.query(User).filter(User.id == data["user_id"]).first()
            if user:
                user_info = {"id": user.id, "name": user.name}
        
        group_notification = {
            "type": "group_change",
            "action": action,  # "created", "updated", "deleted", "member_added", "member_removed"
            "group_id": group_id,
            "group_name": group.name,
            "data": data or {},
            "user_info": user_info
        }
        
        # Send system message to group members for member_added/member_removed
        if action in ["member_added", "member_removed"] and user_info:
            system_message = {
                "type": "system_message",
                "group_id": group_id,
                "group_name": group.name,
                "action": action,
                "user_id": user_info["id"],
                "user_name": user_info["name"],
                "text": f"{user_info['name']} {'加入' if action == 'member_added' else '離開'}了群組 {group.name}",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            for member_id in member_ids:
                if member_id in active_connections:
                    try:
                        await active_connections[member_id].send_json(system_message)
                    except:
                        pass
        
        # Send group change notification
        for member_id in member_ids:
            if member_id in active_connections:
                try:
                    await active_connections[member_id].send_json(group_notification)
                except:
                    pass
    finally:
        db.close()

async def get_user_from_session(websocket: WebSocket) -> User:
    """Get user from session cookie"""
    session_id = websocket.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        # Close connection and return None (caller should handle)
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Not authenticated")
        except:
            pass  # Connection might already be closed
        return None
    
    user_id = sessions[session_id]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Close connection and return None (caller should handle)
            try:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
            except:
                pass  # Connection might already be closed
            return None
        return user
    finally:
        db.close()

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    
    user = None
    try:
        # Get user from session
        user = await get_user_from_session(websocket)
        
        # If authentication failed, user will be None and connection already closed
        if user is None:
            return
        
        # Update user status to online
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.id == user.id).first()
            if db_user:
                db_user.status = "online"
                db.commit()
        finally:
            db.close()
        
        # Store connection
        active_connections[user.id] = websocket
        
        # Send all friends' current status to the newly connected user
        db = SessionLocal()
        try:
            # Get all friends
            friendships = db.query(Friendship).filter(
                ((Friendship.user_id == user.id) | (Friendship.friend_id == user.id)),
                Friendship.status == FriendshipStatus.accepted
            ).all()
            
            friend_ids = set()
            for friendship in friendships:
                if friendship.user_id == user.id:
                    friend_ids.add(friendship.friend_id)
                else:
                    friend_ids.add(friendship.user_id)
            
            # Send status update for each friend
            for friend_id in friend_ids:
                friend_user = db.query(User).filter(User.id == friend_id).first()
                if friend_user:
                    status_update = {
                        "type": "user_status_update",
                        "user_id": friend_id,
                        "user_name": friend_user.name,
                        "status": friend_user.status or "offline"
                    }
                    try:
                        await websocket.send_json(status_update)
                    except:
                        pass
        finally:
            db.close()
        
        # Broadcast user online status to all friends
        try:
            await broadcast_user_status(user.id, "online")
        except Exception as e:
            print(f"Error broadcasting user status: {e}")
        
        # Broadcast login notification to all users
        try:
            login_notification = {
                "type": "user_login",
                "user_id": user.id,
                "user_name": user.name,
                "message": f"{user.name} 已登入",
                "timestamp": datetime.utcnow().isoformat()
            }
            await broadcast_to_all(login_notification, exclude_user_id=user.id)
        except Exception as e:
            print(f"Error broadcasting login notification: {e}")
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user.id,
            "message": "Connected to chat"
        })
        
        # Listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                if message_data.get("type") == "message":
                    await handle_message(user, message_data)
                elif message_data.get("type") == "ping":
                    # Heartbeat/ping response
                    await websocket.send_json({"type": "pong"})
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Unknown message type"
                    })
            except WebSocketDisconnect:
                raise
            except Exception as e:
                # Log error but continue listening
                print(f"Error processing WebSocket message: {e}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Error processing message"
                    })
                except:
                    pass  # Connection might be closed
                
    except WebSocketDisconnect:
        # Remove connection
        if user and user.id in active_connections:
            del active_connections[user.id]
        
        # Update user status to offline and broadcast
        if user:
            db = SessionLocal()
            try:
                db_user = db.query(User).filter(User.id == user.id).first()
                if db_user:
                    db_user.status = "offline"
                    db.commit()
            finally:
                db.close()
            
            # Broadcast user offline status to all users (not just friends)
            try:
                await broadcast_user_status(user.id, "offline", broadcast_to_all_users=True)
            except Exception as e:
                print(f"Error broadcasting user offline status: {e}")
            
            # Broadcast logout notification to all users
            try:
                logout_notification = {
                    "type": "user_logout",
                    "user_id": user.id,
                    "user_name": user.name,
                    "message": f"{user.name} 已登出",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await broadcast_to_all(logout_notification)
            except Exception as e:
                print(f"Error broadcasting logout notification: {e}")
    except Exception as e:
        # Remove connection on error
        if user and user.id in active_connections:
            del active_connections[user.id]
        
        # Update status if we have user
        if user:
            db = SessionLocal()
            try:
                db_user = db.query(User).filter(User.id == user.id).first()
                if db_user:
                    db_user.status = "offline"
                    db.commit()
            finally:
                db.close()
            
            # Broadcast user offline status to all users (not just friends)
            try:
                await broadcast_user_status(user.id, "offline", broadcast_to_all_users=True)
            except Exception as e2:
                print(f"Error broadcasting user offline status: {e2}")
            
            # Broadcast logout notification to all users
            try:
                logout_notification = {
                    "type": "user_logout",
                    "user_id": user.id,
                    "user_name": user.name,
                    "message": f"{user.name} 已登出",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await broadcast_to_all(logout_notification)
            except Exception as e2:
                print(f"Error broadcasting logout notification: {e2}")
        
        # Try to close connection, but don't fail if already closed
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass  # Connection might already be closed

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
            recipient_user = db.query(User).filter(User.id == recipient_id).first()
            
            if recipient_id in active_connections:
                try:
                    await active_connections[recipient_id].send_json(message_response)
                except:
                    pass  # Connection might be closed
            
            # Also send confirmation to sender (so they see the message with real ID)
            if sender.id in active_connections:
                try:
                    await active_connections[sender.id].send_json(message_response)
                except:
                    pass
            
            # Send notification to recipient if they're not in the chat window
            # (This is a dynamic notification - you can enhance this logic)
            notification = {
                "type": "message_notification",
                "message_id": new_message.id,
                "sender_id": sender.id,
                "sender_name": sender.name,
                "recipient_id": recipient_id,
                "text": text[:50] + "..." if text and len(text) > 50 else text,
                "timestamp": new_message.timestamp.isoformat()
            }
            if recipient_id in active_connections:
                try:
                    await active_connections[recipient_id].send_json(notification)
                except:
                    pass
                
        elif group_id:
            # Group chat: send to all members
            group = db.query(Group).filter(Group.id == group_id).first()
            members = db.query(GroupMember).filter(
                GroupMember.group_id == group_id
            ).all()
            
            member_ids = {m.user_id for m in members}
            
            for member_id in member_ids:
                if member_id in active_connections:
                    try:
                        await active_connections[member_id].send_json(message_response)
                    except:
                        pass  # Connection might be closed
            
            # Send notification to group members who might not be viewing the chat
            if group:
                notification = {
                    "type": "message_notification",
                    "message_id": new_message.id,
                    "sender_id": sender.id,
                    "sender_name": sender.name,
                    "group_id": group_id,
                    "group_name": group.name,
                    "text": text[:50] + "..." if text and len(text) > 50 else text,
                    "timestamp": new_message.timestamp.isoformat()
                }
                for member_id in member_ids:
                    if member_id != sender.id and member_id in active_connections:
                        try:
                            await active_connections[member_id].send_json(notification)
                        except:
                            pass
                    
    finally:
        db.close()
