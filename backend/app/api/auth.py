from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.db.deps import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token

router = APIRouter()


# =========================
# Request Schemas
# =========================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None  # admin / manager / cashier (auto-assigned if omitted)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =========================
# Routes
# =========================

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email
    password = payload.password

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    # First user ever registered becomes admin automatically
    is_first_user = db.query(User).count() == 0
    if is_first_user:
        role = "admin"
    else:
        # Use provided role if valid, else default to cashier
        allowed = {"admin", "manager", "cashier"}
        role = payload.role if payload.role in allowed else "cashier"

    user = User(
        email=email,
        hashed_password=hash_password(password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully", "role": role}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email
    password = payload.password

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Embed role in JWT so frontend and backend can enforce RBAC
    token = create_access_token({"sub": user.email, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
    }
