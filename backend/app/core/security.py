from passlib.context import CryptContext
from fastapi import HTTPException
import bcrypt as bcrypt_lib

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)

MAX_PASSWORD_LENGTH = 256

def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > MAX_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="Password too long (max 256 characters)"
        )
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Backward compatibility for existing bcrypt hashes in DB.
    if hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$"):
        try:
            return bcrypt_lib.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    return pwd_context.verify(plain_password, hashed_password)
