"""
email_router.py — Microsoft Graph OAuth + multi-account inbox proxy
Tokens are stored per email address (from Graph /me after OAuth).

Endpoints:
  GET /email/auth                      -> { auth_url }
  GET /email/callback                  -> exchanges code, stores token, redirects
  GET /email/accounts                  -> [ { email, name } ]
  GET /email/status                    -> { connected: bool, accounts: [...] }
  GET /email/messages?account=         -> { connected, count, messages[] }
  GET /email/messages/{id}?account=    -> full email body
"""
import json
import logging
import urllib.parse
from pathlib import Path

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import RedirectResponse

from app.core.config import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email"])

# ── Persistent token store ────────────────────────────────────────────────────
# Keyed by email address: { "lior@lbatech.com": { access_token, ... }, ... }
_TOKEN_FILE = Path(__file__).parent.parent.parent / "email_tokens.json"
_token_store: dict[str, dict] = {}


def _load_tokens() -> None:
    """Load persisted tokens from disk on startup."""
    global _token_store
    try:
        if _TOKEN_FILE.exists():
            _token_store = json.loads(_TOKEN_FILE.read_text())
            log.info("Loaded %d email account(s) from %s", len(_token_store), _TOKEN_FILE)
    except Exception as exc:
        log.warning("Could not load email tokens: %s", exc)


def _save_tokens() -> None:
    """Persist token store to disk."""
    try:
        _TOKEN_FILE.write_text(json.dumps(_token_store, indent=2))
    except Exception as exc:
        log.warning("Could not save email tokens: %s", exc)


_load_tokens()  # Load immediately on import

SCOPES    = "Mail.Read offline_access User.Read"
AUTHORITY = "https://login.microsoftonline.com/common"
GRAPH_API = "https://graph.microsoft.com/v1.0"
FRONTEND  = "http://localhost:5173"


# ── helpers ───────────────────────────────────────────────────────────────────

def _build_auth_url() -> str:
    params = {
        "client_id":     settings.AZURE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  settings.GRAPH_REDIRECT_URI,
        "scope":         SCOPES,
        "response_mode": "query",
        "prompt":        "select_account",
    }
    return f"{AUTHORITY}/oauth2/v2.0/authorize?{urllib.parse.urlencode(params)}"


async def _exchange_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.post(
            f"{AUTHORITY}/oauth2/v2.0/token",
            data={
                "client_id":     settings.AZURE_CLIENT_ID,
                "client_secret": settings.AZURE_CLIENT_SECRET,
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  settings.GRAPH_REDIRECT_URI,
                "scope":         SCOPES,
            },
        )
    return r.json() if r.status_code == 200 else {}


async def _get_me(access_token: str) -> dict:
    """Fetch /me to get the email address for this token."""
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.get(
            f"{GRAPH_API}/me",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"$select": "mail,userPrincipalName,displayName"},
        )
    if r.status_code == 200:
        return r.json()
    return {}


async def _refresh(email: str) -> bool:
    td = _token_store.get(email, {})
    rt = td.get("refresh_token")
    if not rt:
        return False
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.post(
            f"{AUTHORITY}/oauth2/v2.0/token",
            data={
                "client_id":     settings.AZURE_CLIENT_ID,
                "client_secret": settings.AZURE_CLIENT_SECRET,
                "grant_type":    "refresh_token",
                "refresh_token": rt,
                "scope":         SCOPES,
            },
        )
    if r.status_code == 200:
        data = r.json()
        _token_store[email] = {**td, **data}
        _save_tokens()
        return True
    return False


def _get_token(email: str) -> str | None:
    return _token_store.get(email, {}).get("access_token")


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/auth")
async def email_auth():
    return {"auth_url": _build_auth_url()}


@router.get("/callback")
async def email_callback(code: str):
    token_data = await _exchange_code(code)
    if not token_data.get("access_token"):
        return RedirectResponse(f"{FRONTEND}?email_error=1")

    me = await _get_me(token_data["access_token"])
    email = me.get("mail") or me.get("userPrincipalName", "unknown")
    name  = me.get("displayName", email)

    _token_store[email] = {**token_data, "_name": name, "_email": email}
    _save_tokens()
    encoded = urllib.parse.quote(email)
    return RedirectResponse(f"{FRONTEND}?email_connected=1&account={encoded}")


@router.get("/accounts")
async def email_accounts():
    accounts = []
    for email, td in _token_store.items():
        accounts.append({
            "email": email,
            "name":  td.get("_name", email),
        })
    return {"accounts": accounts}


