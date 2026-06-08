import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Task } from '@/types'
import { useArchiveTask } from '@/hooks/useTasks'
import DelayModal    from '@/components/ui/DelayModal'
import DelegateModal from '@/components/ui/DelegateModal'
import EditModal     from '@/components/ui/EditModal'

const CO_BY_MAILBOX: Record<string, { name: string; color: string; bg: string }> = {
  lbatech:  { name: 'LBATech',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  mepsltn:  { name: 'MEP OSM',  color: '#38BDF8', bg: 'rgba(56,189,248,0.10)' },
}
const SOURCE_ICON: Record<string, string> = {
  whatsapp_text: '💬', whatsapp_voice: '🎙️',
  outlook_flag: '📧',  ai_agent: '🤖', web: '🌐',
}
const DUE_CLASS: Record<string, string> = {
  overdue:   'badge-overdue',   due_today: 'badge-due-today',
  due_soon:  'badge-due-soon',  upcoming:  'badge-upcoming',
  completed: 'badge-completed',
}
const PRIORITY_CONFIG: Record<number, { color: string; glow: string }> = {
  1: { color: '#F87171', glow: 'rgba(248,113,113,0.25)' },
  2: { color: '#FBBF24', glow: 'rgba(251,191,36,0.25)'  },
  3: { color: '#34D399', glow: 'rgba(52,211,153,0.2)'   },
}

const DONE_COUNTDOWN_SECS   = 10
const DELETE_COUNTDOWN_SECS = 3

interface Props { task: Task; selected?: boolean; onClick: () => void }

export default function TaskCard({ task, selected, onClick }: Props) {
  const [showDelay,    setShowDelay]    = useState(false)
  const [showDelegate, setShowDelegate] = useState(false)
  const [showEdit,     setShowEdit]     = useState(false)
  const [hovered,      setHovered]      = useState(false)

  // Done countdown
  const [countdown,   setCountdown]   = useState<number | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Delete with slide + undo toast
  const [deleteState,     setDeleteState]     = useState<'idle' | 'sliding' | 'pending'>('idle')
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_COUNTDOWN_SECS)
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { mutateAsync: archive } = useArchiveTask()
  const pc  = PRIORITY_CONFIG[task.priority as 1|2|3] ?? PRIORITY_CONFIG[3]
  const co  = task.mailbox ? CO_BY_MAILBOX[task.mailbox.short_name] : null
  const isOverdue = task.due_status === 'overdue'

  // Parse [TYPE] prefix added by Excel import
  const typeMatch  = task.description.match(/^\[([^\]]+)\]\s*(.+)/)
  const typeTag    = typeMatch ? typeMatch[1] : null
  const cleanDesc  = typeMatch ? typeMatch[2] : task.description

  // Done countdown
  function startCountdown(e: React.MouseEvent) {
    e.stopPropagation()
    if (countdown !== null) return
    setCountdown(DONE_COUNTDOWN_SECS)
  }
  function undoCountdown(e: React.MouseEvent) {
    e.stopPropagation()
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(null)
  }
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      setIsArchiving(true); setCountdown(null)
      archive(task.id).catch(() => setIsArchiving(false))
      return
    }
    timerRef.current = setInterval(() => setCountdown(p => p !== null ? p - 1 : null), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [countdown])

  // Delete
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (deleteState !== 'idle') return
    setDeleteState('sliding')
    setTimeout(() => {
      setDeleteState('pending')
      setDeleteCountdown(DELETE_COUNTDOWN_SECS)
      let count = DELETE_COUNTDOWN_SECS
      deleteIntervalRef.current = setInterval(() => {
        count--
        setDeleteCountdown(count)
        if (count <= 0) {
          clearInterval(deleteIntervalRef.current!)
          setIsArchiving(true)
          archive(task.id).catch(() => setIsArchiving(false))
        }
      }, 1000)
    }, 380)
  }
  function handleUndoDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current)
    setDeleteState('idle')
    setDeleteCountdown(DELETE_COUNTDOWN_SECS)
  }
  useEffect(() => () => { if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current) }, [])

  if (isArchiving || task.status === 'completed' || task.status === 'archived') return null

  // Undo toast (card is hidden)
  if (deleteState === 'pending') {
    return createPortal(
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px 14px', borderRadius: 12,
        background: 'rgba(10,14,28,0.97)',
        border: '1px solid rgba(248,113,113,0.3)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* countdown bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                      borderRadius: '0 0 12px 12px', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', borderRadius: '0 0 12px 12px',
            background: 'linear-gradient(90deg, #F87171, #FBBF24)',
            width: `${(deleteCountdown / DELETE_COUNTDOWN_SECS) * 100}%`,
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontSize: 16 }}>🗑️</span>
        <span style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 500 }}>Task archived</span>
        <button onClick={handleUndoDelete}
                style={{ fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 8,
                         background: 'rgba(248,113,113,0.15)', color: '#F87171',
                         border: '1px solid rgba(248,113,113,0.35)', cursor: 'pointer' }}>
          ↩ Undo ({deleteCountdown}s)
        </button>
      </div>,
      document.body
    )
  }

  return (
    <>
      <div
        className={`rounded-xl glass-card card-p${task.priority} ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          borderLeft: `3px solid ${selected ? pc.color : pc.color + '55'}`,
          cursor: 'pointer',
          boxShadow: hovered ? `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${pc.glow}` : undefined,
          opacity:   countdown !== null ? 0.85 : deleteState === 'sliding' ? 0 : 1,
          transform: deleteState === 'sliding' ? 'translateX(110%)' : 'translateX(0)',
          transition: deleteState === 'sliding'
            ? 'transform 0.35s ease-in, opacity 0.35s ease-in'
            : 'opacity 300ms ease',
          overflow: 'hidden',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
      >
        {/* Done progress bar */}
        {countdown !== null && (
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: '12px 12px 0 0' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #34D399, #3B82F6)',
              width: `${(countdown / DONE_COUNTDOWN_SECS) * 100}%`,
              transition: 'width 1s linear',
              boxShadow: '0 0 8px rgba(52,211,153,0.6)',
            }} />
          </div>
        )}

        <div style={{ padding: '11px 14px 8px' }}>
          <div className="flex items-start gap-2.5">
            <div className={`priority-dot priority-${task.priority} mt-1.5 flex-shrink-0 ${isOverdue ? 'overdue' : ''}`} />
            <p className="flex-1 leading-snug line-clamp-2 font-semibold task-desc"
               style={{ fontSize: '13px', color: selected ? '#F8FAFC' : '#CBD5E1', letterSpacing: '-0.01em' }}>
              {typeTag && (
                <span style={{
                  display: 'inline-block', fontSize: 9, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 4, marginRight: 5,
                  background: pc.color + '20', color: pc.color,
                  verticalAlign: 'middle', letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  {typeTag}
                </span>
              )}
              {cleanDesc}
            </p>
            {task.due_badge && (
              <span className={`flex-shrink-0 rounded-full font-bold ${DUE_CLASS[task.due_status] ?? ''}`}
                    style={{ fontSize: '10px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                {task.due_badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2.5" style={{ marginLeft: '22px' }}>
            <span title={task.source_label} style={{ fontSize: '13px' }}>
              {SOURCE_ICON[task.source ?? 'web']}
            </span>
            {task.due_date && (
              <span style={{ fontSize: '11px', color: isOverdue ? '#FCA5A5' : '#475569', fontWeight: isOverdue ? 600 : 400 }}>
                {task.due_date}
              </span>
            )}
            <div className="flex-1" />
            {co && (
              <span className="px-2 py-0.5 rounded-full font-semibold"
                    style={{ fontSize: '10px', background: co.bg, color: co.color }}>
                {co.name}
              </span>
            )}
            {task.contact && (
              <div title={task.contact.full_name}
                   className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                   style={{ background: 'rgba(59,130,246,0.2)', border: `1px solid ${pc.color}33`,
                            color: pc.color, fontSize: '9px' }}>
                {task.contact.initials}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1.5 px-3 pb-3"
             style={{ marginLeft: '22px',
                      opacity: hovered || countdown !== null ? 1 : 0.35,
                      transition: 'opacity 250ms ease',
                      pointerEvents: hovered || countdown !== null ? 'auto' : 'none' }}>
          {countdown !== null ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-bold" style={{ fontSize: '11px', color: '#34D399' }}>
                Archiving in {countdown}s…
              </span>
              <button onClick={undoCountdown}
                      className="px-2.5 py-1 rounded-lg font-bold"
                      style={{ fontSize: '11px', background: 'rgba(248,113,113,0.15)', color: '#F87171',
                               border: '1px solid rgba(248,113,113,0.3)' }}>
                ↩ Undo
              </button>
            </div>
          ) : (
            <>
              <button onClick={startCountdown}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all"
                      style={{ fontSize: '11px', background: 'rgba(52,211,153,0.12)', color: '#6EE7B7',
                               border: '1px solid rgba(52,211,153,0.25)' }}
                      onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(52,211,153,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.12)' }}>
                ✅ Done
              </button>
              <button onClick={e => { e.stopPropagation(); setShowEdit(true) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all"
                      style={{ fontSize: '11px', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                               border: '1px solid rgba(99,102,241,0.28)' }}
                      onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(99,102,241,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)' }}>
                ✏️ Edit
              </button>
              <button onClick={e => { e.stopPropagation(); setShowDelay(true) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all"
                      style={{ fontSize: '11px', background: 'rgba(251,191,36,0.12)', color: '#FDE68A',
                               border: '1px solid rgba(251,191,36,0.28)' }}
                      onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(251,191,36,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.12)' }}>
                ⏰ Delay
              </button>
              <button onClick={e => { e.stopPropagation(); setShowDelegate(true) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all"
                      style={{ fontSize: '11px', background: 'rgba(59,130,246,0.12)', color: '#93C5FD',
                               border: '1px solid rgba(59,130,246,0.28)' }}
                      onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(59,130,246,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)' }}>
                📤 Delegate
              </button>
            </>
          )}
        </div>

        {/* 🗑️ Delete — lower-right corner, hover only */}
        {hovered && countdown === null && deleteState === 'idle' && (
          <button
            onClick={handleDeleteClick}
            title="Archive task"
            style={{
              position: 'absolute', bottom: 10, right: 10,
              width: 26, height: 26, borderRadius: 7,
              background: 'rgba(248,113,113,0.10)',
              border: '1px solid rgba(248,113,113,0.22)',
              color: '#F87171', fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(248,113,113,0.28)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(248,113,113,0.3)' }}
            onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(248,113,113,0.10)'; e.currentTarget.style.boxShadow = 'none' }}>
            🗑️
          </button>
        )}
      </div>

      {showEdit     && <EditModal     taskId={task.id} description={task.description} priority={task.priority} due_date={task.due_date} start_date={task.start_date} status={task.status} onClose={() => setShowEdit(false)} />}
      {showDelay    && <DelayModal    taskId={task.id} taskDesc={task.description} currentDue={task.due_date} onClose={() => setShowDelay(false)} />}
      {showDelegate && <DelegateModal taskId={task.id} taskDesc={task.description} currentDue={task.due_date} onClose={() => setShowDelegate(false)} />}
    </>
  )
}
