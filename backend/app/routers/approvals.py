from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("")
async def list_approvals(_user: dict = Depends(get_current_user)):
    """List AI-proposed tasks pending review (status=proposed)."""
    return []


@router.post("/{approval_id}/approve")
async def approve(approval_id: str, payload: dict = {}, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{approval_id}/reject")
async def reject(approval_id: str, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.patch("/{approval_id}/edit")
async def edit_proposal(approval_id: str, payload: dict, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")
