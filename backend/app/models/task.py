from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from enum import IntEnum


class Priority(IntEnum):
    BUSINESS = 1
    PERSONAL = 2
    GENERAL  = 3


class TaskStatus(str):
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    ARCHIVED    = "archived"


class DueStatus(str):
    OVERDUE   = "overdue"
    DUE_TODAY = "due_today"
    DUE_SOON  = "due_soon"
    UPCOMING  = "upcoming"
    COMPLETED = "completed"
    NO_DATE   = "no_date"


class TaskSource(str):
    WHATSAPP_TEXT  = "whatsapp_text"
    WHATSAPP_VOICE = "whatsapp_voice"
    WEB            = "web"
    OUTLOOK_FLAG   = "outlook_flag"
    AI_AGENT       = "ai_agent"


# ── Request models ────────────────────────────────────────────
class TaskCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    priority: Priority = Priority.GENERAL
    mailbox_id: Optional[str] = None
    contact_id: Optional[str] = None


class TaskUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    priority: Optional[Priority] = None
    status: Optional[str] = None
    mailbox_id: Optional[str] = None
    contact_id: Optional[str] = None
    sort_order: Optional[int] = None


class TaskReorderItem(BaseModel):
    id: str
    status: str
    sort_order: int


# ── Response models ───────────────────────────────────────────
PRIORITY_COLORS = {1: "#ef4444", 2: "#f59e0b", 3: "#34d399"}
PRIORITY_LABELS = {1: "Business", 2: "Personal", 3: "General"}
SOURCE_ICONS    = {
    "whatsapp_text":  "whatsapp",
    "whatsapp_voice": "whatsapp",
    "web":            "web",
    "outlook_flag":   "outlook",
    "ai_agent":       "ai",
}
SOURCE_LABELS   = {
    "whatsapp_text":  "From WhatsApp",
    "whatsapp_voice": "Voice Note",
    "web":            "Web",
    "outlook_flag":   "From Outlook",
    "ai_agent":       "AI Proposed",
}
DUE_BADGE_TEXT   = {
    "overdue":   "Overdue",
    "due_today": "Due Today",
    "due_soon":  "Due Soon",
    "upcoming":  "Upcoming",
    "completed": "Completed",
    "no_date":   "",
}
DUE_BADGE_COLOR  = {
    "overdue":   "#ef4444",
    "due_today": "#f59e0b",
    "due_soon":  "#38bdf8",
    "upcoming":  "#6366f1",
    "completed": "#34d399",
    "no_date":   "",
}


class ContactSummary(BaseModel):
    id: str
    full_name: str
    avatar_url: Optional[str] = None
    initials: str


class MailboxSummary(BaseModel):
    id: str
    short_name: str
    email: str


class TaskResponse(BaseModel):
    id: str
    description: str
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    priority: int
    priority_label: str
    priority_color: str
    status: str
    due_status: str
    due_badge: str
    due_badge_color: str
    source: Optional[str] = None
    source_label: Optional[str] = None
    source_icon: Optional[str] = None
    sort_order: int
    mailbox: Optional[MailboxSummary] = None
    contact: Optional[ContactSummary] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class KanbanResponse(BaseModel):
    todo: list[TaskResponse]
    in_progress: list[TaskResponse]
    done: list[TaskResponse]
    counts: dict[str, int]
