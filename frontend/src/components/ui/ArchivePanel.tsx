import { useState } from 'react'
import { useArchivedTasks, useRestoreTask } from '@/hooks/useTasks'

export default function ArchivePanel() {
  const { data: tasks = [], isLoading } = useArchivedTasks()
  const { mutateAsync: restore, isPending: restoring } = useRestoreTask()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  async function handleRestore(id: string) {
    setRestoringId(id)
    try { await restore(id) } finally { setRestoringId(null) }
  }

  const PRIORITY_COLOR: Record<number, string> = {
    1: '#F87171', 2: '#FBBF24', 3: '#34D399',
  }
  const PRIORITY_LABEL: Record<number, string> = {
    1: '🔴 Business', 2: '🟡 Personal', 3: '🟢 General',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(4,7,14,0.92)' }}>
        <span style={{ fontSize: 22 }}>📦</span>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Archive</h2>
          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
            {isLoading ? 'Loading…' : `${tasks.length} archived task${tasks.length !== 1 ? 's' : ''} — nothing is ever deleted`}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: 13 }}>
            Loading archive…
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>No archived tasks yet</p>
            <p style={{ fontSize: 12, color: '#334155', margin: '4px 0 0' }}>Completed tasks will appear here</p>
          </div>
        )}

        {tasks.map(task => {
          const pc = PRIORITY_COLOR[task.priority as 1|2|3] ?? '#34D399'
          const archivedAt = task.completed_at
            ? new Date(task.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Archived'

          return (
            <div key={task.id}
                 className="glass-card rounded-xl"
                 style={{ borderLeft: `3px solid ${pc}44`, padding: '10px 14px',
                          display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Priority dot */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc,
                            flexShrink: 0, opacity: 0.7 }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', margin: 0,
                            textDecoration: 'line-through', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.description}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#334155' }}>{PRIORITY_LABEL[task.priority as 1|2|3]}</span>
                  <span style={{ fontSize: 10, color: '#334155' }}>·</span>
                  <span style={{ fontSize: 10, color: '#334155' }}>✅ {archivedAt}</span>
                  {task.source && (
                    <>
                      <span style={{ fontSize: 10, color: '#334155' }}>·</span>
                      <span style={{ fontSize: 10, color: '#334155' }}>
                        {task.source === 'whatsapp_text' ? '💬' : task.source === 'web' ? '🌐' : '📧'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Restore button */}
              <button
                onClick={() => handleRestore(task.id)}
                disabled={restoringId === task.id || restoring}
                style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700,
                  padding: '5px 10px', borderRadius: 8,
                  background: restoringId === task.id ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)',
                  color: '#93C5FD', border: '1px solid rgba(59,130,246,0.28)',
                  cursor: restoringId === task.id ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={e => { if (restoringId !== task.id) e.currentTarget.style.background = 'rgba(59,130,246,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = restoringId === task.id ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)' }}>
                {restoringId === task.id ? '…' : '↩ Restore'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
