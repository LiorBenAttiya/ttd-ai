"""
search.py — Global search across tasks, contacts, mailboxes.
Returns a unified list of results with type labels and relevance hints.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from datetime import date, datetime

from app.core.security import get_current_user
from app.db.database import get_db

router = APIRouter(prefix="/search", tags=["search"])


def _row(row) -> dict:
    return dict(row._mapping) if row else {}


@router.get("")
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(30, le=100),
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Global search across tasks, contacts, and mailboxes.
    Returns unified result list sorted by relevance (exact > starts-with > contains).
    """
    term = q.strip()
    if not term:
        return []

    pat = f"%{term}%"
    results = []

    # ── Tasks ────────────────────────────────────────────────────
    task_rows = await db.execute(text("""
        SELECT id, description, priority, status, due_date, source
        FROM tasks
        WHERE deleted_at IS NULL
          AND (description ILIKE :pat)
        ORDER BY
          CASE WHEN LOWER(description) = LOWER(:term) THEN 0
               WHEN LOWER(description) LIKE LOWER(:starts) THEN 1
               ELSE 2 END,
          created_at DESC
        LIMIT :lim
    """), {"pat": pat, "term": term, "starts": f"{term}%", "lim": limit})

    for r in task_rows.fetchall():
        d = _row(r)
        due = d.get("due_date")
        results.append({
            "id":       f"task-{d['id']}",
            "type":     "task",
            "icon":     "✅",
            "title":    d["description"],
            "subtitle": f"{d['status'].replace('_', ' ').title()} · {_fmt_date(due)}".strip(" ·"),
            "priority": d.get("priority"),
            "status":   d.get("status"),
            "raw_id":   d["id"],
            "score":    _score(term, d["description"]),
        })

    # ── Contacts ─────────────────────────────────────────────────
    contact_rows = await db.execute(text("""
        SELECT id, full_name, email, initials, avatar_url
        FROM contacts
        WHERE full_name ILIKE :pat OR email ILIKE :pat
        LIMIT :lim
    """), {"pat": pat, "lim": limit})

    for r in contact_rows.fetchall():
        d = _row(r)
        results.append({
            "id":       f"contact-{d['id']}",
            "type":     "contact",
            "icon":     "👤",
            "title":    d["full_name"] or d["email"],
            "subtitle": d.get("email") or "",
            "raw_id":   d["id"],
            "score":    _score(term, d.get("full_name", "") + " " + d.get("email", "")),
        })

    # ── Mailboxes ─────────────────────────────────────────────────
    mb_rows = await db.execute(text("""
        SELECT id, email, short_name
        FROM mailboxes
        WHERE email ILIKE :pat OR short_name ILIKE :pat
        LIMIT 5
    """), {"pat": pat})

    for r in mb_rows.fetchall():
        d = _row(r)
        results.append({
            "id":       f"mailbox-{d['id']}",
            "type":     "mailbox",
            "icon":     "📬",
            "title":    d.get("short_name") or d["email"],
            "subtitle": d["email"],
            "raw_id":   d["id"],
            "score":    _score(term, d["email"] + " " + (d.get("short_name") or "")),
        })

    # Sort by score descending (higher = more relevant)
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


def _score(term: str, text_: str) -> int:
    t = term.lower()
    s = (text_ or "").lower()
    if s == t:               return 100
    if s.startswith(t):      return 80
    words = s.split()
    if any(w == t for w in words):       return 70
    if any(w.startswith(t) for w in words): return 60
    if t in s:               return 40
    return 0


def _fmt_date(d) -> str:
    if not d:
        return ""
    if isinstance(d, (date, datetime)):
        return d.strftime("%-d %b")
    try:
        return datetime.fromisoformat(str(d)).strftime("%-d %b")
    except Exception:
        return str(d)
