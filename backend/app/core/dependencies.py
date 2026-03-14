from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.jwt import decode_access_token
from app.db.deps import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Return dict {email, role} from a valid JWT."""
    try:
        payload = decode_access_token(token)
        email: str | None = payload.get("sub")
        role: str = payload.get("role", "cashier")
        token_type: str = payload.get("typ", "")
        token_version: int = int(payload.get("ver", 0))

        if token_type != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is disabled")
        if user.session_revoked:
            raise HTTPException(status_code=401, detail="Session revoked. Please login again")
        if token_version != int(user.token_version or 0):
            raise HTTPException(status_code=401, detail="Session expired. Please login again")

        return {"email": email, "role": role}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def require_role(*roles: str):
    """Dependency factory — raises 403 if the caller's role is not in *roles."""
    def dependency(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {', '.join(roles)}",
            )
        return current_user
    return dependency
