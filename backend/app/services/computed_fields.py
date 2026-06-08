"""
Computes due_status, due_badge, priority_color, source_icon etc.
from raw DB row values. Called by every task response serializer.
"""
from datetime import date, timedelta
from typing import Optional
from app.models.task import (
    PRIORITY_COLORS, PRIORITY_LABELS,
    SOURCE_ICONS, SOURCE_LABELS,
    DUE_BADGE_TEXT, DUE_BADGE_COLOR,
)


def compute_due_status(
    due_date: Optional[date],
    status: str,
) -> str:
    if status == "completed":
        return "completed"
    if due_date is None:
        return "no_date"
    today = date.today()
    if due_date < today:
        return "overdue"
    if due_date == today:
        return "due_today"
    if due_date <= today + timedelta(days=3):
        return "due_soon"
    return "upcoming"


def enrich_task(row: dict) -> dict:
    """Add all computed display fields to a raw task dict."""
    due_status = compute_due_status(row.get("due_date"), row.get("status", "pending"))
    priority   = row.get("priority", 3)
    source     = row.get("source", "web")
    return {
        **row,
        "due_status":      due_status,
        "due_badge":       DUE_BADGE_TEXT.get(due_status, ""),
        "due_badge_color": DUE_BADGE_COLOR.get(due_status, ""),
        "priority_label":  PRIORITY_LABELS.get(priority, "General"),
        "priority_color":  PRIORITY_COLORS.get(priority, "#34d399"),
        "source_label":    SOURCE_LABELS.get(source, source),
        "source_icon":     SOURCE_ICONS.get(source, "web"),
    }
