"""
ai_router.py — AI Inbox: analyzes WhatsApp messages + emails and suggests tasks.

Endpoints:
  GET /ai/inbox   -> { suggestions[], analyzed_at, sources }
"""
import json
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.routers.email_router import _token_store, _get_token, _refresh

log = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
GRAPH_API     = "https://graph.microsoft.com/v1.0"
WA_BRIDGE     = settings.WA_BRIDGE_URL


# ── helpers ───────────────────────────────────────────────────────────────────

async def _fetch_wa_messages(limit: int = 20) -> list[dict]:
    """Pull recent self-messages from the WA bridge."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get(f"{WA_BRIDGE}/messages", params={"limit": limit})
        if r.status_code == 200:
            data = r.json()
            msgs = data.get("messages", [])
            return [m for m in msgs if m.get("fromMe")]
    except Exception as exc:
        log.warning("WA fetch failed: %s", exc)
    return []


async def _fetch_emails_for_account(email: str, limit: int = 15) -> list[dict]:
    """Fetch recent unread emails for one connected account."""
    access_token = _get_token(email)
    if not access_token:
        return []

    odata = f"$top={limit}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$filter=isRead eq false&$orderby=receivedDateTime desc"
    url   = f"{GRAPH_API}/me/messages?{odata}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})

        if r.status_code == 401:
            if await _refresh(email):
                access_token = _get_token(email)
                async with httpx.AsyncClient(timeout=10.0) as c:
                    r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})

        if r.status_code == 200:
            items = []
            for m in r.json().get("value", []):
                sender = m.get("from", {}).get("emailAddress", {})
                items.append({
                    "id":          m["id"],
                    "subject":     m.get("subject") or "(no subject)",
                    "from":        sender.get("name") or sender.get("address", ""),
                    "preview":     (m.get("bodyPreview") or "")[:300],
                    "received_at": m.get("receivedDateTime", ""),
                    "account":     email,
                })
            return items
    except Exception as exc:
        log.warning("Email fetch for %s failed: %s", email, exc)
    return []


async def _call_claude(prompt: str) -> str:
    """Call Anthropic Claude API and return the text response."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    payload = {
        "model":      "claude-haiku-4-5-20251001",
        "max_tokens": 2048,
        "messages":   [{"role": "user", "content": prompt}],
    }
    headers = {
        "x-api-key":         settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(ANTHROPIC_API, json=payload, headers=headers)

    if r.status_code != 200:
        log.error("Claude API error %s: %s", r.status_code, r.text[:300])
        raise HTTPException(status_code=502, detail=f"Claude API error: {r.status_code}")

    return r.json()["content"][0]["text"]


def _build_prompt(wa_messages: list[dict], emails: list[dict]) -> str:
    wa_block = ""
    if wa_messages:
        wa_block = "--- WhatsApp Messages (self-sent reminders) ---\n"
        for i, m in enumerate(wa_messages[:20], 1):
            ts = datetime.fromtimestamp(m.get("timestamp", 0), tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
            wa_block += f"{i}. [{ts}] {m.get('body', '')}\n"
    else:
        wa_block = "--- WhatsApp Messages ---\n(none)\n"

    email_block = ""
    if emails:
        email_block = "--- Unread Emails ---\n"
        for i, e in enumerate(emails, 1):
            email_block += f"{i}. From: {e['from']} | Subject: {e['subject']}\n   Preview: {e['preview'][:200]}\n"
    else:
        email_block = "--- Unread Emails ---\n(none)\n"

    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")

    return f"""You are a smart executive assistant. Today is {today}.

Analyze the following WhatsApp self-messages and unread emails from a busy executive.
Identify genuinely actionable tasks — things that require a follow-up, decision, response, or action.

Rules:
- Only suggest tasks that are clearly actionable
- Skip newsletters, automated notifications, marketing emails
- Max 8 suggestions
- If a message/email mentions a deadline or date, include it as due_date (ISO format YYYY-MM-DD)
- Priority: 1=High (urgent/important), 2=Medium, 3=Low
- source_type: "whatsapp" or "email"
- Keep titles short and imperative (e.g. "Reply to David re: contract", "Schedule call with Ahmed")

{wa_block}
{email_block}

Respond ONLY with a valid JSON array. No explanation, no markdown, just the array:
[
  {{
    "title": "short actionable task title",
    "description": "1 sentence of context",
    "priority": 1,
    "due_date": null,
    "source_type": "email",
    "context": "From: sender name | Subject: email subject"
  }}
]"""


# ── route ─────────────────────────────────────────────────────────────────────

@router.get("/inbox")
async def ai_inbox():
    """Analyze WA messages + emails and return suggested tasks."""

    # Fetch data in parallel-ish (sequential for simplicity)
    wa_msgs = await _fetch_wa_messages(20)

    all_emails: list[dict] = []
    for email_addr in list(_token_store.keys()):
        emails = await _fetch_emails_for_account(email_addr, 15)
        all_emails.extend(emails)

    # Build prompt and call Claude
    prompt   = _build_prompt(wa_msgs, all_emails)
    raw_text = await _call_claude(prompt)

    # Parse JSON from response
    suggestions = []
    try:
        # Strip any accidental markdown fences
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        suggestions = json.loads(clean.strip())
    except Exception as exc:
        log.warning("Could not parse Claude response: %s\n%s", exc, raw_text[:400])
        suggestions = []

    # Add stable IDs
    for i, s in enumerate(suggestions):
        s["id"] = f"ai-{i}"

    return {
        "suggestions":   suggestions,
        "analyzed_at":   datetime.now(tz=timezone.utc).isoformat(),
        "sources": {
            "wa_messages": len(wa_msgs),
            "emails":      len(all_emails),
            "accounts":    list(_token_store.keys()),
        },
    }
