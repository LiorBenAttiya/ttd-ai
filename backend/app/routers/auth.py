"""
Development auth — issues a JWT for local testing.
NEVER expose this endpoint in production (guarded by APP_ENV check).
"""
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/dev-token")
async def dev_token():
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    token = create_access_token(subject="lior@lbatech.com")
    return {"access_token": token, "token_type": "bearer"}
