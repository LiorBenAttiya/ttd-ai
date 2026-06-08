from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("")
async def list_meetings(
    status: str = None,
    from_date: str = None,
    to_date: str = None,
    _user: dict = Depends(get_current_user),
):
    return []


@router.post("", status_code=201)
async def create_meeting(payload: dict, _user: dict = Depends(get_current_user)):
    """Create meeting + send Outlook calendar invites."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, payload: dict, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.delete("/{meeting_id}", status_code=204)
async def cancel_meeting(meeting_id: str, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")
