# app/core/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.db_models import User
from app.core.security import decode_access_token


# =====================================================
# SECURITY SCHEME
# =====================================================

security = HTTPBearer(auto_error=False)


# =====================================================
# AUTHENTICATED USER MODEL (TYPE SAFE)
# =====================================================

class CurrentUser(BaseModel):
    id: int
    organization_id: int
    email: str
    role: str


# =====================================================
# GET CURRENT AUTHENTICATED USER
# =====================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> CurrentUser:
    """
    Validate access token and return authenticated user context.
    Enforces:
    - JWT validity
    - User existence
    - User active
    - Organization match between token & DB
    """

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing."
        )

    token = credentials.credentials

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token."
        )

    user_id = payload.get("user_id")
    token_org_id = payload.get("organization_id")
    role = payload.get("role")

    if not user_id or not token_org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive."
        )

    # 🔒 CRITICAL: Ensure token org matches DB org
    if user.organization_id != token_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization mismatch."
        )

    return CurrentUser(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        role=role
    )


# =====================================================
# ROLE GUARD (OPTIONAL FUTURE USE)
# =====================================================

def require_role(required_roles: list[str]):
    def role_checker(
        current_user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:

        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions."
            )

        return current_user

    return role_checker


# =====================================================
# ORGANIZATION SAFETY GUARD
# =====================================================

def require_same_organization(
    organization_id: int,
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """
    Prevent cross-organization access.
    """

    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-organization access denied."
        )

    return current_user