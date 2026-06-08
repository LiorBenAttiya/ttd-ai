from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.security import get_current_user

router = APIRouter(tags=["contacts & companies"])


# ── Companies ─────────────────────────────────────────────────
company_router = APIRouter(prefix="/companies")


@company_router.get("")
async def list_companies(_user: dict = Depends(get_current_user)):
    return []


@company_router.post("", status_code=201)
async def create_company(payload: dict, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@company_router.post("/{company_id}/import")
async def import_contacts(
    company_id: str,
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    """Upload CSV or vCard — bulk import contacts for a company."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


# ── Contacts ──────────────────────────────────────────────────
contact_router = APIRouter(prefix="/contacts")


@contact_router.get("")
async def search_contacts(
    q: str = "",
    company_id: str = None,
    recent: bool = False,
    _user: dict = Depends(get_current_user),
):
    return []


@contact_router.post("", status_code=201)
async def create_contact(payload: dict, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@contact_router.patch("/{contact_id}")
async def update_contact(
    contact_id: str,
    payload: dict,
    _user: dict = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Not implemented yet")
