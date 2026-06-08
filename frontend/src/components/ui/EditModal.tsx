import { useState } from 'react'
import { useUpdateTask } from '@/hooks/useTasks'

interface Props {
  taskId:      string
  description: string
  priority:    number
  due_date?:   string | null
  start_date?: string | null
  status:      string
  onClose:     () => void
}

const PRIORITY_OPTIONS = [
  { value: 1, label: '🔴 Business / Urgent', color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
  { value: 2, label: '🟡 Medium',             color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)'  },
  { value: 3, label: '🟢 Low',                color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)'  },
]

const STATUS_OPTIONS = [
  { value: 'pending',     label: '📋 To Do' },
  { value: 'in_progress', label: '⚡ In Progress' },
]

export default function EditModal({ taskId, description, priority, due_date, start_date, status, onClose }: Props) {
  const [desc,      setDesc]      = useState(description)
  const [prio,      setPrio]      = useState(priority)
  const [due,       setDue]       = useState(due_date ?? '')
  const [start,     setStart]     = useState(start_date ?? '')
  const [stat,      setStat]      = useState(status === 'completed' ? 'pending' : status)

  const { mutateAsync, isPending } = useUpdateTask()

  async function handleSave() {
    await mutateAsync({
      id: taskId,
      payload: {
        description: desc.trim(),
        priority: prio,
        due_date:   due   || null,
        start_date: start || null,
        status: stat,
      },
    })
    onClose()
  }

  const accentColor = PRIORITY_OPTIONS.find(p => p.value === prio)?.color ?? '#a5b4fc'
  const accentBg    = PRIORITY_OPTIONS.find(p => p.value === prio)?.bg    ?? 'rgba(99,102,241,0.12)'
  const accentBorder = PRIORITY_OPTIONS.find(p => p.value === prio)?.border ?? 'rgba(99,102,241,0.35)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
           style={{ background: 'rgba(13,17,28,0.98)', border: `1px solid ${accentBorder}`,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: `1px solid ${accentBorder}`, background: accentBg }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>✏️</span>
            <span className="font-bold tracking-tight" style={{ fontSize: '14px', color: '#F1F5F9' }}>Edit Task</span>
          </div>
          <button onClick={onClose} style={{ color: '#475569', fontSize: '18px', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>✕</button>
        </div>

        <div className="flex flex-col gap-4 p-5">

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5"
                   style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Description
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              className="w-full input-base px-3 py-2.5 resize-none"
              style={{ fontSize: '13px', color: '#F1F5F9', lineHeight: 1.5 }}
              dir="auto"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold mb-2"
                   style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPrio(opt.value)}
                        className="flex-1 py-2 rounded-xl font-semibold transition-all"
                        style={{
                          fontSize: '11px',
                          background: prio === opt.value ? opt.bg : 'rgba(255,255,255,0.04)',
                          color:      prio === opt.value ? opt.color : '#475569',
                          border:     `1px solid ${prio === opt.value ? opt.border : 'rgba(255,255,255,0.07)'}`,
                          boxShadow:  prio === opt.value ? `0 0 10px ${opt.bg}` : 'none',
                        }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold mb-2"
                   style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Status
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setStat(opt.value)}
                        className="flex-1 py-2 rounded-xl font-semibold transition-all"
                        style={{
                          fontSize: '12px',
                          background: stat === opt.value ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                          color:      stat === opt.value ? '#a5b4fc' : '#475569',
                          border:     `1px solid ${stat === opt.value ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                     style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Start date
              </label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                     className="w-full input-base px-3 py-2"
                     style={{ fontSize: '12px', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                     style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Due date
              </label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)}
                     className="w-full input-base px-3 py-2"
                     style={{ fontSize: '12px', colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl font-semibold"
                    style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)',
                             color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={isPending || !desc.trim()}
                    className="flex-1 py-2.5 rounded-xl font-bold transition-all"
                    style={{
                      fontSize: '13px',
                      background: isPending ? accentBg : accentColor,
                      color: '#0B0F19',
                      border: `1px solid ${accentBorder}`,
                      boxShadow: isPending ? 'none' : `0 0 16px ${accentBg}`,
                      opacity: !desc.trim() ? 0.5 : 1,
                    }}>
              {isPending ? 'Saving…' : '✏️ Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
