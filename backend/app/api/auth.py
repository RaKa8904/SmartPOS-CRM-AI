import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.deps import get_db
from app.models.user import User
from app.models.auth_security import PasswordResetToken, UserInvite
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.core.audit import write_audit_log
from app.core.dependencies import get_current_user, require_role
from app.core.email_sender import send_email

router = APIRouter()

ALLOWED_ROLES = {"admin", "manager", "cashier"}
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
ACCOUNT_LOCK_MINUTES = int(os.getenv("ACCOUNT_LOCK_MINUTES", "15"))
INVITE_EXPIRE_HOURS = int(os.getenv("INVITE_EXPIRE_HOURS", "48"))
PASSWORD_RESET_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# =========================
# Request Schemas
# =========================

class RegisterRequest(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password: str
    invite_token: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class InviteCreateRequest(BaseModel):
    email: EmailStr
    role: str
    expires_hours: Optional[int] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# =========================
# Routes
# =========================

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    username = (payload.username or "").strip()
    password = payload.password

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    # First user ever registered becomes admin automatically
    is_first_user = db.query(User).count() == 0
    invite: UserInvite | None = None

    if is_first_user:
        role = "admin"
    else:
        if not payload.invite_token:
            raise HTTPException(status_code=403, detail="Invite token is required")

        invite = (
            db.query(UserInvite)
            .filter(
                UserInvite.token_hash == _hash_token(payload.invite_token.strip()),
                UserInvite.used_at.is_(None),
                UserInvite.expires_at > _utcnow(),
            )
            .first()
        )
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid or expired invite token")
        if invite.email.lower() != email:
            raise HTTPException(status_code=400, detail="Invite token does not match email")

        role = invite.role

    user = User(
        email=email,
        username=username if username else email.split("@")[0],
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
        session_revoked=False,
        failed_login_attempts=0,
        locked_until=None,
        token_version=0,
    )

    db.add(user)
    db.flush()

    if invite:
        invite.used_at = _utcnow()

    write_audit_log(
        db,
        actor_email=email,
        action="user_registered",
        entity_type="user",
        entity_id=str(user.id),
        details={"role": role, "invited": bool(invite)},
    )

    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully", "role": role, "username": user.username}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    password = payload.password

    user = db.query(User).filter(User.email == email).first()

    if not user:
        write_audit_log(
            db,
            actor_email=email,
            action="login_failed",
            entity_type="auth",
            entity_id=None,
            details={"reason": "email_not_found"},
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.locked_until and user.locked_until > _utcnow():
        raise HTTPException(
            status_code=423,
            detail=f"Account locked until {user.locked_until.isoformat()}",
        )

    if not verify_password(password, user.hashed_password):
        user.failed_login_attempts = int(user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = _utcnow() + timedelta(minutes=ACCOUNT_LOCK_MINUTES)
            user.failed_login_attempts = 0

        write_audit_log(
            db,
            actor_email=email,
            action="login_failed",
            entity_type="auth",
            entity_id=str(user.id),
            details={
                "reason": "invalid_password",
                "locked_until": user.locked_until.isoformat() if user.locked_until else None,
            },
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")

    user.last_login_at = _utcnow()
    user.session_revoked = False
    user.failed_login_attempts = 0
    user.locked_until = None

    write_audit_log(
        db,
        actor_email=user.email,
        action="login",
        entity_type="auth",
        entity_id=str(user.id),
        details={"role": user.role},
    )
    db.commit()

    token_version = int(user.token_version or 0)
    access_token = create_access_token(
        {"sub": user.email, "role": user.role, "name": user.username, "ver": token_version}
    )
    refresh_token = create_refresh_token(
        {"sub": user.email, "role": user.role, "name": user.username, "ver": token_version}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
    }


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_payload = decode_refresh_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if token_payload.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token type")

    email = str(token_payload.get("sub", "")).lower()
    token_version = int(token_payload.get("ver", 0))

    if not email:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
    if token_version != int(user.token_version or 0):
        raise HTTPException(status_code=401, detail="Session expired. Please login again")

    new_access = create_access_token(
        {"sub": user.email, "role": user.role, "name": user.username, "ver": int(user.token_version or 0)}
    )
    new_refresh = create_refresh_token(
        {"sub": user.email, "role": user.role, "name": user.username, "ver": int(user.token_version or 0)}
    )

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
    }


@router.post("/invite")
def create_invite(
    payload: InviteCreateRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
    _=Depends(require_role("admin")),
):
    role = payload.role.strip().lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    creator = db.query(User).filter(User.email == current["email"]).first()
    if not creator:
        raise HTTPException(status_code=401, detail="Invalid user")

    raw_token = secrets.token_urlsafe(32)
    expires_at = _utcnow() + timedelta(hours=payload.expires_hours or INVITE_EXPIRE_HOURS)

    invite = UserInvite(
        email=payload.email.lower(),
        role=role,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
        created_by_user_id=creator.id,
    )
    db.add(invite)

    write_audit_log(
        db,
        actor_email=current["email"],
        action="invite_created",
        entity_type="auth",
        entity_id=None,
        details={"invite_email": payload.email.lower(), "role": role, "expires_at": expires_at.isoformat()},
    )
    db.commit()

    register_link = f"{FRONTEND_URL}/register?invite={raw_token}&email={payload.email.lower()}"
    try:
        send_email(
            to_email=payload.email.lower(),
            subject="SmartPOS Invite",
            body=(
                f"You have been invited to SmartPOS as {role}.\n\n"
                f"Invite Token: {raw_token}\n"
                f"Register Link: {register_link}\n\n"
                f"Token expires at: {expires_at.isoformat()}"
            ),
        )
    except Exception:
        # Email configuration is optional in local/demo usage.
        pass

    return {
        "message": "Invite created",
        "email": payload.email.lower(),
        "role": role,
        "invite_token": raw_token,
        "register_link": register_link,
        "expires_at": expires_at.isoformat(),
    }


@router.post("/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if user and user.is_active:
        raw_token = secrets.token_urlsafe(32)
        expires_at = _utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
        token_row = PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(raw_token),
            expires_at=expires_at,
        )
        db.add(token_row)
        write_audit_log(
            db,
            actor_email=email,
            action="password_reset_requested",
            entity_type="auth",
            entity_id=str(user.id),
            details={"expires_at": expires_at.isoformat()},
        )

        reset_link = f"{FRONTEND_URL}/login?reset_token={raw_token}&email={email}"
        try:
            send_email(
                to_email=email,
                subject="SmartPOS Password Reset",
                body=(
                    "We received a request to reset your SmartPOS password.\n\n"
                    f"Reset Token: {raw_token}\n"
                    f"Reset Link: {reset_link}\n\n"
                    f"This token expires at: {expires_at.isoformat()}"
                ),
            )
        except Exception:
            pass

        db.commit()

    # Return generic message to avoid user enumeration.
    return {"message": "If that email exists, a password reset token has been sent."}


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    token_hash = _hash_token(payload.token.strip())
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > _utcnow(),
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == row.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.hashed_password = hash_password(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    user.session_revoked = True
    user.token_version = int(user.token_version or 0) + 1
    row.used_at = _utcnow()

    write_audit_log(
        db,
        actor_email=user.email,
        action="password_reset_completed",
        entity_type="auth",
        entity_id=str(user.id),
        details={},
    )
    db.commit()

    return {"message": "Password reset successful. Please login again."}
