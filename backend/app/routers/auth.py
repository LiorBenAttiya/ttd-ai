"""
Auth helpers:
  POST /auth/dev-token     — local dev only (blocked in production)
  POST /auth/service-token — machine-to-machine for wa-bridge and frontend
                             (requires INTERNAL_SERVICE_KEY env var)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/dev-token")
async def dev_token():
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    token = create_access_token(subject="lior@lbatech.com")
    return {"access_token": token, "token_type": "bearer"}


class ServiceTokenRequest(BaseModel):
    key: str


@router.post("/service-token")
async def service_token(req: ServiceTokenRequest):
    """Issue a JWT for internal services (wa-bridge, frontend).

    Requires INTERNAL_SERVICE_KEY to be set in the environment.
    Returns 404 if the key is not configured, 403 if the key is wrong.
    """
    if not settings.INTERNAL_SERVICE_KEY:
        raise HTTPException(status_code=404, detail="Not found")
    if req.key != settings.INTERNAL_SERVICE_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")
    token = create_access_token(subject="internal@ttdai")
    return {"access_token": token, "token_type": "bearer"}
