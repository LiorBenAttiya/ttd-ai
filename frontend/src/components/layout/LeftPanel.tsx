import { useState, useEffect } from 'react'
import type { FilterState, KanbanData } from '@/types'
import { useKanban } from '@/hooks/useTasks'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ExcelImportModal from '@/components/ui/ExcelImportModal'

interface Props {
  filters: FilterState; selectedTaskId?: string
  onTaskSelect: (id: string) => void
  onNewTask: () => void
  onSetup?: () => void
  onImport?: () => void
}

/* ── World Clocks ── */
const STORAGE_KEY = 'ttd_world_clocks'

interface ClockEntry { city: string; tz: string; tzSearch?: string }

const TZ_META: Record<string, { lat: number; lon: number }> = {
  'Europe/Warsaw':      { lat: 52.23,  lon: 21.01  },
  'Asia/Dubai':         { lat: 25.20,  lon: 55.27  },
  'America/New_York':   { lat: 40.71,  lon: -74.01 },
  'Asia/Kolkata':       { lat: 19.08,  lon: 72.88  },
  'America/Los_Angeles':{ lat: 34.05,  lon: -118.24},
  'Europe/London':      { lat: 51.51,  lon: -0.13  },
  'Asia/Tokyo':         { lat: 35.69,  lon: 139.69 },
  'Asia/Shanghai':      { lat: 31.23,  lon: 121.47 },
  'Europe/Paris':       { lat: 48.85,  lon: 2.35   },
  'America/Chicago':    { lat: 41.88,  lon: -87.63 },
  'Australia/Sydney':   { lat: -33.87, lon: 151.21 },
  'Asia/Singapore':     { lat: 1.35,   lon: 103.82 },
  'America/Sao_Paulo':  { lat: -23.55, lon: -46.63 },
  'Africa/Cairo':       { lat: 30.06,  lon: 31.25  },
  'Asia/Seoul':         { lat: 37.57,  lon: 126.98 },
  'Europe/Berlin':      { lat: 52.52,  lon: 13.40  },
  'Europe/Moscow':      { lat: 55.75,  lon: 37.62  },
  'Asia/Riyadh':        { lat: 24.69,  lon: 46.72  },
  'America/Toronto':    { lat: 43.65,  lon: -79.38 },
  'Asia/Jerusalem':     { lat: 31.78,  lon: 35.22  },
  'Europe/Istanbul':    { lat: 41.01,  lon: 28.95  },
  'Asia/Bangkok':       { lat: 13.75,  lon: 100.52 },
  'America/Mexico_City':{ lat: 19.43,  lon: -99.13 },
}
const TZ_OPTIONS = Object.keys(TZ_META)

const DEFAULT_CLOCKS: ClockEntry[] = [
  { city: 'Delhi',    tz: 'Asia/Kolkata'     },
  { city: 'Warsaw',   tz: 'Europe/Warsaw'    },
  { city: 'Dubai',    tz: 'Asia/Dubai'       },
  { city: 'New York', tz: 'America/New_York' },
]

function loadClocks(): ClockEntry[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
  return DEFAULT_CLOCKS
}

