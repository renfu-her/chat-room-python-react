from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models.user import User
from models.group import Group, GroupMember, GroupDeniedMember, MemberRole
from utils.auth import get_current_user_dependency as get_current_user

router = APIRouter()

class GroupResponse(BaseModel):
    id: int
    name: str
    creator_id: int
    members: List[int]
    denied_members: List[int]

    class Config:
        from_attributes = True

class CreateGroupRequest(BaseModel):
    name: str
    member_ids: List[int]

class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    member_ids: Optional[List[int]] = None

@router.get("", response_model=List[GroupResponse])
async def get_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's groups"""
    # Get groups where user is a member
    group_members = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    group_ids = [gm.group_id for gm in group_members]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    
    result = []
    for group in groups:
        members = [gm.user_id for gm in db.query(GroupMember).filter(
            GroupMember.group_id == group.id
        ).all()]
        denied = [dm.user_id for dm in db.query(GroupDeniedMember).filter(
            GroupDeniedMember.group_id == group.id
        ).all()]
        result.append(GroupResponse(
            id=group.id,
            name=group.name,
            creator_id=group.creator_id,
            members=members,
            denied_members=denied
        ))
    
    return result

@router.post("", response_model=GroupResponse)
async def create_group(
    request: CreateGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new group"""
    # Create group
    new_group = Group(
        name=request.name,
        creator_id=current_user.id
    )
    db.add(new_group)
    db.flush()
    
    # Add creator as admin
    creator_member = GroupMember(
        group_id=new_group.id,
        user_id=current_user.id,
        role=MemberRole.admin
    )
    db.add(creator_member)
    
    # Add other members
    member_ids = set(request.member_ids)
    member_ids.discard(current_user.id)  # Remove creator if present
    
    for member_id in member_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == member_id).first()
        if user:
            member = GroupMember(
                group_id=new_group.id,
                user_id=member_id,
                role=MemberRole.member
            )
            db.add(member)
    
    db.commit()
    db.refresh(new_group)
    
    members = [gm.user_id for gm in db.query(GroupMember).filter(
        GroupMember.group_id == new_group.id
    ).all()]
    
    # Broadcast group creation via WebSocket
    try:
        from websocket.chat import broadcast_group_change
        await broadcast_group_change(new_group.id, "created", {
            "name": new_group.name,
            "creator_id": new_group.creator_id,
            "members": members
        })
    except:
        pass  # WebSocket might not be available
    
    return GroupResponse(
        id=new_group.id,
        name=new_group.name,
        creator_id=new_group.creator_id,
        members=members,
        denied_members=[]
    )

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get group details"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is a member
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )
    
    members = [gm.user_id for gm in db.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).all()]
    denied = [dm.user_id for dm in db.query(GroupDeniedMember).filter(
        GroupDeniedMember.group_id == group_id
    ).all()]
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        creator_id=group.creator_id,
        members=members,
        denied_members=denied
    )

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    request: UpdateGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is creator or admin
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member or (member.role != MemberRole.admin and group.creator_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group creator or admin can update group"
        )
    
    if request.name is not None:
        group.name = request.name
    
    if request.member_ids is not None:
        # Remove existing members (except creator)
        db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id != group.creator_id
        ).delete()
        
        # Add new members
        member_ids = set(request.member_ids)
        member_ids.add(group.creator_id)  # Always include creator
        member_ids.discard(current_user.id)
        
        for member_id in member_ids:
            user = db.query(User).filter(User.id == member_id).first()
            if user:
                new_member = GroupMember(
                    group_id=group_id,
                    user_id=member_id,
                    role=MemberRole.member if member_id != group.creator_id else MemberRole.admin
                )
                db.add(new_member)
    
    db.commit()
    db.refresh(group)
    
    members = [gm.user_id for gm in db.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).all()]
    denied = [dm.user_id for dm in db.query(GroupDeniedMember).filter(
        GroupDeniedMember.group_id == group_id
    ).all()]
    
    # Broadcast group update via WebSocket
    try:
        from websocket.chat import broadcast_group_change
        await broadcast_group_change(group_id, "updated", {
            "name": group.name,
            "members": members,
            "denied_members": denied
        })
    except:
        pass  # WebSocket might not be available
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        creator_id=group.creator_id,
        members=members,
        denied_members=denied
    )

@router.delete("/{group_id}", response_model=dict)
async def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Only creator can delete
    if group.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group creator can delete group"
        )
    
    # Get members before deletion for notification
    member_ids = [gm.user_id for gm in db.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).all()]
    
    # Delete related records
    db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
    db.query(GroupDeniedMember).filter(GroupDeniedMember.group_id == group_id).delete()
    db.delete(group)
    db.commit()
    
    # Broadcast group deletion via WebSocket
    try:
        from websocket.chat import broadcast_group_change
        await broadcast_group_change(group_id, "deleted", {})
    except:
        pass  # WebSocket might not be available
    
    return {"message": "Group deleted successfully"}

class AddMemberRequest(BaseModel):
    user_id: int

@router.post("/{group_id}/members", response_model=dict)
async def add_member(
    group_id: int,
    request: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add member to group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check permissions
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member or (member.role != MemberRole.admin and group.creator_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can add members"
        )
    
    # Check if already a member
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == request.user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member"
        )
    
    # Add member
    new_member = GroupMember(
        group_id=group_id,
        user_id=request.user_id,
        role=MemberRole.member
    )
    db.add(new_member)
    db.commit()
    
    # Broadcast member addition via WebSocket
    try:
        from websocket.chat import broadcast_group_change
        await broadcast_group_change(group_id, "member_added", {
            "user_id": request.user_id
        })
    except:
        pass  # WebSocket might not be available
    
    return {"message": "Member added successfully"}

@router.delete("/{group_id}/members/{user_id}", response_model=dict)
async def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove member from group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check permissions
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member or (member.role != MemberRole.admin and group.creator_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can remove members"
        )
    
    # Cannot remove creator
    if user_id == group.creator_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove group creator"
        )
    
    db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).delete()
    db.commit()
    
    # Broadcast member removal via WebSocket
    try:
        from websocket.chat import broadcast_group_change
        await broadcast_group_change(group_id, "member_removed", {
            "user_id": user_id
        })
    except:
        pass  # WebSocket might not be available
    
    return {"message": "Member removed successfully"}

@router.post("/{group_id}/deny/{user_id}", response_model=dict)
async def deny_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deny user access to group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check permissions
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member or (member.role != MemberRole.admin and group.creator_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can deny access"
        )
    
    # Check if already denied
    existing = db.query(GroupDeniedMember).filter(
        GroupDeniedMember.group_id == group_id,
        GroupDeniedMember.user_id == user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already denied"
        )
    
    # Remove from members if present
    db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).delete()
    
    # Add to denied list
    denied = GroupDeniedMember(
        group_id=group_id,
        user_id=user_id
    )
    db.add(denied)
    db.commit()
    
    return {"message": "User denied successfully"}

@router.delete("/{group_id}/deny/{user_id}", response_model=dict)
async def un_deny_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove user from denied list"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check permissions
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member or (member.role != MemberRole.admin and group.creator_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can un-deny access"
        )
    
    db.query(GroupDeniedMember).filter(
        GroupDeniedMember.group_id == group_id,
        GroupDeniedMember.user_id == user_id
    ).delete()
    db.commit()
    
    return {"message": "User un-denied successfully"}
