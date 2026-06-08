import type {
  Task, KanbanData, DashboardStats, WAMessage,
  OutlookEmail, Mailbox, Contact, ApprovalItem,
} from '@/types'

// ── Companies ─────────────────────────────────────────────────
export interface Company {
  id: string
  name: string
  domain: string
  color: string        // accent color for badges
  flag?: string        // emoji flag
}

export const mockCompanies: Company[] = [
  { id: 'co1', name: 'MEP OSM Israel', domain: 'meposlm.co.il', color: '#0078d4', flag: '🇮🇱' },
  { id: 'co2', name: 'MEP OSM Poland', domain: 'meposlm.pl',    color: '#dc2626', flag: '🇵🇱' },
  { id: 'co3', name: 'MEP OSM UAE',    domain: 'meposlm.ae',    color: '#059669', flag: '🇦🇪' },
  { id: 'co4', name: 'LBATech',        domain: 'lbatech.com',   color: '#6366f1', flag: '🏢' },
  { id: 'co5', name: 'MedCode',        domain: 'medcode.co.il', color: '#0891b2', flag: '🏥' },
]

// ── Mailboxes ─────────────────────────────────────────────────
export const mockMailboxes: Mailbox[] = [
  { id: 'mb1', email: 'lior@lbatech.com',   display_name: 'LBATech',  short_name: 'lbatech',  unread_count: 5, active: true },
  { id: 'mb2', email: 'liorba@mepsltn.com', display_name: 'Mepsltn', short_name: 'mepsltn', unread_count: 3, active: true },
]

// ── Contacts ──────────────────────────────────────────────────
export const mockContacts: Contact[] = [
  { id: 'c1', full_name: 'David Cohen',   initials: 'DC', role: 'Investor',       email: 'david@vc.com' },
  { id: 'c2', full_name: 'Sarah Levi',    initials: 'SL', role: 'Legal Counsel',  email: 'sarah@law.com' },
  { id: 'c3', full_name: 'Avi Mizrachi',  initials: 'AM', role: 'CFO',            email: 'avi@mepsltn.com' },
  { id: 'c4', full_name: 'Dana Shapiro',  initials: 'DS', role: 'Operations',     email: 'dana@lbatech.com' },
  { id: 'c5', full_name: 'Roni Bar',      initials: 'RB', role: 'Sales Manager',  email: 'roni@client.com' },
]

// ── Helper ────────────────────────────────────────────────────
const today = new Date()
const d = (offset: number) => {
  const dt = new Date(today)
  dt.setDate(dt.getDate() + offset)
  return dt.toISOString().split('T')[0]
}

const PRIORITY_COLORS: Record<number, string> = { 1: '#ef4444', 2: '#f59e0b', 3: '#34d399' }
const PRIORITY_LABELS: Record<number, string> = { 1: 'Business', 2: 'Personal', 3: 'General' }
const DUE_BADGE_TEXT: Record<string, string>  = { overdue: 'Overdue', due_today: 'Due Today', due_soon: 'Due Soon', upcoming: 'Upcoming', completed: 'Completed', no_date: '' }
const DUE_BADGE_COLOR: Record<string, string> = { overdue: '#ef4444', due_today: '#f59e0b', due_soon: '#38bdf8', upcoming: '#6366f1', completed: '#34d399', no_date: '' }

function makeDueStatus(dueDate: string | undefined, status: string): string {
  if (status === 'completed') return 'completed'
  if (!dueDate) return 'no_date'
  const due   = new Date(dueDate)
  const todayMs = new Date(d(0)).getTime()
  const dueMs   = due.getTime()
  if (dueMs < todayMs) return 'overdue'
  if (dueMs === todayMs) return 'due_today'
  if (dueMs <= new Date(d(3)).getTime()) return 'due_soon'
  return 'upcoming'
}

function t(
  id: string, description: string, priority: 1|2|3,
  status: 'pending'|'in_progress'|'completed',
  dueOffset: number|undefined,
  source: Task['source'],
  mailboxIdx: 0|1,
  contactIdx?: number,
  sortOrder = 0,
  startOffset?: number,
): Task {
  const due_date   = dueOffset !== undefined ? d(dueOffset) : undefined
  const start_date = startOffset !== undefined ? d(startOffset) : undefined
  const due_status = makeDueStatus(due_date, status)
  return {
    id, description, priority, status, sort_order: sortOrder,
    priority_label:  PRIORITY_LABELS[priority],
    priority_color:  PRIORITY_COLORS[priority],
    due_date, start_date, source,
    source_label:    source === 'whatsapp_voice' ? 'Voice Note' : source === 'whatsapp_text' ? 'From WhatsApp' : source === 'outlook_flag' ? 'From Outlook' : source === 'ai_agent' ? 'AI Proposed' : 'Web',
    source_icon:     source?.startsWith('whatsapp') ? 'whatsapp' : source === 'outlook_flag' ? 'outlook' : source === 'ai_agent' ? 'ai' : 'web',
    due_status:      due_status as Task['due_status'],
    due_badge:       DUE_BADGE_TEXT[due_status] ?? '',
    due_badge_color: DUE_BADGE_COLOR[due_status] ?? '',
    mailbox:         mockMailboxes[mailboxIdx],
    contact:         contactIdx !== undefined ? mockContacts[contactIdx] : undefined,
    created_at:      new Date(Date.now() - 86400000 * 2).toISOString(),
    completed_at:    status === 'completed' ? new Date().toISOString() : undefined,
  }
}