function WorldClocks() {
  const [now,    setNow]    = useState(new Date())
  const [clocks, setClocks] = useState<ClockEntry[]>(loadClocks)
  const [temps,  setTemps]  = useState<Record<string, number | null>>({})
  const [editing,setEditing]= useState<number | null>(null)
  const [draft,  setDraft]  = useState<ClockEntry>({ city: '', tz: '' })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function fetchTemps() {
      const results: Record<string, number | null> = {}
      for (const { tz } of clocks) {
        const meta = TZ_META[tz]
        if (!meta) { results[tz] = null; continue }
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${meta.lat}&longitude=${meta.lon}&current=temperature_2m&timezone=auto`)
          if (r.ok) { const d = await r.json(); results[tz] = Math.round(d.current?.temperature_2m ?? null) }
          else { results[tz] = null }
        } catch { results[tz] = null }
      }
      setTemps(results)
    }
    fetchTemps()
    const interval = setInterval(fetchTemps, 10 * 60 * 1000); return () => clearInterval(interval)
  }, [clocks])

  function saveClocks(updated: ClockEntry[]) {
    setClocks(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function commitEdit() {
    if (editing === null) return
    if (!draft.city.trim() || !draft.tz) { setEditing(null); return }
    saveClocks(clocks.map((c, i) => i === editing ? { ...draft } : c))
    setEditing(null)
  }

  return (
    <div style={{ padding: '8px 9px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#64748B', marginBottom: 5 }}>WORLD CLOCKS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {clocks.map(({ city, tz }, idx) => {
          const time = new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
          const hour = parseInt(new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', hour12: false }).format(now))
          const isDaytime = hour >= 6 && hour < 20
          const temp = temps[tz]

          if (editing === idx) {
            return (
              <div key={tz+idx} style={{ background: '#1E3A8A', borderRadius: 7, padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 3, border: '1px solid rgba(96,165,250,0.4)' }}>
                <input autoFocus value={draft.city} onChange={e => setDraft(p => ({ ...p, city: e.target.value }))}
                       onKeyDown={e => { if (e.key==='Enter') commitEdit(); if (e.key==='Escape') setEditing(null) }}
                       placeholder="City" style={{ fontSize: 9, fontWeight: 700, width: '100%', borderRadius: 4, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '2px 5px', outline: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <input value={draft.tzSearch ?? draft.tz} onChange={e => setDraft(p => ({ ...p, tzSearch: e.target.value }))}
                         placeholder="Timezone…" style={{ fontSize: 8, width: '100%', borderRadius: 4, boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#BAE6FD', padding: '2px 5px', outline: 'none' }} />
                  {(draft.tzSearch ?? '').length > 0 && (() => {
                    const q = (draft.tzSearch ?? '').toLowerCase()
                    const matches = TZ_OPTIONS.filter(t => t.toLowerCase().includes(q)).slice(0, 5)
                    if (!matches.length) return null
                    return (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0F172A', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 5, marginTop: 2, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        {matches.map(t => (
                          <div key={t} onMouseDown={e => { e.preventDefault(); setDraft(p => ({ ...p, tz: t, tzSearch: '', city: t.split('/')[1]?.replace(/_/g,' ') ?? t })) }}
                               style={{ fontSize: 8, padding: '4px 7px', cursor: 'pointer', color: '#93C5FD', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                               onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.15)')}
                               onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {t}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={commitEdit} style={{ flex: 1, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 0', background: 'rgba(34,197,94,0.2)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditing(null)} style={{ flex: 1, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 0', background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )
          }

          return (
            <div key={tz+idx} onDoubleClick={() => { setEditing(idx); setDraft({ ...clocks[idx] }) }}
                 title="Double-click to edit"
                 style={{ background: '#1E3A8A', borderRadius: 7, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'default', transition: 'opacity .15s' }}
                 onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                 onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8, color: '#93C5FD', fontWeight: 700, letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.1, fontFamily: '"SF Mono","Fira Code",monospace' }}>{time}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1 }}>{isDaytime ? '☀️' : '🌙'}</div>
                <div style={{ fontSize: 9, color: '#60A5FA', marginTop: 1 }}>{temp !== null && temp !== undefined ? `${temp}°C` : '--'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function LeftPanel({ filters, selectedTaskId, onTaskSelect, onNewTask, onImport }: Props) {
  const { data: liveData, isLoading, isError, refetch } = useKanban(filters)
  const kanban: KanbanData = (liveData && !isError) ? liveData : { todo: [], in_progress: [], done: [], counts: { todo: 0, in_progress: 0, done: 0 } }
  const [showImport, setShowImport] = useState(false)

  return (
    <section style={{ flex: 40, minWidth: 0, borderRight: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar row ── */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #E2E8F0', background: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button onClick={onNewTask}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(59,130,246,0.25)' }}>
          <i className="ti ti-plus" style={{ fontSize: 13 }} /> New Task
        </button>
        {onImport && (
          <button onClick={() => setShowImport(true)}
                  style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 7, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <i className="ti ti-table-import" style={{ fontSize: 12, marginRight: 3 }} /> Import
          </button>
        )}
      </div>

      {/* ── World Clocks ── */}
      <WorldClocks />

      {/* ── Kanban / List ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isLoading && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>Syncing tasks…</div>
        )}
        {filters.view === 'kanban' ? (
          <KanbanBoard
            todo={kanban.todo ?? []}
            inProgress={kanban.in_progress ?? []}
            done={kanban.done ?? []}
            selectedTaskId={selectedTaskId}
            onTaskSelect={onTaskSelect}
          />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...(kanban.todo ?? []), ...(kanban.in_progress ?? [])]
              .sort((a,b) => (!a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date)))
              .map(task => (
                <button key={task.id} onClick={() => onTaskSelect(task.id)}
                        className="text-left" style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div className={`priority-dot priority-${task.priority}`} />
                    <span style={{ flex: 1, fontSize: 12, color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</span>
                    {task.due_badge && (
                      <span className={`badge-${task.due_status}`} style={{ fontSize: 9, padding: '1px 6px', whiteSpace: 'nowrap' }}>{task.due_badge}</span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* ── Excel import modal ── */}
      {showImport && (
        <ExcelImportModal onClose={() => setShowImport(false)} onImported={() => { refetch(); setShowImport(false) }} />
      )}
    </section>
  )
}