@router.get("/status")
async def email_status():
    accounts = [{"email": e, "name": td.get("_name", e)} for e, td in _token_store.items()]
    return {"connected": len(accounts) > 0, "accounts": accounts}


@router.get("/messages")
async def email_messages(
    account: str = Query(default=""),
    limit:   int = Query(default=50),
):
    # Pick account: explicit param or first available
    email = account or (next(iter(_token_store), None))
    if not email or email not in _token_store:
        return {"connected": False, "messages": [], "error": "not_connected"}

    access_token = _get_token(email)
    top = min(limit, 50)
    odata = f"$top={top}&$select=id,subject,from,receivedDateTime,isRead,bodyPreview,flag,hasAttachments&$orderby=receivedDateTime+desc"
    url = f"{GRAPH_API}/me/messages?{odata}"

    async with httpx.AsyncClient(timeout=12.0) as c:
        r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})

    if r.status_code == 401:
        if await _refresh(email):
            access_token = _get_token(email)
            async with httpx.AsyncClient(timeout=12.0) as c:
                r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})
        else:
            _token_store.pop(email, None)
            _save_tokens()
            return {"connected": False, "messages": [], "error": "token_expired"}

    if r.status_code != 200:
        return {"connected": False, "messages": [], "error": r.text[:200]}

    raw_value = r.json().get("value", [])
    if raw_value:
        first = raw_value[0]
        log.info("Graph first msg subject=%r isRead=%r keys=%s",
                 first.get("subject"), first.get("isRead"), list(first.keys()))
    messages = []
    for m in raw_value:
        sender = m.get("from", {}).get("emailAddress", {})
        messages.append({
            "id":              m["id"],
            "subject":         m.get("subject") or "(no subject)",
            "sender_name":     sender.get("name", ""),
            "sender_email":    sender.get("address", ""),
            "preview":         (m.get("bodyPreview") or "")[:200],
            "received_at":     m.get("receivedDateTime", ""),
            "is_read":         m.get("isRead", True),
            "is_flagged":      m.get("flag", {}).get("flagStatus") == "flagged",
            "has_attachments": m.get("hasAttachments", False),
        })

    return {"connected": True, "account": email, "count": len(messages), "messages": messages}


@router.get("/messages/{message_id}")
async def email_message_body(
    message_id: str,
    account: str = Query(default=""),
):
    email = account or (next(iter(_token_store), None))
    if not email or email not in _token_store:
        return {"error": "not_connected"}

    access_token = _get_token(email)
    odata = "$select=id,subject,from,toRecipients,receivedDateTime,body,flag,hasAttachments,isRead"
    url = f"{GRAPH_API}/me/messages/{message_id}?{odata}"

    async with httpx.AsyncClient(timeout=12.0) as c:
        r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})

    if r.status_code == 401:
        if await _refresh(email):
            access_token = _get_token(email)
            async with httpx.AsyncClient(timeout=12.0) as c:
                r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})
        else:
            return {"error": "token_expired"}

    if r.status_code != 200:
        return {"error": r.text[:200]}

    m      = r.json()
    sender = m.get("from", {}).get("emailAddress", {})
    to     = [rc.get("emailAddress", {}).get("address", "") for rc in m.get("toRecipients", [])]
    body   = m.get("body", {})

    return {
        "id":              m["id"],
        "subject":         m.get("subject") or "(no subject)",
        "sender_name":     sender.get("name", ""),
        "sender_email":    sender.get("address", ""),
        "to":              to,
        "received_at":     m.get("receivedDateTime", ""),
        "body_html":       body.get("content", "") if body.get("contentType") == "html" else "",
        "body_text":       body.get("content", "") if body.get("contentType") == "text"  else "",
        "is_flagged":      m.get("flag", {}).get("flagStatus") == "flagged",
        "has_attachments": m.get("hasAttachments", False),
    }

@router.patch("/accounts/rename")
async def rename_account(account: str = Query(...), name: str = Query(...)):
    """Set a custom display name for a connected account."""
    if account not in _token_store:
        return {"ok": False, "error": "account_not_found"}
    _token_store[account]["_name"] = name
    _save_tokens()
    return {"ok": True, "email": account, "name": name}


@router.get("/debug")
async def email_debug(account: str = Query(default="")):
    """Return raw Graph response for first 3 messages (dev/debug)."""
    email = account or next(iter(_token_store), None)
    if not email:
        return {"error": "no_accounts"}
    access_token = _get_token(email)
    url = f"{GRAPH_API}/me/messages?$top=3&$select=id,subject,from,receivedDateTime,isRead"
    async with httpx.AsyncClient(timeout=12.0) as c:
        r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})
    return {"status": r.status_code, "raw": r.json()}