// ── Kanban tasks ─────────────────────────────────────────────
export const mockKanban: KanbanData = {
  todo: [
    t('t1', 'Call David re: Series A investor meeting — prepare deck and financials',           1, 'pending',     0,  'whatsapp_voice', 0, 0, 0, -2),
    t('t2', 'Review NDA with legal team before signing with new tech vendor',                  1, 'pending',     1,  'outlook_flag',   0, 1, 1, -3),
    t('t3', 'Send updated cash flow forecast to board — include Q3 actuals',                   1, 'pending',     2,  'whatsapp_text',  1, 2, 2, -5),
    t('t4', 'Doctor appointment — annual checkup at Maccabi 3pm',                             2, 'pending',     3,  'web',            0, undefined, 3),
    t('t5', 'Book business class flights to NYC for tech summit',                              2, 'pending',     5,  'whatsapp_text',  0, undefined, 4),
    t('t6', 'Order new laptop for Dana — Lenovo ThinkPad X1 Carbon',                          3, 'pending',    -1,  'ai_agent',       0, 3, 5),
  ],
  in_progress: [
    t('t7', 'Q2 financial audit — coordinating with external accountants',                     1, 'in_progress',  4,  'outlook_flag',   1, 2, 0, -8),
    t('t8', 'Redesign company website — reviewing Figma mockups with design agency',          2, 'in_progress',  7,  'web',            0, undefined, 1, -10),
    t('t9', 'Renew office lease — negotiating terms with building management',                 1, 'in_progress',  6,  'whatsapp_voice', 1, undefined, 2, -4),
  ],
  done: [
    t('t10', 'Wire transfer to Warsaw supplier — confirmed with bank',                         1, 'completed', undefined, 'whatsapp_text',  1, 2, 0),
    t('t11', 'Sign employment contract with new operations manager',                           1, 'completed', undefined, 'outlook_flag',   0, 3, 1),
    t('t12', 'Submit VAT return for Q1 — filed successfully',                                  1, 'completed', undefined, 'web',            1, 2, 2),
  ],
  counts: { todo: 6, in_progress: 3, done: 3 },
}

// ── Dashboard stats ───────────────────────────────────────────
export const mockStats: DashboardStats = {
  total: 12, pending: 6, in_progress: 3, completed: 3, overdue: 1, pct_complete: 25,
}

// ── WhatsApp messages ─────────────────────────────────────────
export const mockWAMessages: WAMessage[] = [
  { id: 'w1', direction: 'inbound',  body: 'Lior, when can we schedule the call about the investment?',   sent_at: new Date(Date.now()-3600000).toISOString(),   contact: mockContacts[0] },
  { id: 'w2', direction: 'outbound', body: 'Tomorrow at 10am works for me. I will prepare the deck.',     sent_at: new Date(Date.now()-3500000).toISOString() },
  { id: 'w3', direction: 'inbound',  body: 'Perfect. Can you also send the Q2 financials beforehand?',    sent_at: new Date(Date.now()-3400000).toISOString(),   contact: mockContacts[0] },
  { id: 'w4', direction: 'inbound',  body: 'Lior the NDA is ready for your review. I sent it to your Outlook.', sent_at: new Date(Date.now()-7200000).toISOString(), contact: mockContacts[1] },
  { id: 'w5', direction: 'inbound',  body: 'Budget update — we need to discuss Q3 projections urgently.', sent_at: new Date(Date.now()-18000000).toISOString(),  contact: mockContacts[2] },
  { id: 'w6', direction: 'outbound', body: 'Got it. Let us set up a call for Thursday.',                  sent_at: new Date(Date.now()-17000000).toISOString() },
]

// ── Outlook inbox ─────────────────────────────────────────────
export const mockOutlookInbox: OutlookEmail[] = [
  { id: 'e1', subject: 'RE: Series A Preperation Launch Plan',     sender_name: 'David Cohen',  sender_email: 'david@vc.com',   received_at: new Date(Date.now()-1800000).toISOString(),  is_read: false, flag_status: 'flagged',    preview: 'Please find attached the updated term sheet...' },
  { id: 'e2', subject: 'Meething Report — Q2 Board Summary',       sender_name: 'Sarah Levi',   sender_email: 'sarah@law.com',  received_at: new Date(Date.now()-7200000).toISOString(),  is_read: false, flag_status: 'notFlagged', preview: 'Following our board meeting yesterday...' },
  { id: 'e3', subject: 'Client Feedback — System Implementation',  sender_name: 'Avi Mizrachi', sender_email: 'avi@mepsltn.com',received_at: new Date(Date.now()-14400000).toISOString(), is_read: true,  flag_status: 'flagged',    preview: 'The client has reviewed the demo and...' },
  { id: 'e4', subject: 'Client Feedback — Portal Access Issue',    sender_name: 'Roni Bar',     sender_email: 'roni@client.com',received_at: new Date(Date.now()-86400000).toISOString(), is_read: true,  flag_status: 'complete',   preview: 'Users are reporting they cannot login to...' },
]

// ── Approval queue ────────────────────────────────────────────
export const mockApprovals: ApprovalItem[] = [
  {
    id: 'a1', confidence: 0.89, status: 'proposed',
    created_at: new Date(Date.now()-600000).toISOString(),
    proposed_task: { description: 'Follow up with David on Q2 financials', due_date: d(1), priority: 1, source: 'ai_agent' },
  },
  {
    id: 'a2', confidence: 0.81, status: 'proposed',
    created_at: new Date(Date.now()-1200000).toISOString(),
    proposed_task: { description: 'Order office supplies before end of month', due_date: d(4), priority: 3, source: 'ai_agent' },
  },
]
