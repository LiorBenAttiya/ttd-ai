from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/daily")
async def preview_daily_report(_user: dict = Depends(get_current_user)):
    """Preview next daily report as JSON — for web dashboard."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/send-now")
async def send_report_now(_user: dict = Depends(get_current_user)):
    """Trigger immediate WhatsApp report send."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/schedule")
async def get_schedule(_user: dict = Depends(get_current_user)):
    """Get current cron schedule config."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.patch("/schedule")
async def update_schedule(payload: dict, _user: dict = Depends(get_current_user)):
    """Update cron, timezone, look_ahead days."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
