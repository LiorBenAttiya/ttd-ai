import { useState } from 'react'
import { useUpdateTask } from '@/hooks/useTasks'

interface Props { taskId: string; taskDesc: string; currentDue?: string; onClose: () => void }

const QUICK = [
  { label: '+1 day',   days: 1  },
  { label: '+2 days',  days: 2  },
  { label: '+3 days',  days: 3  },
  { label: '+1 week',  days: 7  },
  { label: '+2 weeks', days: 14 },
]

function addDays(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}

export default function DelayModal({ taskId, taskDesc, currentDue, onClose }: Props) {
  const [date, setDate]   = useState(currentDue ?? addDays(1))
  const [note, setNote]   = useState('')
  const { mutateAsync, isPending } = useUpdateTask()

  async function handleSave() {
    await mutateAsync({ id: taskId, payload: { due_date: date } })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
           style={{ background: 'rgba(13,17,28,0.98)', border: '1px solid rgba(251,191,36,0.3)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid rgba(251,191,36,0.15)', background: 'rgba(251,191,36,0.07)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>⏰</span>
            <span className="font-bold tracking-tight" style={{ fontSize: '14px', color: '#F1F5F9' }}>Delay Task</span>
          </div>
          <button onClick={onClose} style={{ color: '#475569', fontSize: '18px', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>✕</button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Task preview */}
          <p className="text-sm leading-snug px-3 py-2 rounded-xl"
             style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
            {taskDesc}
          </p>

          {/* Quick picks */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Quick delay
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(q => (
                <button key={q.days} type="button" onClick={() => setDate(addDays(q.days))}
                        className="px-3 py-1.5 rounded-full font-semibold transition-all"
                        style={{ fontSize: '12px',
                                 background: date === addDays(q.days) ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)',
                                 color:      date === addDays(q.days) ? '#FBBF24' : '#64748B',
                                 border:     `1px solid ${date === addDays(q.days) ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Or pick a date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                   className="w-full input-base px-3 py-2.5"
                   style={{ fontSize: '13px', colorScheme: 'dark' }} />
          </div>

          {/* Selected date preview */}
          {date && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                 style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <span style={{ fontSize: '14px' }}>📅</span>
              <span className="font-semibold" style={{ fontSize: '12px', color: '#FBBF24' }}>
                New due date: {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
            <button onClick={handleSave} disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl font-bold transition-all"
                    style={{ fontSize: '13px',
                             background: isPending ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.85)',
                             color: '#0B0F19', border: '1px solid rgba(251,191,36,0.6)',
                             boxShadow: isPending ? 'none' : '0 0 16px rgba(251,191,36,0.3)' }}>
              {isPending ? 'Saving…' : '⏰ Set new date'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
