from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

security = HTTPBearer()


class CurrentUser:
    """Lightweight representation of the authenticated Supabase user."""

    def __init__(self, user_id: str, email: str | None = None):
        self.id = user_id
        self.email = email


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """
    Verifies the Supabase-issued JWT sent in the Authorization header
    (Bearer token) and returns the authenticated user's id/email.
    """

    token = credentials.credentials

    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase JWT secret is not configured on the server.",
        )

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing subject claim.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("email")

    return CurrentUser(user_id=user_id, email=email)