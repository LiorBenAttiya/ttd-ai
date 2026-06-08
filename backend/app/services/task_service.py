"""
task_service.py — All task DB operations using SQLAlchemy async + raw SQL.
Every query returns dicts. Computed display fields are added by enrich_task().
"""
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import uuid4
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.computed_fields import enrich_task

log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────
def _row_to_dict(row) -> dict:
    return dict(row._mapping) if row else {}


async def _fetch_mailbox(db: AsyncSession, mailbox_id: Optional[str]) -> Optional[dict]:
    if not mailbox_id:
        return None
    r = await db.execute(
        text("SELECT id, email, short_name FROM mailboxes WHERE id = :id"),
        {"id": mailbox_id}
    )
    row = r.fetchone()
    return _row_to_dict(row) if row else None


async def _fetch_contact(db: AsyncSession, contact_id: Optional[str]) -> Optional[dict]:
    if not contact_id:
        return None
    r = await db.execute(
        text("SELECT id, full_name, avatar_url, initials FROM contacts WHERE id = :id"),
        {"id": contact_id}
    )
    row = r.fetchone()
    return _row_to_dict(row) if row else None


async def _enrich(db: AsyncSession, row: dict) -> dict:
    mailbox = await _fetch_mailbox(db, row.get("mailbox_id"))
    contact = await _fetch_contact(db, row.get("contact_id"))
    enriched = enrich_task(row)
    enriched["mailbox"] = mailbox
    enriched["contact"] = contact
    # Serialise date/datetime to str
    for k, v in enriched.items():
        if isinstance(v, (date, datetime)):
            enriched[k] = v.isoformat()
    return enriched


# ── List tasks ────────────────────────────────────────────────
async def list_tasks(
    db: AsyncSession,
    status: Optional[str] = None,
    priority: Optional[int] = None,
    category: Optional[str] = None,   # business|personal|all
    due_status: Optional[str] = None,
    mailbox_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict]:
    wheres = ["deleted_at IS NULL"]
    params: dict = {"limit": limit, "offset": offset}

    if status:
        wheres.append("status = :status"); params["status"] = status
    if priority:
        wheres.append("priority = :priority"); params["priority"] = priority
    if category == "business":
        wheres.append("priority = 1")
    elif category == "personal":
        wheres.append("priority = 2")
    if mailbox_id:
        wheres.append("mailbox_id = :mailbox_id"); params["mailbox_id"] = mailbox_id
    if search:
        wheres.append("description ILIKE :search"); params["search"] = f"%{search}%"

    sql = f"""
        SELECT id, description, due_date, start_date, priority, status,
               source, sort_order, mailbox_id, contact_id, created_at, completed_at
        FROM tasks
        WHERE {' AND '.join(wheres)}
        ORDER BY sort_order ASC, created_at DESC
        LIMIT :limit OFFSET :offset
    """
    result = await db.execute(text(sql), params)
    rows = [_row_to_dict(r) for r in result.fetchall()]

    enriched = []
    for row in rows:
        e = await _enrich(db, row)
        # Filter by due_status after computing it
        if due_status and e.get("due_status") != due_status:
            continue
        enriched.append(e)
    return enriched


async def list_tasks_kanban(db: AsyncSession, category: Optional[str] = None) -> dict:
    all_tasks = await list_tasks(db, category=category)
    todo       = [t for t in all_tasks if t["status"] == "pending"]
    in_prog    = [t for t in all_tasks if t["status"] == "in_progress"]
    done       = sorted(
        [t for t in all_tasks if t["status"] == "completed"],
        key=lambda t: t.get("completed_at") or t.get("created_at") or "",
        reverse=True
    )[:10]
    return {
        "todo": todo, "in_progress": in_prog, "done": done,
        "counts": {"todo": len(todo), "in_progress": len(in_prog), "done": len(done)},
    }


# ── Get single task ───────────────────────────────────────────
async def get_task(db: AsyncSession, task_id: str) -> Optional[dict]:
    r = await db.execute(
        text("""SELECT id, description, due_date, start_date, priority, status,
                       source, sort_order, mailbox_id, contact_id, created_at, completed_at
                FROM tasks WHERE id = :id AND deleted_at IS NULL"""),
        {"id": task_id}
    )
    row = r.fetchone()
    if not row:
        return None
    return await _enrich(db, _row_to_dict(row))


