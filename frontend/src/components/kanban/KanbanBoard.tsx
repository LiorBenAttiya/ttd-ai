import { useState } from 'react'
import type { Task } from '@/types'
import { updateTask, completeTask } from '@/services/api'
import { useQueryClient } from '@tanstack/react-query'
import TaskCard from './card_task'

interface Props {
  todo:        Task[]
  inProgress:  Task[]
  done:        Task[]
  selectedTaskId?: string
  onTaskSelect: (id: string) => void
}

interface DragState  { taskId: string; fromStatus: string }
interface PendingDrop { taskId: string; task: Task }

/* compact read-only card for Done column */
function DoneCard({ task }: { task: Task }) {
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 10,
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      opacity: 0.8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#16a34a', flexShrink: 0, marginTop: 1 }}>&#10003;</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, color: '#64748B', fontWeight: 500,
            margin: 0, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{task.description}</p>
          {task.due_date && (
            <span style={{ fontSize: 10, color: '#334155', marginTop: 3, display: 'block' }}>
              {task.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ColHeader({ title, count, color, bg, dropHint }: {
  title: string; count: number; color: string; bg: string; dropHint?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', flexShrink: 0,
      background: bg,
      borderBottom: `1px solid ${color}30`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.04em' }}>
          {title}
        </span>
      </div>
      <span style={{
        marginLeft: 'auto', fontSize: 11, fontWeight: 700,
        color, background: `${color}20`,
        padding: '1px 8px', borderRadius: 10,
      }}>{count}</span>
      {dropHint && (
        <span style={{ fontSize: 9, color: '#94A3B8', fontStyle: 'italic' }}>drag here</span>
      )}
    </div>
  )
}

export default function KanbanBoard({ todo, inProgress, done, selectedTaskId, onTaskSelect }: Props) {
  const qc = useQueryClient()
  const [drag,        setDrag]        = useState<DragState | null>(null)
  const [overCol,     setOverCol]     = useState<string | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [dueVal,      setDueVal]      = useState('')
  const [moving,      setMoving]      = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  function onDragStart(taskId: string, fromStatus: string) {
    setDrag({ taskId, fromStatus })
  }

  function onDragOver(e: React.DragEvent, col: string) {
    e.preventDefault()
    setOverCol(col)
  }

  function onDragLeave(e: React.DragEvent) {
    /* only clear when leaving the column container itself */
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setOverCol(null)
    }
  }

  async function onDrop(e: React.DragEvent, toStatus: string) {
    e.preventDefault()
    setOverCol(null)
    if (!drag || drag.fromStatus === toStatus) { setDrag(null); return }

    const allTasks = [...todo, ...inProgress, ...done]
    const task = allTasks.find(t => t.id === drag.taskId)
    if (!task) { setDrag(null); return }

    if (toStatus === 'in_progress') {
      setPendingDrop({ taskId: drag.taskId, task })
      setDueVal(task.due_date ?? '')
    } else if (toStatus === 'completed') {
      setMoving(true)
      await completeTask(drag.taskId).catch(console.error)
      setMoving(false)
      invalidate()
    } else if (toStatus === 'pending' && drag.fromStatus === 'in_progress') {
      /* move back to To Do */
      setMoving(true)
      await updateTask(drag.taskId, { status: 'pending' } as any).catch(console.error)
      setMoving(false)
      invalidate()
    }
    setDrag(null)
  }

  async function confirmDrop() {
    if (!pendingDrop || moving) return
    setMoving(true)
    await updateTask(pendingDrop.taskId, {
      status: 'in_progress',
      ...(dueVal ? { due_date: dueVal } : {}),
    } as any).catch(console.error)
    setMoving(false)
    invalidate()
    setPendingDrop(null)
    setDueVal('')
  }

  /* column highlight style when dragging over */
  function colWrap(col: string): React.CSSProperties {
    const active = overCol === col
    return {
      borderRadius: 10, overflow: 'hidden',
      border: active ? '1px solid #3B82F6' : '1px solid #E2E8F0',
      background: active ? 'rgba(59,130,246,0.04)' : '#fff',
      display: 'flex', flexDirection: 'column',
      transition: 'border 0.15s, background 0.15s',
      flexShrink: 0,
    }
  }

  /* approx height: 3 cards @ ~88px + header ~44px = ~308px */
  const COL_H = 308

  return (
    <>
      <div style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, overflow: 'hidden',
        gap: 8, padding: '8px 10px',
      }}>

        {/* ── TO DO ── */}
        <div style={{ ...colWrap('pending'), flex: 1, minHeight: 80 }}
             onDragOver={e => onDragOver(e, 'pending')}
             onDragLeave={onDragLeave}
             onDrop={e => onDrop(e, 'pending')}>
          <ColHeader title="To Do" count={todo.length} color="#DC2626" bg="#FEF2F2" dropHint={drag?.fromStatus === 'in_progress'} />
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {todo.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: 12 }}>Backlog is empty</p>
            ) : todo.map(task => (
              <div key={task.id} draggable onDragStart={() => onDragStart(task.id, 'pending')}
                   style={{ cursor: 'grab', opacity: drag?.taskId === task.id ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                <TaskCard task={task} selected={selectedTaskId === task.id} onClick={() => onTaskSelect(task.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── IN PROGRESS ── */}
        <div style={{ ...colWrap('in_progress'), flex: 1, minHeight: 80 }}
             onDragOver={e => onDragOver(e, 'in_progress')}
             onDragLeave={onDragLeave}
             onDrop={e => onDrop(e, 'in_progress')}>
          <ColHeader title="In Progress" count={inProgress.length} color="#D97706" bg="#FFFBEB" dropHint={drag?.fromStatus === 'pending'} />
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {inProgress.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: 12 }}>Drag a task here to start</p>
            ) : inProgress.map(task => (
              <div key={task.id} draggable onDragStart={() => onDragStart(task.id, 'in_progress')}
                   style={{ cursor: 'grab', opacity: drag?.taskId === task.id ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                <TaskCard task={task} selected={selectedTaskId === task.id} onClick={() => onTaskSelect(task.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── DONE ── */}
        <div style={{ ...colWrap('completed'), flex: 1, minHeight: 80 }}
             onDragOver={e => onDragOver(e, 'completed')}
             onDragLeave={onDragLeave}
             onDrop={e => onDrop(e, 'completed')}>
          <ColHeader title="Done" count={Math.min(done.length, 10)} color="#16a34a" bg="#F0FDF4" dropHint={drag?.fromStatus === 'in_progress'} />
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {done.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: 12 }}>No completed tasks yet</p>
            ) : done.slice(0, 10).map(task => (
              <DoneCard key={task.id} task={task} />
            ))}
          </div>
        </div>

      </div>

      {/* ── Due date popup on drop to In Progress ── */}
      {pendingDrop && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setPendingDrop(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'rgba(8,12,28,0.98)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 16, padding: '22px 24px', width: 320,
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>&#9889;</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FDE68A' }}>Moving to In Progress</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>
              {pendingDrop.task.description}
            </p>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
            }}>
              Due Date (optional)
            </div>
            <input type="date" value={dueVal} onChange={e => setDueVal(e.target.value)}
                   style={{
                     width: '100%', boxSizing: 'border-box',
                     background: 'rgba(255,255,255,0.05)',
                     border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: 8, padding: '8px 12px', color: '#CBD5E1',
                     fontSize: 13, outline: 'none', colorScheme: 'dark', marginBottom: 16,
                   }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmDrop} disabled={moving} style={{
                flex: 1, padding: '9px 0', borderRadius: 9,
                fontWeight: 700, fontSize: 13, cursor: moving ? 'wait' : 'pointer',
                background: 'rgba(251,191,36,0.2)', color: '#FDE68A',
                border: '1px solid rgba(251,191,36,0.4)',
              }}>
                {moving ? 'Moving...' : 'Start Working'}
              </button>
              <button onClick={() => setPendingDrop(null)} style={{
                padding: '9px 14px', borderRadius: 9, fontWeight: 600, fontSize: 13,
                background: 'rgba(255,255,255,0.04)', color: '#475569',
                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
