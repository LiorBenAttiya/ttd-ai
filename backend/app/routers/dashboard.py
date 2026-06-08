from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.db.database import get_db
from app.services import task_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await task_service.get_stats(db)


@router.get("/recent-contacts")
async def get_recent_contacts(_user: dict = Depends(get_current_user)):
    return []


@router.get("/activity")
async def get_global_activity(_user: dict = Depends(get_current_user)):
    return []
