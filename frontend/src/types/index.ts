// ── Core enums ────────────────────────────────────────────────
export type Priority    = 1 | 2 | 3
export type TaskStatus  = 'pending' | 'in_progress' | 'completed' | 'archived'
export type DueStatus   = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'completed' | 'no_date'
export type TaskSource  = 'whatsapp_text' | 'whatsapp_voice' | 'web' | 'outlook_flag' | 'ai_agent'
export type ViewMode    = 'kanban' | 'list' | 'timeline'
export type Category    = 'all' | 'business' | 'personal'

// ── Sub-models ────────────────────────────────────────────────
export interface ContactSummary {
  id: string
  full_name: string
  avatar_url?: string
  initials: string
}

export interface MailboxSummary {
  id: string
  short_name: string
  email: string
}

// ── Task ──────────────────────────────────────────────────────
export interface Task {
  id: string
  description: string
  due_date?: string        // YYYY-MM-DD
  start_date?: string      // YYYY-MM-DD — for Gantt
  priority: Priority
  priority_label: string
  priority_color: string
  status: TaskStatus
  due_status: DueStatus
  due_badge: string
  due_badge_color: string
  source?: TaskSource
  source_label?: string
  source_icon?: 'whatsapp' | 'outlook' | 'web' | 'voice' | 'ai'
  sort_order: number
  mailbox?: MailboxSummary
  contact?: ContactSummary
  created_at: string
  completed_at?: string
}

export interface KanbanData {
  todo: Task[]
  in_progress: Task[]
  done: Task[]
  counts: { todo: number; in_progress: number; done: number }
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  pct_complete: number
}

// ── WhatsApp messages ─────────────────────────────────────────
export interface WAMessage {
  id: string
  task_id?: string
  direction: 'inbound' | 'outbound'
  body: string
  sent_at: string
  contact?: ContactSummary
}

// ── Outlook ───────────────────────────────────────────────────
export interface OutlookEmail {
  id: string
  subject: string
  sender_name: string
  sender_email: string
  received_at: string
  is_read: boolean
  flag_status: 'flagged' | 'complete' | 'notFlagged'
  preview?: string
}

export interface Mailbox {
  id: string
  email: string
  display_name: string
  short_name: string
  unread_count: number
  last_synced_at?: string
  active: boolean
}

// ── Contacts ──────────────────────────────────────────────────
export interface Contact extends ContactSummary {
  company_id?: string
  email?: string
  phone?: string
  whatsapp?: string
  role?: string
}

// ── Timeline ──────────────────────────────────────────────────
export interface TimelineItem extends Task {
  start_date: string
  due_date: string
}

// ── Approval queue ────────────────────────────────────────────
export interface ApprovalItem {
  id: string
  proposed_task: Partial<Task>
  confidence: number
  wa_message_id?: string
  status: 'proposed' | 'approved' | 'edited' | 'rejected' | 'expired'
  created_at: string
}

// ── UI state ──────────────────────────────────────────────────
export interface FilterState {
  view: ViewMode
  category: Category
  status?: TaskStatus
  due_status?: DueStatus
  mailbox_id?: string
  due_before?: string
  due_after?: string
}
