import { useState, useEffect } from 'react'
import type { FilterState } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import GanttChart from '@/components/timeline/GanttChart'
import { fetchTasksList, fetchEmailMessages, fetchEmailAccounts } from '@/services/api'
import type { Task } from '@/types'
import type { EmailMessage } from '@/services/api'

type RTab = 'inbox' | 'tasks' | 'timeline'

interface Props {
  filters: FilterState; selectedTaskId?: string; onTaskSelect: (id: string) => void
  onSetup?: () => void; onNavChange?: (nav: string) => void
}

/* ── Daily Summary data (static scaffold — swap with real hook when available) ── */
const SUMMARY_ITEMS = [
  { icon: 'ti-checkbox',         color: '#22C55E', label: 'Tasks completed today',  value: '—' },
  { icon: 'ti-clock-exclamation',color: '#EF4444', label: 'Overdue items',          value: '—' },
  { icon: 'ti-mail',             color: '#3B82F6', label: 'Unread emails',          value: '—' },
  { icon: 'ti-message-circle-2', color: '#25D366', label: 'WhatsApp messages',      value: '—' },
]

// Quick actions defined inline (need access to callbacks)

export default function RightPanel({ filters: _, selectedTaskId, onTaskSelect, onSetup, onNavChange }: Props) {
  const [tab, setTab] = useState<RTab>('inbox')

  const [tasks,        setTasks]        = useState<Task[]>([])
  const [tasksLoaded,  setTasksLoaded]  = useState(false)
  const [emails,       setEmails]       = useState<EmailMessage[]>([])
  const [emailsLoaded, setEmailsLoaded] = useState(false)

  const overdue = tasks.filter(t => t.due_status === 'overdue').length
  const unread  = emails.filter(e => !e.is_read).length

  useEffect(() => {
    fetchTasksList({ status: 'pending', limit: '50' })
      .then(data => { setTasks(data); setTasksLoaded(true) })
      .catch(() => setTasksLoaded(true))
  }, [])

  useEffect(() => {
    async function loadEmails() {
      try {
        const { accounts } = await fetchEmailAccounts()
        if (!accounts.length) { setEmailsLoaded(true); return }
        const all: EmailMessage[] = []
        for (const { email } of accounts) {
          try { const res = await fetchEmailMessages(20, email); all.push(...(res.messages ?? [])) }
          catch { /* skip */ }
        }
        all.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
        setEmails(all.slice(0, 30))
      } catch { /* ignore */ }
      setEmailsLoaded(true)
    }
    loadEmails()
  }, [])

  const tabs: { key: RTab; label: string; badge?: number }[] = [
    { key: 'inbox',    label: 'Inbox',    badge: unread  || undefined },
    { key: 'tasks',    label: 'Tasks',    badge: overdue || undefined },
    { key: 'timeline', label: 'Timeline' },
  ]

  return (
    <aside style={{ flex: 28, minWidth: 260, maxWidth: 380, flexShrink: 0, background: '#F1F5F9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Daily Summary card ── */}
      <div style={{ background: '#1E3A8A', padding: '10px 12px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#93C5FD', marginBottom: 7 }}>DAILY SUMMARY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {SUMMARY_ITEMS.map(({ icon, color, label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 14, color }} />
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 8, color: '#93C5FD', lineHeight: 1.3, marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', flexShrink: 0, paddingLeft: 4 }}>
        {tabs.map(({ key, label, badge }) => (
          <button key={key} onClick={() => setTab(key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 11px', fontSize: 11, fontWeight: tab === key ? 600 : 400, cursor: 'pointer', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #3B82F6' : '2px solid transparent', color: tab === key ? '#1D4ED8' : '#64748B', transition: 'color 150ms, border-color 150ms' }}>
            {label}
            {badge ? (
              <span style={{ fontSize: 9, minWidth: 16, textAlign: 'center', padding: '1px 5px', borderRadius: 999, background: key === 'tasks' ? '#FEE2E2' : '#DBEAFE', color: key === 'tasks' ? '#DC2626' : '#1D4ED8', fontWeight: 700 }}>{badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: tab === 'timeline' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Inbox */}
        {tab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!emailsLoaded && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Loading emails…</div>
            )}
            {emailsLoaded && emails.length === 0 && (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No emails</div>
                <div style={{ fontSize: 11, marginTop: 4, color: '#94A3B8' }}>Connect a mailbox in the Feed tab</div>
              </div>
            )}
            {emails.map(email => (
              <div key={email.id} className="row-hover" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, position: 'relative', background: '#DBEAFE', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 11 }}>
                  {(email.sender_name || email.sender_email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  {!email.is_read && (
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', border: '1.5px solid #F8FAFC' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 12, color: email.is_read ? '#94A3B8' : '#1E293B', fontWeight: email.is_read ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email.sender_name || email.sender_email}
                    </span>
                    <span style={{ color: '#94A3B8', fontSize: 10, flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: email.is_read ? '#CBD5E1' : '#64748B', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.subject}
                  </p>
                  {email.account && (
                    <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 6px', borderRadius: 999, fontSize: 9, background: '#EDE9FE', color: '#5B21B6', fontWeight: 600 }}>
                      {email.account.split('@')[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks */}
        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!tasksLoaded && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Loading tasks…</div>
            )}
            {tasksLoaded && tasks.length === 0 && (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No open tasks</div>
                <div style={{ fontSize: 11, marginTop: 4, color: '#94A3B8' }}>Import tasks to get started</div>
              </div>
            )}
            {tasks.map(task => (
              <button key={task.id} onClick={() => onTaskSelect(task.id)}
                      className="row-hover text-left"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderBottom: '1px solid #F1F5F9', width: '100%', background: selectedTaskId === task.id ? '#EFF6FF' : 'transparent', border: 'none', cursor: 'pointer' }}>
                <div className={`priority-dot priority-${task.priority}`} style={{ marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {task.description}
                  </p>
                  <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, margin: '2px 0 0' }}>{task.due_date ?? 'No date'}</p>
                </div>
                {task.due_badge && (
                  <span className={`badge-${task.due_status}`} style={{ fontSize: 9, padding: '2px 7px', flexShrink: 0, marginTop: 2 }}>
                    {task.due_badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        {tab === 'timeline' && (
          <GanttChart selectedTaskId={selectedTaskId} onTaskSelect={onTaskSelect} />
        )}
      </div>


    </aside>
  )
}
