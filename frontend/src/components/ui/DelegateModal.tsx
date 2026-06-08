import { useState } from 'react'
import { COMPANIES } from '@/data/config'

interface Props {
  taskId: string
  taskDesc: string
  currentDue?: string
  onClose: () => void
}

function addDays(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}

export default function DelegateModal({ taskId, taskDesc, currentDue, onClose }: Props) {
  const [emails, setEmails] = useState<string[]>([''])
  const [dueDate, setDueDate] = useState(currentDue ?? addDays(2))
  const [note, setNote]       = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  function addEmailRow() { setEmails(e => [...e, '']) }
  function updateEmail(i: number, v: string) { setEmails(e => e.map((x, j) => j === i ? v : x)) }
  function removeEmail(i: number) { setEmails(e => e.filter((_, j) => j !== i)) }

  const validEmails = emails.filter(e => e.trim().includes('@'))

  async function handleSend() {
    if (!validEmails.length) return
    setSending(true)
    // In production: POST /api/v1/tasks/{id}/delegate with {emails, due_date, note}
    // For now: simulate send
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    setSent(true)
    setTimeout(onClose, 1500)
  }

  const QUICK_DAYS = [{ label: '+1 day', d: 1 }, { label: '+2 days', d: 2 }, { label: '+3 days', d: 3 }, { label: '+1 week', d: 7 }]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
           style={{ background: 'rgba(13,17,28,0.98)', border: '1px solid rgba(59,130,246,0.3)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid rgba(59,130,246,0.12)', background: 'rgba(59,130,246,0.07)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>📤</span>
            <span className="font-bold tracking-tight" style={{ fontSize: '14px', color: '#F1F5F9' }}>Delegate Task</span>
          </div>
          <button onClick={onClose} style={{ color: '#475569', fontSize: '18px', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>✕</button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Task preview */}
          <p className="px-3 py-2 rounded-xl"
             style={{ fontSize: '12px', color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {taskDesc}
          </p>

          {/* Email addresses */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Delegate to (email addresses)
            </label>
            <div className="flex flex-col gap-2">
              {emails.map((em, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="email" value={em} placeholder={`email${i + 1}@example.com`}
                         onChange={e => updateEmail(i, e.target.value)}
                         className="flex-1 input-base px-3 py-2.5"
                         style={{ fontSize: '13px' }} />
                  {emails.length > 1 && (
                    <button onClick={() => removeEmail(i)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)' }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addEmailRow}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                      style={{ border: '1px dashed rgba(59,130,246,0.25)', color: 'rgba(59,130,246,0.6)', fontSize: '12px', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.color = '#60A5FA' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; e.currentTarget.style.color = 'rgba(59,130,246,0.6)' }}>
                ＋ Add another recipient
              </button>
            </div>
          </div>

          {/* Due date for delegates */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Due date for delegates
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_DAYS.map(q => (
                <button key={q.d} type="button" onClick={() => setDueDate(addDays(q.d))}
                        className="px-2.5 py-1 rounded-full font-semibold transition-all"
                        style={{ fontSize: '11px',
                                 background: dueDate === addDays(q.d) ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                 color:      dueDate === addDays(q.d) ? '#60A5FA' : '#64748B',
                                 border:     `1px solid ${dueDate === addDays(q.d) ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                  {q.label}
                </button>
              ))}
            </div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                   className="w-full input-base px-3 py-2"
                   style={{ fontSize: '13px', colorScheme: 'dark' }} />
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Message to recipients (optional)
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Please handle this by the due date. Let me know if you have questions."
                      rows={2}
                      className="w-full input-base px-3 py-2.5 resize-none"
                      style={{ fontSize: '12px' }} />
          </div>

          {/* Email preview */}
          {validEmails.length > 0 && dueDate && (
            <div className="px-3 py-2.5 rounded-xl"
                 style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
              <p className="font-semibold mb-1" style={{ fontSize: '11px', color: '#60A5FA' }}>Email will be sent to:</p>
              {validEmails.map(e => (
                <p key={e} style={{ fontSize: '12px', color: '#CBD5E1' }}>📧 {e}</p>
              ))}
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                Subject: "Task delegated to you — due {new Date(dueDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}"
              </p>
            </div>
          )}

          {/* Success */}
          {sent && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                 style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span className="font-semibold" style={{ fontSize: '13px', color: '#34D399' }}>
                Delegation emails sent!
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
                    style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}>
              Cancel
            </button>
            <button onClick={handleSend}
                    disabled={sending || sent || !validEmails.length}
                    className="flex-1 py-2.5 rounded-xl font-bold transition-all"
                    style={{ fontSize: '13px',
                             background: sent ? 'rgba(52,211,153,0.2)' : validEmails.length ? 'rgba(59,130,246,0.85)' : 'rgba(59,130,246,0.3)',
                             color: sent ? '#34D399' : '#fff',
                             border: `1px solid ${sent ? 'rgba(52,211,153,0.4)' : 'rgba(59,130,246,0.6)'}`,
                             boxShadow: validEmails.length && !sent ? '0 0 16px rgba(59,130,246,0.25)' : 'none' }}>
              {sending ? 'Sending…' : sent ? '✅ Sent!' : `📤 Delegate to ${validEmails.length} recipient${validEmails.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
