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
}

export default function RightPanel({ filters: _, selectedTaskId, onTaskSelect }: Props) {
  const [tab, setTab] = useState<RTab>('inbox')

  // ── real task data ─────────────────────────────────────────
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [tasksLoaded,  setTasksLoaded]  = useState(false)

  // ── real email data ────────────────────────────────────────
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
          try {
            const res = await fetchEmailMessages(20, email)
            all.push(...(res.messages ?? []))
          } catch { /* skip */ }
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
    <aside className="flex flex-col overflow-hidden"
           style={{ width: '35%', flexShrink: 0, background: 'rgba(11,15,25,0.4)' }}>

      {/* Tab bar */}
      <div className="flex items-center flex-shrink-0 px-2 pt-1"
           style={{ borderBottom: '1px solid rgba(99,102,241,0.1)',
                    background: 'rgba(14,18,32,0.5)' }}>
        {tabs.map(({ key, label, badge }) => (
          <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                    tab === key ? 'tab-active' : 'tab-inactive'
                  }`}
                  style={{ borderBottomColor: tab === key ? (key === 'tasks' ? '#ef4444' : '#6366f1') : 'transparent' }}>
            {label}
            {badge ? (
              <span className="px-1.5 py-0.5 rounded-full text-white font-semibold"
                    style={{ fontSize: '9px', minWidth: '16px', textAlign: 'center',
                             background: key === 'tasks' ? 'rgba(239,68,68,0.7)' : 'rgba(99,102,241,0.7)' }}>
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 ${tab === 'timeline' ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        {/* ── Inbox ── */}
        {tab === 'inbox' && (
          <div className="flex flex-col">
            {!emailsLoaded && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: 12 }}>
                Loading emails…
              </div>
            )}
            {emailsLoaded && emails.length === 0 && (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: '#334155' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No emails</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Connect a mailbox in the Feed tab</div>
              </div>
            )}
            {emails.map(email => (
              <div key={email.id} className="row-hover flex items-start gap-3 px-4 py-3 cursor-pointer"
                   style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold relative"
                     style={{ background: 'rgba(0,120,212,0.15)', border: '1px solid rgba(0,120,212,0.2)',
                              color: '#0078d4', fontSize: '11px' }}>
                  {(email.sender_name || email.sender_email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  {!email.is_read && (
                    <div className="unread-dot absolute -top-0.5 -right-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm truncate"
                          style={{ color: email.is_read ? 'rgba(148,163,184,0.5)' : 'rgba(226,232,240,0.92)',
                                   fontWeight: email.is_read ? 400 : 600 }}>
                      {email.sender_name || email.sender_email}
                    </span>
                    <span style={{ color: 'rgba(100,116,139,0.5)', fontSize: '10px', flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5"
                     style={{ color: email.is_read ? 'rgba(100,116,139,0.38)' : 'rgba(148,163,184,0.7)' }}>
                    {email.subject}
                  </p>
                  {email.account && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full font-medium"
                          style={{ fontSize: '9px', background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>
                      {email.account.split('@')[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tasks ── */}
        {tab === 'tasks' && (
          <div className="flex flex-col">
            {!tasksLoaded && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: 12 }}>
                Loading tasks…
              </div>
            )}
            {tasksLoaded && tasks.length === 0 && (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: '#334155' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No open tasks</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Import your tasks to get started</div>
              </div>
            )}
            {tasks.map(task => (
              <button key={task.id} onClick={() => onTaskSelect(task.id)}
                      className="row-hover flex items-start gap-3 px-4 py-3 text-left w-full"
                      style={{ borderBottom: '1px solid rgba(99,102,241,0.06)',
                               background: selectedTaskId === task.id ? 'rgba(30,40,68,0.6)' : undefined }}>
                <div className="flex items-center gap-2 flex-1 min-w-0 pt-0.5">
                  <div className={`priority-dot priority-${task.priority} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'rgba(226,232,240,0.8)' }}>
                      {task.description}
                    </p>
                    <p className="mt-0.5" style={{ color: 'rgba(100,116,139,0.5)', fontSize: '10px' }}>
                      {task.due_date ?? 'No date'}
                    </p>
                  </div>
                </div>
                {task.due_badge && (
                  <span className="px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
                        style={{ fontSize: '9px', background: task.due_badge_color + '18', color: task.due_badge_color }}>
                    {task.due_badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Timeline ── */}
        {tab === 'timeline' && (
          <GanttChart selectedTaskId={selectedTaskId} onTaskSelect={onTaskSelect} />
        )}
      </div>
    </aside>
  )
}
