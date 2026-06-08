from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.db.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/mailboxes", tags=["mailboxes"])


@router.get("")
async def list_mailboxes(
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    result = await db.execute(text(
        "SELECT id, email, display_name, short_name, unread_count, active FROM mailboxes WHERE active = TRUE ORDER BY created_at"
    ))
    rows = result.fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/connect")
async def connect_mailbox(_user: dict = Depends(get_current_user)):
    """Start Microsoft OAuth flow for a new Outlook mailbox."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/oauth/callback")
async def oauth_callback(code: str, state: str):
    """Handle Microsoft OAuth redirect — store tokens in Key Vault."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.delete("/{mailbox_id}", status_code=204)
async def disconnect_mailbox(mailbox_id: str, _user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{mailbox_id}/inbox")
async def get_inbox(mailbox_id: str, _user: dict = Depends(get_current_user)):
    """Right panel Inbox tab — returns emails + unread_count."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{mailbox_id}/inbox/sync")
async def sync_inbox(mailbox_id: str, _user: dict = Depends(get_current_user)):
    """Force refresh inbox from MS Graph."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{mailbox_id}/inbox/{email_id}/flag")
async def flag_email_as_task(
    mailbox_id: str,
    email_id: str,
    _user: dict = Depends(get_current_user),
):
    """Flag an email → creates a task. Returns new task_id."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
