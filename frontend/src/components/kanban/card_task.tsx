import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Task } from '@/types'
import { useArchiveTask } from '@/hooks/useTasks'
import DelayModal    from '@/components/ui/DelayModal'
import DelegateModal from '@/components/ui/DelegateModal'
import EditModal     from '@/components/ui/EditModal'

const CO_BY_MAILBOX: Record<string, { name: string; color: string; bg: string }> = {
  lbatech: { name: 'LBATech', color: '#1D4ED8', bg: '#DBEAFE' },
  mepsltn: { name: 'MEP OSM', color: '#0369A1', bg: '#E0F2FE' },
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
const PRIORITY_CONFIG: Record<number, { color: string; border: string }> = {
  1: { color: '#EF4444', border: '#F87171' },
  2: { color: '#F59E0B', border: '#FBBF24' },
  3: { color: '#22C55E', border: '#34D399' },
}

/* Map [TYPE] prefix → CSS class */
const TAG_CLASS: Record<string, string> = {
  FINANCE:  'cat-finance',
  FINANCIAL:'cat-finance',
  REPORTS:  'cat-reports',
  REPORT:   'cat-reports',
  SALES:    'cat-sales',
  HR:       'cat-hr',
  INTERNAL: 'cat-internal',
}

const DONE_COUNTDOWN_SECS   = 10
const DELETE_COUNTDOWN_SECS = 3

interface Props { task: Task; selected?: boolean; onClick: () => void }

export default function TaskCard({ task, selected, onClick }: Props) {
  const [showDelay,    setShowDelay]    = useState(false)
  const [showDelegate, setShowDelegate] = useState(false)
  const [showEdit,     setShowEdit]     = useState(false)
  const [hovered,      setHovered]      = useState(false)

  const [countdown,   setCountdown]   = useState<number | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [deleteState,     setDeleteState]     = useState<'idle' | 'sliding' | 'pending'>('idle')
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_COUNTDOWN_SECS)
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { mutateAsync: archive } = useArchiveTask()
  const pc       = PRIORITY_CONFIG[task.priority as 1|2|3] ?? PRIORITY_CONFIG[3]
  const co       = task.mailbox ? CO_BY_MAILBOX[task.mailbox.short_name] : null
  const isOverdue = task.due_status === 'overdue'

  // Parse [TYPE] prefix
  const typeMatch = task.description.match(/^\[([^\]]+)\]\s*(.+)/)
  const typeTag   = typeMatch ? typeMatch[1].toUpperCase() : null
  const cleanDesc = typeMatch ? typeMatch[2] : task.description
  const tagClass  = typeTag ? (TAG_CLASS[typeTag] ?? 'cat-default') : null

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

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (deleteState !== 'idle') return
    setDeleteState('sliding')
    setTimeout(() => {
      setDeleteState('pending')
      setDeleteCountdown(DELETE_COUNTDOWN_SECS)
      let count = DELETE_COUNTDOWN_SECS
      deleteIntervalRef.current = setInterval(() => {
        count--; setDeleteCountdown(count)
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
    setDeleteState('idle'); setDeleteCountdown(DELETE_COUNTDOWN_SECS)
  }
  useEffect(() => () => { if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current) }, [])

  if (isArchiving || task.status === 'completed' || task.status === 'archived') return null

  if (deleteState === 'pending') {
    return createPortal(
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px 14px', borderRadius: 12,
        background: '#1E293B', border: '1px solid #F87171',
        boxShadow: '0 8px 40px rgba(15,23,42,0.3)',
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: '0 0 12px 12px', background: '#F1F5F9' }}>
          <div style={{ height: '100%', borderRadius: '0 0 12px 12px', background: 'linear-gradient(90deg, #F87171, #FBBF24)', width: `${(deleteCountdown / DELETE_COUNTDOWN_SECS) * 100}%`, transition: 'width 1s linear' }} />
        </div>
        <span style={{ fontSize: 16 }}>🗑️</span>
        <span style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>Task archived</span>
        <button onClick={handleUndoDelete}
                style={{ fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', cursor: 'pointer' }}>
          ↩ Undo ({deleteCountdown}s)
        </button>
      </div>,
      document.body
    )
  }

  return (
    <>
      <div
        className={`glass-card card-p${task.priority} ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          borderLeft: `3px solid ${pc.border}`,
          cursor: 'pointer',
          opacity: countdown !== null ? 0.85 : deleteState === 'sliding' ? 0 : 1,
          transform: deleteState === 'sliding' ? 'translateX(110%)' : 'translateX(0)',
          transition: deleteState === 'sliding'
            ? 'transform 0.35s ease-in, opacity 0.35s ease-in'
            : 'opacity 300ms ease',
          overflow: 'hidden',
          background: selected ? '#EFF6FF' : '#ffffff',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
      >
        {/* Done progress bar */}
        {countdown !== null && (
          <div style={{ height: 3, background: '#E2E8F0', borderRadius: '12px 12px 0 0' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #22C55E, #3B82F6)', width: `${(countdown / DONE_COUNTDOWN_SECS) * 100}%`, transition: 'width 1s linear' }} />
          </div>
        )}

        <div style={{ padding: '10px 12px 7px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <div className={`priority-dot priority-${task.priority} ${isOverdue ? 'overdue' : ''}`} style={{ marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Category tag + description */}
              <div style={{ lineHeight: 1.45 }}>
                {tagClass && (
                  <span className={`cat-tag ${tagClass}`} style={{ marginRight: 5, verticalAlign: 'middle' }}>
                    {typeTag}
                  </span>
                )}
                <span className="task-desc" style={{ fontSize: 12, color: selected ? '#1D4ED8' : '#1E293B', fontWeight: 500, letterSpacing: '-0.01em' }}>
                  {cleanDesc}
                </span>
              </div>
            </div>
            {task.due_badge && (
              <span className={`${DUE_CLASS[task.due_status] ?? ''}`}
                    style={{ fontSize: 10, padding: '2px 7px', flexShrink: 0, whiteSpace: 'nowrap', borderRadius: 999 }}>
                {task.due_badge}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, marginLeft: 17 }}>
            <span title={task.source_label} style={{ fontSize: 12 }}>
              {SOURCE_ICON[task.source ?? 'web']}
            </span>
            {task.due_date && (
              <span style={{ fontSize: 10, color: isOverdue ? '#DC2626' : '#64748B', fontWeight: isOverdue ? 600 : 400 }}>
                {task.due_date}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {co && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, fontWeight: 600, background: co.bg, color: co.color }}>
                {co.name}
              </span>
            )}
            {task.contact && (
              <div title={task.contact.full_name}
                   style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, background: '#EFF6FF', border: `1px solid ${pc.border}44`, color: pc.color, fontSize: 9 }}>
                {task.contact.initials}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 8px', marginLeft: 17, opacity: hovered || countdown !== null ? 1 : 0, transition: 'opacity 250ms ease', pointerEvents: hovered || countdown !== null ? 'auto' : 'none' }}>
          {countdown !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#22C55E' }}>Archiving in {countdown}s…</span>
              <button onClick={undoCountdown}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', cursor: 'pointer' }}>
                ↩ Undo
              </button>
            </div>
          ) : (
            <>
              {[
                { label: '✅ Done',      bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0', onClick: startCountdown },
                { label: '✏️ Edit',      bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD', onClick: (e: React.MouseEvent) => { e.stopPropagation(); setShowEdit(true) } },
                { label: '⏰ Delay',    bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', onClick: (e: React.MouseEvent) => { e.stopPropagation(); setShowDelay(true) } },
                { label: '📤 Delegate', bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE', onClick: (e: React.MouseEvent) => { e.stopPropagation(); setShowDelegate(true) } },
              ].map(({ label, bg, color, border, onClick: act }) => (
                <button key={label} onClick={act}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: bg, color, border: `1px solid ${border}`, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'filter 150ms' }}
                        onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(.92)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}>
                  {label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Delete button */}
        {hovered && countdown === null && deleteState === 'idle' && (
          <button
            onClick={handleDeleteClick}
            title="Archive task"
            style={{ position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: 6, background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms' }}
            onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.background = '#FECACA' }}
            onMouseLeave={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2' }}>
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