# ── Create task ───────────────────────────────────────────────
async def create_task(
    db: AsyncSession,
    description: str,
    priority: int = 3,
    due_date: Optional[date] = None,
    start_date: Optional[date] = None,
    source: str = "web",
    mailbox_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    company_id: Optional[str] = None,
) -> dict:
    task_id = str(uuid4())
    await db.execute(
        text("""
            INSERT INTO tasks (id, description, priority, due_date, start_date,
                               source, mailbox_id, contact_id, status, sort_order)
            VALUES (:id, :desc, :priority, :due_date, :start_date,
                    :source, :mailbox_id, :contact_id, 'pending', 0)
        """),
        {
            "id": task_id, "desc": description, "priority": priority,
            "due_date": due_date, "start_date": start_date,
            "source": source, "mailbox_id": mailbox_id, "contact_id": contact_id,
        }
    )
    await db.commit()
    # Log activity
    await db.execute(
        text("INSERT INTO task_activity (task_id, action) VALUES (:tid, 'created')"),
        {"tid": task_id}
    )
    await db.commit()
    return await get_task(db, task_id)


# ── Update task ───────────────────────────────────────────────
async def update_task(db: AsyncSession, task_id: str, updates: dict) -> Optional[dict]:
    allowed = {"description", "priority", "due_date", "start_date", "status",
               "mailbox_id", "contact_id", "sort_order"}
    sets = []
    params: dict = {"id": task_id}
    for k, v in updates.items():
        if k in allowed and v is not None:
            sets.append(f"{k} = :{k}")
            params[k] = v
    if not sets:
        return await get_task(db, task_id)

    # Set completed_at when marking complete
    if updates.get("status") == "completed":
        sets.append("completed_at = NOW()")

    await db.execute(
        text(f"UPDATE tasks SET {', '.join(sets)} WHERE id = :id AND deleted_at IS NULL"),
        params
    )
    await db.commit()
    await db.execute(
        text("INSERT INTO task_activity (task_id, action, detail) VALUES (:tid, 'updated', :detail::jsonb)"),
        {"tid": task_id, "detail": '{"fields": "' + ','.join(updates.keys()) + '"}'}
    )
    await db.commit()
    return await get_task(db, task_id)


# ── Soft delete ───────────────────────────────────────────────
async def delete_task(db: AsyncSession, task_id: str) -> bool:
    r = await db.execute(
        text("UPDATE tasks SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL"),
        {"id": task_id}
    )
    await db.commit()
    return r.rowcount > 0


# ── Complete task ─────────────────────────────────────────────
async def complete_task(db: AsyncSession, task_id: str) -> Optional[dict]:
    return await update_task(db, task_id, {"status": "completed"})


# ── Batch reorder (Kanban drag) ───────────────────────────────
async def reorder_tasks(db: AsyncSession, items: list[dict]) -> bool:
    for item in items:
        await db.execute(
            text("UPDATE tasks SET status = :status, sort_order = :sort_order WHERE id = :id"),
            {"id": item["id"], "status": item["status"], "sort_order": item["sort_order"]}
        )
    await db.commit()
    return True


# ── Dashboard stats ───────────────────────────────────────────
async def get_stats(db: AsyncSession) -> dict:
    r = await db.execute(
        text("""
            SELECT
              COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
              COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL) AS pending,
              COUNT(*) FILTER (WHERE status = 'in_progress' AND deleted_at IS NULL) AS in_progress,
              COUNT(*) FILTER (WHERE status = 'completed' AND deleted_at IS NULL) AS completed,
              COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed' AND deleted_at IS NULL) AS overdue
            FROM tasks
        """)
    )
    row = _row_to_dict(r.fetchone())
    total     = int(row.get("total", 0))
    completed = int(row.get("completed", 0))
    pct       = round((completed / total * 100) if total > 0 else 0)
    return {
        "total": total,
        "pending": int(row.get("pending", 0)),
        "in_progress": int(row.get("in_progress", 0)),
        "completed": completed,
        "overdue": int(row.get("overdue", 0)),
        "pct_complete": pct,
    }


# ── Task messages (WA thread) ─────────────────────────────────
async def get_task_messages(db: AsyncSession, task_id: str) -> list[dict]:
    r = await db.execute(
        text("""SELECT id, direction, body, sent_at FROM task_messages
                WHERE task_id = :tid ORDER BY sent_at ASC LIMIT 50"""),
        {"tid": task_id}
    )
    rows = [_row_to_dict(row) for row in r.fetchall()]
    for row in rows:
        if isinstance(row.get("sent_at"), datetime):
            row["sent_at"] = row["sent_at"].isoformat()
    return rows


# ── Task activity feed ────────────────────────────────────────
async def get_task_activity(db: AsyncSession, task_id: str) -> list[dict]:
    r = await db.execute(
        text("""SELECT id, action, detail, created_at FROM task_activity
                WHERE task_id = :tid ORDER BY created_at DESC LIMIT 20"""),
        {"tid": task_id}
    )
    rows = [_row_to_dict(row) for row in r.fetchall()]
    for row in rows:
        if isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat()
    return rows
