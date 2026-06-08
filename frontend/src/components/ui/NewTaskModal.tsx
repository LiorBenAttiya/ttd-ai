import { useState, useEffect } from 'react'
import { useCreateTask } from '@/hooks/useTasks'
import { COMPANIES } from '@/data/config'
import { fetchMailboxes } from '@/services/api'

interface Props { onClose: () => void }

type PriorityType = 1 | 2 | 3

const PRIORITIES: { value: PriorityType; label: string; desc: string; color: string; icon: string }[] = [
  { value: 1, label: 'Business', desc: 'Company task', color: '#F87171', icon: '🔴' },
  { value: 2, label: 'Personal', desc: 'Personal life', color: '#FBBF24', icon: '🟡' },
  { value: 3, label: 'General',  desc: 'Other tasks',  color: '#34D399', icon: '🟢' },
]

interface RealMailbox { id: string; email: string; short_name: string; display_name: string }

export default function NewTaskModal({ onClose }: Props) {
  const [description, setDescription] = useState('')
  const [priority, setPriority]       = useState<PriorityType>(1)
  const [companyId, setCompanyId]     = useState(COMPANIES[0].id)
  const [dueDate, setDueDate]         = useState('')
  const [mailboxId, setMailboxId]     = useState('')
  const [error, setError]             = useState('')
  const [mailboxes, setMailboxes]     = useState<RealMailbox[]>([])

  const { mutateAsync, isPending } = useCreateTask()

  const selectedCompany = COMPANIES.find(c => c.id === companyId)

  // Load real mailboxes from backend
  useEffect(() => {
    fetchMailboxes().then(data => {
      setMailboxes(data)
      if (data.length > 0 && !mailboxId) setMailboxId(data[0].id)
    }).catch(() => {
      // fallback to empty if backend is down
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    setError('')
    try {
      await mutateAsync({
        description: description.trim(),
        priority,
        due_date:   dueDate || undefined,
        mailbox_id: mailboxId || undefined,
        company_id: priority === 1 ? companyId : undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create task. Is the backend running?')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md mx-4 rounded-2xl overflow-visible flex flex-col"
           style={{ maxHeight: '90vh', background: 'rgba(14,18,32,0.98)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.07)',
                      borderRadius: '16px 16px 0 0' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.7)' }} />
            <span className="font-bold tracking-tight" style={{ fontSize: '14px', color: '#F1F5F9' }}>New Task</span>
          </div>
          <button onClick={onClose} style={{ color: '#475569', fontSize: '18px', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-col gap-4 p-6 overflow-y-auto">

          {/* Description */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#64748B' }}>
              What needs to be done? *
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Describe the task… / תאר את המשימה"
                      rows={3} autoFocus
                      className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none task-desc"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.9)',
                               border: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', lineHeight: '1.6' }}
                      onFocus={e  => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                      onBlur={e   => (e.target.style.borderColor = 'rgba(99,102,241,0.2)')} />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#64748B' }}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                        className="flex flex-col items-center py-3 rounded-xl transition-all"
                        style={{
                          background: priority === p.value ? p.color + '18' : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${priority === p.value ? p.color + '66' : 'rgba(255,255,255,0.07)'}`,
                          boxShadow: priority === p.value ? `0 0 12px ${p.color}22` : 'none',
                        }}>
                  <span style={{ fontSize: '18px', marginBottom: '4px' }}>{p.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: priority === p.value ? p.color : 'rgba(148,163,184,0.7)' }}>{p.label}</span>
                  <span style={{ fontSize: '9px', color: 'rgba(100,116,139,0.5)', marginTop: '1px' }}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company selector — Business only */}
          {priority === 1 && (
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#64748B' }}>Company</label>
              <div className="flex flex-col gap-1.5">
                {COMPANIES.map(co => (
                  <button key={co.id} type="button" onClick={() => setCompanyId(co.id)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                          style={{
                            background: companyId === co.id ? co.color + '18' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${companyId === co.id ? co.color + '55' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0"
                         style={{ background: co.color, boxShadow: companyId === co.id ? `0 0 6px ${co.color}88` : 'none' }} />
                    <span className="text-sm" style={{ color: companyId === co.id ? 'rgba(226,232,240,0.95)' : 'rgba(148,163,184,0.65)' }}>
                      {co.flag}  {co.name}
                    </span>
                    {companyId === co.id && <span className="ml-auto text-xs" style={{ color: co.color }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due date + Mailbox */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#64748B' }}>Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                     className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                     style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.8)',
                              border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', colorScheme: 'dark' }} />
            </div>
            {priority === 1 && (
              <div className="flex-1" style={{ position: 'relative', zIndex: 60 }}>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#64748B' }}>Mailbox</label>
                <select value={mailboxId} onChange={e => setMailboxId(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'rgba(20,27,45,0.98)', color: 'rgba(226,232,240,0.8)',
                                 border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px',
                                 colorScheme: 'dark', position: 'relative', zIndex: 60 }}>
                  {mailboxes.length > 0 ? (
                    mailboxes.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#0e1220', color: '#e2e8f0' }}>
                        {m.short_name} — {m.email}
                      </option>
                    ))
                  ) : (
                    <option value="">Loading mailboxes…</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Company preview */}
          {priority === 1 && selectedCompany && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                 style={{ background: selectedCompany.color + '12', border: `1px solid ${selectedCompany.color}33` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedCompany.color }} />
              <span style={{ fontSize: '11px', color: selectedCompany.color }}>
                This task will be tagged as <strong>{selectedCompany.name}</strong>
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <p style={{ fontSize: '12px', color: '#F87171' }}>⚠️ {error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
                    style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl font-bold transition-all"
                    style={{ fontSize: '13px',
                             background: isPending ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.85)',
                             color: '#fff', border: '1px solid rgba(99,102,241,0.6)',
                             boxShadow: isPending ? 'none' : '0 0 16px rgba(99,102,241,0.3)' }}>
              {isPending ? 'Creating…' : 'Create Task ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
