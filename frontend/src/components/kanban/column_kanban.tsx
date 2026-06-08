import type { Task, TaskStatus } from '@/types'
import TaskCard from './card_task'

interface Props {
  title: string; status: TaskStatus; tasks: Task[]
  selectedTaskId?: string; onTaskSelect: (id: string) => void
}

const ACCENT: Record<string, { color: string; bg: string }> = {
  pending:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)'  },
  in_progress: { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)'  },
  completed:   { color: '#34D399', bg: 'rgba(52,211,153,0.07)'  },
}

export default function KanbanColumn({ title, status, tasks, selectedTaskId, onTaskSelect }: Props) {
  const ac = ACCENT[status] ?? ACCENT.pending
  const active = tasks.filter(t => t.status !== 'completed')

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="col-header flex items-center gap-2.5 px-4 py-3 sticky top-0 z-10">
        {/* Colored pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full"
             style={{ background: ac.bg, border: `1px solid ${ac.color}30` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ac.color, boxShadow: `0 0 6px ${ac.color}` }} />
          <span className="font-bold uppercase tracking-wider"
                style={{ fontSize: '10px', color: ac.color, letterSpacing: '0.08em' }}>
            {title}
          </span>
        </div>
        <span className="font-bold tabular-nums px-2 py-0.5 rounded-full ml-auto"
              style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#475569' }}>
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <div style={{ fontSize: '24px', opacity: 0.2 }}>
              {status === 'pending' ? '📋' : status === 'in_progress' ? '⚡' : '✅'}
            </div>
            <p style={{ fontSize: '11px', color: '#1E293B' }}>No tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task}
              selected={selectedTaskId === task.id}
              onClick={() => onTaskSelect(task.id)} />
          ))
        )}
      </div>
    </div>
  )
}
