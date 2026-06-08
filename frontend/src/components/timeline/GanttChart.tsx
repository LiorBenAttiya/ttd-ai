import { useState, useMemo, useEffect } from 'react'
import type { Task } from '@/types'
import { fetchTasksList } from '@/services/api'

// ── Helpers ───────────────────────────────────────────────────
function addDays(date: Date, n: number) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
function fmt(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function fmtDay(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric' })
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString('en-GB', { month: 'short' })
}

const PRIORITY_COLOR: Record<number, string> = {
  1: 'rgba(239,68,68,0.75)',
  2: 'rgba(245,158,11,0.75)',
  3: 'rgba(52,211,153,0.75)',
}
const PRIORITY_GLOW: Record<number, string> = {
  1: 'rgba(239,68,68,0.3)',
  2: 'rgba(245,158,11,0.3)',
  3: 'rgba(52,211,153,0.3)',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'To-Do', in_progress: 'In Progress', completed: 'Done'
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'rgba(99,102,241,0.6)',
  in_progress: 'rgba(245,158,11,0.6)',
  completed: 'rgba(52,211,153,0.6)',
}

interface Props { selectedTaskId?: string; onTaskSelect: (id: string) => void }

export default function GanttChart({ selectedTaskId, onTaskSelect }: Props) {
  const [zoom, setZoom] = useState<'week' | 'month'>('week')
  const [rawTasks, setRawTasks] = useState<Task[]>([])

  useEffect(() => {
    fetchTasksList({ limit: '100' })
      .then(data => setRawTasks(data))
      .catch(() => {})
  }, [])

  // Only show tasks that have a due date
  const allTasks: Task[] = useMemo(() => rawTasks.filter(t => t.due_date), [rawTasks])

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  }, [])

  // Date range
  const spanDays = zoom === 'week' ? 14 : 30
  const rangeStart = useMemo(() => addDays(today, -3), [today])
  const rangeEnd   = useMemo(() => addDays(rangeStart, spanDays), [rangeStart, spanDays])

  // Day columns
  const days = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i <= spanDays; i++) arr.push(addDays(rangeStart, i))
    return arr
  }, [rangeStart, spanDays])

  // Position helpers (% of total range width)
  function barLeft(startDate: Date | null, dueDate: Date): number {
    const start = startDate ?? addDays(new Date(dueDate), -2)
    const offset = daysBetween(rangeStart, start)
    return Math.max(0, (offset / spanDays) * 100)
  }
  function barWidth(startDate: Date | null, dueDate: Date): number {
    const start = startDate ?? addDays(new Date(dueDate), -2)
    const dur   = Math.max(1, daysBetween(start, new Date(dueDate)))
    return Math.min((dur / spanDays) * 100, 100 - barLeft(startDate, dueDate))
  }
  function todayLeft(): number {
    return (daysBetween(rangeStart, today) / spanDays) * 100
  }

  // Group columns by month for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = []
    days.forEach(d => {
      const label = fmtMonth(d)
      const last  = groups[groups.length - 1]
      if (last && last.label === label) last.count++
      else groups.push({ label, count: 1 })
    })
    return groups
  }, [days])

  const COL_W = zoom === 'week' ? 28 : 16 // px per day column

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header: title + zoom toggle */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(14,18,32,0.5)' }}>
        <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(148,163,184,0.65)', fontSize: '9.5px' }}>
          Project Timeline
        </span>
        <div className="flex items-center rounded-full p-0.5 gap-0.5"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
          {(['week','month'] as const).map(z => (
            <button key={z} onClick={() => setZoom(z)}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium transition-all capitalize"
                    style={zoom === z
                      ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }
                      : { color: 'rgba(148,163,184,0.55)' }}>
              {z === 'week' ? '2 Weeks' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt area */}
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <div style={{ minWidth: `${180 + COL_W * (spanDays + 1)}px` }}>

          {/* Date header */}
          <div className="flex sticky top-0 z-10 flex-shrink-0"
               style={{ background: 'rgba(11,15,25,0.95)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
            {/* Row label col */}
            <div style={{ width: 180, flexShrink: 0, padding: '4px 12px' }}
                 className="flex items-end">
              <span style={{ fontSize: '9px', color: 'rgba(100,116,139,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Task
              </span>
            </div>
            {/* Month groups */}
            <div className="flex flex-col flex-1">
              <div className="flex" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{ width: g.count * COL_W, padding: '2px 4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '9px', color: 'rgba(148,163,184,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex">
                {days.map((d, i) => {
                  const isToday = daysBetween(today, d) === 0
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div key={i} style={{ width: COL_W, flexShrink: 0, textAlign: 'center', padding: '2px 0',
                                          background: isToday ? 'rgba(99,102,241,0.12)' : isWeekend ? 'rgba(255,255,255,0.015)' : undefined }}>
                      <span style={{ fontSize: '9px', color: isToday ? '#a5b4fc' : 'rgba(100,116,139,0.45)',
                                     fontWeight: isToday ? 700 : 400 }}>
                        {fmtDay(d)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Empty state */}
          {allTasks.length === 0 && (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#334155' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
              {rawTasks.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {rawTasks.length} task{rawTasks.length !== 1 ? 's' : ''} have no due date
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: '#334155' }}>
                    Open a task and set a due date to see it on the timeline
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No tasks yet</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Add tasks and set due dates to see the timeline</div>
                </>
              )}
            </div>
          )}

          {/* Task rows */}
          {allTasks.map((task, idx) => {
            const startDate = task.start_date ? new Date(task.start_date) : null
            const dueDate   = new Date(task.due_date!)
            const left  = barLeft(startDate, dueDate)
            const width = barWidth(startDate, dueDate)
            const isSelected = selectedTaskId === task.id
            const color = PRIORITY_COLOR[task.priority]
            const glow  = PRIORITY_GLOW[task.priority]

            return (
              <div key={task.id}
                   className="flex items-center cursor-pointer row-hover"
                   style={{ height: 36,
                            background: isSelected ? 'rgba(30,40,68,0.5)' : idx % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
                            borderBottom: '1px solid rgba(99,102,241,0.05)' }}
                   onClick={() => onTaskSelect(task.id)}>

                {/* Label */}
                <div style={{ width: 180, flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
                                boxShadow: `0 0 4px ${glow}` }} />
                  <span style={{ fontSize: '11px', color: 'rgba(226,232,240,0.72)', whiteSpace: 'nowrap',
                                 overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.description}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative" style={{ height: '100%' }}>
                  {/* Today line */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayLeft()}%`,
                                width: 1, background: 'rgba(99,102,241,0.4)', zIndex: 2 }} />

                  {/* Bar */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', transform: 'translateY(-50%)',
                    left: `${left}%`, width: `${Math.max(width, 3)}%`,
                    height: 18, borderRadius: 4,
                    background: color,
                    boxShadow: isSelected ? `0 0 8px ${glow}` : 'none',
                    border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                    transition: 'box-shadow 0.15s ease',
                    overflow: 'hidden',
                    zIndex: 1,
                  }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                                   whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Legend row */}
          <div className="flex items-center gap-4 px-3 py-2"
               style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            {Object.entries(STATUS_LABEL).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div style={{ width: 20, height: 8, borderRadius: 2, background: STATUS_COLOR[status] }} />
                <span style={{ fontSize: '9px', color: 'rgba(100,116,139,0.6)' }}>{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div style={{ width: 1, height: 10, background: 'rgba(99,102,241,0.5)' }} />
              <span style={{ fontSize: '9px', color: 'rgba(100,116,139,0.6)' }}>Today</span>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
