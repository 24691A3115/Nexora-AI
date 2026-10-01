from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import require_role, hash_password

router = APIRouter(prefix="/users", tags=["User Management (Admin Only)"])

class CreateUserRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "employee"

class UpdateRoleRequest(BaseModel):
    role: str

class ToggleStatusRequest(BaseModel):
    is_active: bool

@router.get("")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    """List all registered users (Admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat()
        } for u in users
    ]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(req: CreateUserRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    """Create a new user (Admin only)."""
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    role = req.role.lower().strip()
    if role not in ["employee", "hr", "admin"]:
        role = "employee"

    new_u = User(
        full_name=req.full_name,
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        role=role,
        is_active=True
    )
    db.add(new_u)
    db.commit()
    db.refresh(new_u)
    return {
        "id": new_u.id,
        "full_name": new_u.full_name,
        "email": new_u.email,
        "role": new_u.role,
        "is_active": new_u.is_active,
        "created_at": new_u.created_at.isoformat()
    }

@router.patch("/{user_id}/role")
def update_user_role(
    user_id: int,
    req: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Update user role (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    role = req.role.lower().strip()
    if role not in ["employee", "hr", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    user.role = role
    db.commit()
    return {"message": f"Updated {user.email} role to '{role}'."}

@router.patch("/{user_id}/status")
def toggle_user_status(
    user_id: int,
    req: ToggleStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Activate or deactivate user account (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_active = req.is_active
    db.commit()
    status_str = "activated" if req.is_active else "deactivated"
    return {"message": f"User account {user.email} has been {status_str}."}
