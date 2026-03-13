from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.core.audit import write_audit_log
from app.db.deps import get_db
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])

VALID_ROLES = {"admin", "manager", "cashier"}


class UpdateRoleRequest(BaseModel):
    role: str


class UpdateStatusRequest(BaseModel):
    is_active: bool


class UpdateUsernameRequest(BaseModel):
    username: str


@router.get("/list")
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "role": u.role,
            "is_active": bool(u.is_active),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "session_revoked": bool(u.session_revoked),
        }
        for u in users
    ]


@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    role = payload.role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Prevent accidental self demotion from admin panel.
    if current["email"] == target.email and role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")

    old_role = target.role
    target.role = role
    write_audit_log(
        db,
        actor_email=current["email"],
        action="user_role_changed",
        entity_type="user",
        entity_id=str(target.id),
        details={"target_email": target.email, "old_role": old_role, "new_role": role},
    )
    db.commit()
    return {"message": "Role updated", "user_id": target.id, "role": target.role}


@router.put("/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UpdateStatusRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if current["email"] == target.email and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    if target.role == "admin" and not payload.is_active:
        active_admins = (
            db.query(User)
            .filter(User.role == "admin", User.is_active.is_(True), User.id != target.id)
            .count()
        )
        if active_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot disable the last active admin")

    old_is_active = bool(target.is_active)
    target.is_active = payload.is_active
    if not payload.is_active:
        target.session_revoked = True
    write_audit_log(
        db,
        actor_email=current["email"],
        action="user_status_changed",
        entity_type="user",
        entity_id=str(target.id),
        details={
            "target_email": target.email,
            "old_is_active": old_is_active,
            "new_is_active": bool(payload.is_active),
        },
    )
    db.commit()

    return {"message": "Status updated", "user_id": target.id, "is_active": bool(target.is_active)}


@router.put("/{user_id}/username")
def update_user_username(
    user_id: int,
    payload: UpdateUsernameRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    new_name = payload.username.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(new_name) > 80:
        raise HTTPException(status_code=400, detail="Username must be <= 80 characters")

    old_username = target.username
    target.username = new_name
    write_audit_log(
        db,
        actor_email=current["email"],
        action="user_username_changed",
        entity_type="user",
        entity_id=str(target.id),
        details={
            "target_email": target.email,
            "old_username": old_username,
            "new_username": target.username,
        },
    )
    db.commit()

    return {"message": "Username updated", "user_id": target.id, "username": target.username}


@router.post("/{user_id}/revoke-session")
def revoke_user_session(
    user_id: int,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.session_revoked = True
    write_audit_log(
        db,
        actor_email=current["email"],
        action="user_session_revoked",
        entity_type="user",
        entity_id=str(target.id),
        details={"target_email": target.email},
    )
    db.commit()

    return {"message": "Session revoked", "user_id": target.id}
