import axios from 'axios'
import type { KanbanData, Task, DashboardStats } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Token store (in-memory)
let _token: string | null = null

export async function ensureToken(): Promise<string> {
  if (_token) return _token
  const res = await axios.post(`${BASE}/api/v1/auth/dev-token`)
  _token = res.data.access_token
  return _token!
}

function authHeader() {
  return _token ? { Authorization: `Bearer ${_token}` } : {}
}

// Global search result type
export interface GlobalSearchResult {
  id: string
  type: 'task' | 'contact' | 'mailbox' | 'email' | 'message'
  icon: string
  title: string
  subtitle: string
  priority?: number
  status?: string
  raw_id: string
  score: number
}

// Global search
export async function globalSearch(q: string): Promise<GlobalSearchResult[]> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/search`, {
    params: { q, limit: 30 },
    headers: authHeader(),
  })
  return data
}

// Tasks
export async function fetchKanban(category?: string): Promise<KanbanData> {
  await ensureToken()
  const params: Record<string, string> = { view: 'kanban' }
  if (category && category !== 'all') params.category = category
  const { data } = await axios.get(`${BASE}/api/v1/tasks`, { params, headers: authHeader() })
  return data
}

export async function fetchTasksList(params?: Record<string, string>): Promise<Task[]> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/tasks`, {
    params: { view: 'list', ...params },
    headers: authHeader(),
  })
  return data
}

export async function createTask(payload: {
  description: string
  priority: number
  due_date?: string
  start_date?: string
  mailbox_id?: string
  company_id?: string
}): Promise<Task> {
  await ensureToken()
  const { data } = await axios.post(`${BASE}/api/v1/tasks`, payload, { headers: authHeader() })
  return data
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
  await ensureToken()
  const { data } = await axios.patch(`${BASE}/api/v1/tasks/${id}`, payload, { headers: authHeader() })
  return data
}

export async function completeTask(id: string): Promise<Task> {
  await ensureToken()
  const { data } = await axios.post(`${BASE}/api/v1/tasks/${id}/complete`, {}, { headers: authHeader() })
  return data
}

export async function archiveTask(id: string): Promise<Task> {
  await ensureToken()
  const { data } = await axios.post(`${BASE}/api/v1/tasks/${id}/archive`, {}, { headers: authHeader() })
  return data
}

export async function restoreTask(id: string): Promise<Task> {
  await ensureToken()
  const { data } = await axios.post(`${BASE}/api/v1/tasks/${id}/restore`, {}, { headers: authHeader() })
  return data
}

export async function fetchArchivedTasks(): Promise<Task[]> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/tasks`, {
    params: { view: 'list', status: 'archived', limit: 200 },
    headers: authHeader(),
  })
  return Array.isArray(data) ? data : []
}

export async function deleteTask(id: string): Promise<void> {
  await ensureToken()
  await axios.delete(`${BASE}/api/v1/tasks/${id}`, { headers: authHeader() })
}

// Mailboxes
export async function fetchMailboxes() {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/mailboxes`, { headers: authHeader() })
  return Array.isArray(data) ? data : []
}

// Dashboard
export async function fetchStats(): Promise<DashboardStats> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/dashboard/stats`, { headers: authHeader() })
  return data
}

// ── WhatsApp ───────────────────────────────────────────────────
export interface WAMessageRaw {
  id:        string
  body:      string
  type:      string
  fromMe:    boolean
  timestamp: number
  hasMedia:  boolean
  duration:  number | null
}

export interface WAFeedResponse {
  status:    'ready' | 'connecting' | 'offline' | 'error'
  count?:    number
  messages?: WAMessageRaw[]
  error?:    string
}

export async function fetchWAMessages(limit = 50): Promise<WAFeedResponse> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/wa/messages`, {
    params: { limit },
    headers: authHeader(),
  })
  return data
}

export async function fetchWAStatus(): Promise<{ status: string; qr?: string }> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/wa/status`, { headers: authHeader() })
  return data
}

export async function fetchWAQR(): Promise<{ connected: boolean; qr?: string }> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/wa/qr`, { headers: authHeader() })
  return data
}

// ── Email (MS Graph) ───────────────────────────────────────────
export interface EmailMessage {
  id:              string
  subject:         string
  sender_name:     string
  sender_email:    string
  preview:         string
  received_at:     string
  is_read:         boolean
  is_flagged:      boolean
  has_attachments: boolean
  account?:        string
}

export interface EmailFeedResponse {
  connected: boolean
  count?:    number
  messages?: EmailMessage[]
  error?:    string
}

export async function fetchEmailStatus(): Promise<{ connected: boolean }> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/email/status`, { headers: authHeader() })
  return data
}

export async function fetchEmailAuthUrl(): Promise<{ auth_url: string }> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/email/auth`, { headers: authHeader() })
  return data
}

export async function fetchEmailMessages(limit = 50, account = ''): Promise<EmailFeedResponse> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/email/messages`, {
    params: { limit, account },
    headers: authHeader(),
  })
  return data
}

export async function fetchEmailAccounts(): Promise<{ accounts: { email: string; name: string }[] }> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/email/accounts`, { headers: authHeader() })
  return data
}

export interface EmailBody {
  id:              string
  subject:         string
  sender_name:     string
  sender_email:    string
  to:              string[]
  received_at:     string
  body_html:       string
  body_text:       string
  is_flagged:      boolean
  has_attachments: boolean
}

export async function fetchEmailBody(messageId: string, account = ''): Promise<EmailBody> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/email/messages/${messageId}`, {
    params: { account },
    headers: authHeader(),
  })
  return data
}

export async function renameEmailAccount(account: string, name: string): Promise<void> {
  await ensureToken()
  await axios.patch(`${BASE}/api/v1/email/accounts/rename`, null, {
    params: { account, name },
    headers: authHeader(),
  })
}

// ── AI Inbox ───────────────────────────────────────────────────
export interface AISuggestion {
  id:          string
  title:       string
  description: string
  priority:    1 | 2 | 3
  due_date:    string | null
  source_type: 'whatsapp' | 'email'
  context:     string
}

export interface AIInboxResponse {
  suggestions:  AISuggestion[]
  analyzed_at:  string
  sources: {
    wa_messages: number
    emails:      number
    accounts:    string[]
  }
}

export async function fetchAIInbox(): Promise<AIInboxResponse> {
  await ensureToken()
  const { data } = await axios.get(`${BASE}/api/v1/ai/inbox`, { headers: authHeader() })
  return data
}

export async function triggerDailyReport(): Promise<{ ok: boolean; message: string }> {
  await ensureToken()
  const { data } = await axios.post(`${BASE}/api/v1/report/trigger`, {}, { headers: authHeader() })
  return data
}

export interface ImportPreview {
  preview: true
  total: number
  skipped: number
  summary: { MEP: number; LBATECH: number; Personal: number; Other: number }
  rows: { description: string; priority: number }[]
}

export interface ImportResult {
  preview: false
  inserted: number
  skipped: number
  errors: number
}

export async function previewExcelImport(file: File): Promise<ImportPreview> {
  await ensureToken()
  const form = new FormData()
  form.append('file', file)
  const { data } = await axios.post(`${BASE}/api/v1/tasks/import?confirm=false`, form, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function confirmExcelImport(file: File): Promise<ImportResult> {
  await ensureToken()
  const form = new FormData()
  form.append('file', file)
  const { data } = await axios.post(`${BASE}/api/v1/tasks/import?confirm=true`, form, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
  })
  return data
}
