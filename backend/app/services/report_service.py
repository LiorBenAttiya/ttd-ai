"""
report_service.py — Daily Intelligence Report

Assembles a WhatsApp digest with three focused sections:
  1. Personal  — WA self-messages + overdue/today tasks
  2. MEP       — liorba@mepsltn.com unread emails
  3. LBA       — lior@lbatech.com unread emails

Each section is a separate Claude call (3 sentences each).
The final message is posted to WA Saved Messages via the bridge.
"""
import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
GRAPH_API     = "https://graph.microsoft.com/v1.0"
WA_BRIDGE     = settings.WA_BRIDGE_URL
OWNER_PHONE   = settings.WA_OWNER_PHONE          # e.g. "972543090009"

MEP_ACCOUNT   = "liorba@mepsltn.com"
LBA_ACCOUNT   = "lior@lbatech.com"


# ── low-level helpers ──────────────────────────────────────────────────────────

async def _call_claude(prompt: str, max_tokens: int = 300) -> str:
    """Call Claude and return plain text. Raises on error."""
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    payload = {
        "model":      "claude-haiku-4-5-20251001",
        "max_tokens": max_tokens,
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
        log.error("Claude error %s: %s", r.status_code, r.text[:300])
        raise RuntimeError(f"Claude API returned {r.status_code}")

    return r.json()["content"][0]["text"].strip()


async def _fetch_wa_messages(limit: int = 30) -> list[dict]:
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


async def _fetch_backend_tasks() -> dict:
    """Fetch overdue + today tasks from our own FastAPI."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get("http://localhost:8000/api/v1/tasks",
                            params={"view": "list", "status": "pending", "limit": 50})
        if r.status_code == 200:
            tasks = r.json().get("data") or r.json() or []
            today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
            overdue   = [t for t in tasks if t.get("due_status") == "overdue"]
            due_today = [t for t in tasks if t.get("due_date") == today and t.get("due_status") != "overdue"]
            return {"overdue": overdue, "today": due_today}
    except Exception as exc:
        log.warning("Task fetch failed: %s", exc)
    return {"overdue": [], "today": []}


async def _fetch_emails(email_addr: str, limit: int = 20) -> list[dict]:
    """Fetch unread emails for a connected Graph account."""
    # Import lazily to avoid circular imports
    from app.routers.email_router import _get_token, _refresh  # noqa: PLC0415

    access_token = _get_token(email_addr)
    if not access_token:
        log.warning("No token for %s — skipping email fetch", email_addr)
        return []

    odata = (f"$top={limit}"
             f"&$select=id,subject,from,receivedDateTime,bodyPreview,isRead"
             f"&$filter=isRead eq false"
             f"&$orderby=receivedDateTime desc")
    url = f"{GRAPH_API}/me/messages?{odata}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})

        if r.status_code == 401:
            if await _refresh(email_addr):
                access_token = _get_token(email_addr)
                async with httpx.AsyncClient(timeout=10.0) as c:
                    r = await c.get(url, headers={"Authorization": f"Bearer {access_token}"})

        if r.status_code == 200:
            items = []
            for m in r.json().get("value", []):
                sender = m.get("from", {}).get("emailAddress", {})
                items.append({
                    "subject":  m.get("subject") or "(no subject)",
                    "from":     sender.get("name") or sender.get("address", ""),
                    "preview":  (m.get("bodyPreview") or "")[:250],
                    "received": m.get("receivedDateTime", "")[:10],
                })
            return items
    except Exception as exc:
        log.warning("Email fetch for %s failed: %s", email_addr, exc)
    return []


# ── section summarisers ────────────────────────────────────────────────────────

async def _summarise_personal(wa_messages: list[dict], tasks: dict) -> str:
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d (%A)")

    wa_block = ""
    for i, m in enumerate(wa_messages[:20], 1):
        ts  = datetime.fromtimestamp(m.get("timestamp", 0), tz=timezone.utc).strftime("%b %d %H:%M")
        wa_block += f"  {i}. [{ts}] {m.get('body', '')}\n"
    wa_block = wa_block or "  (none)\n"

    overdue_block = "\n".join(
        f"  - {t.get('description','?')} (due {t.get('due_date','?')})"
        for t in tasks["overdue"][:5]
    ) or "  none"
    today_block = "\n".join(
        f"  - {t.get('description','?')}"
        for t in tasks["today"][:5]
    ) or "  none"

    prompt = f"""You are Lior's executive assistant. Today is {today}.

Write EXACTLY 3 sentences summarising Lior's personal situation.
Focus on: what self-notes he left himself on WhatsApp, what tasks are overdue, and what is due today.
Be direct, specific, and actionable. No bullet points. Plain prose only.

WhatsApp self-messages (last 20):
{wa_block}
Overdue tasks:
{overdue_block}
Due today:
{today_block}

3-sentence summary:"""

    try:
        return await _call_claude(prompt)
    except Exception as exc:
        log.error("Personal summary failed: %s", exc)
        return f"Could not generate personal summary ({exc})."


async def _summarise_email_account(label: str, emails: list[dict]) -> str:
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d (%A)")

    if not emails:
        return f"No unread emails in {label} today."

    email_block = ""
    for i, e in enumerate(emails[:15], 1):
        email_block += (f"  {i}. From: {e['from']} | Subject: {e['subject']}\n"
                        f"     Preview: {e['preview'][:200]}\n")

    prompt = f"""You are Lior's executive assistant. Today is {today}.

Write EXACTLY 3 sentences summarising the unread emails in the *{label}* mailbox.
Highlight the most important or urgent items, who they are from, and what action may be needed.
Be direct and specific. No bullet points. Plain prose only.

Unread emails ({len(emails)} total, showing up to 15):
{email_block}

3-sentence summary:"""

    try:
        return await _call_claude(prompt)
    except Exception as exc:
        log.error("%s email summary failed: %s", label, exc)
        return f"Could not summarise {label} emails ({exc})."


# ── send helper ────────────────────────────────────────────────────────────────

async def _get_self_chat_id() -> str | None:
    """Ask the bridge for the authenticated account's self-chat ID."""
    try:
        async with httpx.AsyncClient(timeout=6.0) as c:
            r = await c.get(f"{WA_BRIDGE}/self-chat")
        if r.status_code == 200:
            return r.json().get("chat_id")
    except Exception as exc:
        log.warning("Could not fetch self-chat ID from bridge: %s", exc)

    # Fallback to env variable
    if OWNER_PHONE:
        return f"{OWNER_PHONE}@c.us"
    return None


async def _send_to_wa(message: str) -> bool:
    """Post a message to Saved Messages via the WA bridge."""
    chat_id = await _get_self_chat_id()
    if not chat_id:
        log.error("No self-chat ID available — cannot send report")
        return False

    log.info("[Report] Sending to chat_id: %s", chat_id)
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.post(f"{WA_BRIDGE}/send",
                             json={"to": chat_id, "message": message})
        if r.status_code == 200:
            log.info("Daily report sent to WA Saved Messages")
            return True
        log.error("WA bridge returned %s: %s", r.status_code, r.text[:200])
    except Exception as exc:
        log.error("WA send failed: %s", exc)
    return False


# ── public entry point ─────────────────────────────────────────────────────────

async def generate_and_send_report() -> dict:
    """
    Collect data, call Claude 3×, assemble the report, send via WA.
    Returns a status dict.
    """
    log.info("[Report] Starting daily intelligence report generation")

    # ── collect data ──────────────────────────────────────────
    wa_msgs, tasks, mep_emails, lba_emails = await _gather_all_data()

    # ── 3 Claude calls (sequential — each focused) ─────────────
    log.info("[Report] Calling Claude for Personal summary …")
    personal_summary = await _summarise_personal(wa_msgs, tasks)

    log.info("[Report] Calling Claude for MEP summary …")
    mep_summary = await _summarise_email_account("MEP OSM Solutions", mep_emails)

    log.info("[Report] Calling Claude for LBA summary …")
    lba_summary = await _summarise_email_account("LBA Tech", lba_emails)

    # ── assemble WhatsApp message ─────────────────────────────
    date_str = datetime.now(tz=timezone.utc).strftime("%A, %d %B %Y")
    overdue_count = len(tasks["overdue"])
    today_count   = len(tasks["today"])

    report = (
        f"☀️ *Daily Intelligence Report*\n"
        f"📅 {date_str}\n"
        f"📌 {overdue_count} overdue · {today_count} due today\n"
        f"\n"
        f"👤 *Personal*\n{personal_summary}\n"
        f"\n"
        f"🏢 *MEP OSM Solutions*\n{mep_summary}\n"
        f"\n"
        f"💼 *LBA Tech*\n{lba_summary}\n"
    )

    # ── send ──────────────────────────────────────────────────
    sent = await _send_to_wa(report)

    return {
        "ok":              sent,
        "report_length":   len(report),
        "wa_messages":     len(wa_msgs),
        "mep_emails":      len(mep_emails),
        "lba_emails":      len(lba_emails),
        "overdue_tasks":   overdue_count,
        "today_tasks":     today_count,
        "generated_at":    datetime.now(tz=timezone.utc).isoformat(),
    }


async def _gather_all_data():
    """Fetch all data sources concurrently-ish (sequential to avoid token races)."""
    wa_msgs    = await _fetch_wa_messages(30)
    tasks      = await _fetch_backend_tasks()
    mep_emails = await _fetch_emails(MEP_ACCOUNT, 20)
    lba_emails = await _fetch_emails(LBA_ACCOUNT, 20)
    return wa_msgs, tasks, mep_emails, lba_emails
