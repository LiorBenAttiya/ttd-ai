import { useState, useEffect } from 'react'
import type { FilterState, KanbanData } from '@/types'
import { useKanban } from '@/hooks/useTasks'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ExcelImportModal from '@/components/ui/ExcelImportModal'

interface Props {
  filters: FilterState; selectedTaskId?: string
  onTaskSelect: (id: string) => void; onNewTask: () => void
}

/* ── World Clocks ── */
const STORAGE_KEY = 'ttd_world_clocks'

interface ClockEntry { city: string; tz: string; tzSearch?: string }

const TZ_META: Record<string, { cc: string; lat: number; lon: number }> = {
  'Europe/Warsaw':      { cc: 'pl', lat: 52.23,  lon: 21.01  },
  'Asia/Dubai':         { cc: 'ae', lat: 25.20,  lon: 55.27  },
  'America/New_York':   { cc: 'us', lat: 40.71,  lon: -74.01 },
  'Asia/Kolkata':       { cc: 'in', lat: 19.08,  lon: 72.88  },
  'America/Los_Angeles':{ cc: 'us', lat: 34.05,  lon: -118.24},
  'Europe/London':      { cc: 'gb', lat: 51.51,  lon: -0.13  },
  'Asia/Tokyo':         { cc: 'jp', lat: 35.69,  lon: 139.69 },
  'Asia/Shanghai':      { cc: 'cn', lat: 31.23,  lon: 121.47 },
  'Europe/Paris':       { cc: 'fr', lat: 48.85,  lon: 2.35   },
  'America/Chicago':    { cc: 'us', lat: 41.88,  lon: -87.63 },
  'Australia/Sydney':   { cc: 'au', lat: -33.87, lon: 151.21 },
  'Asia/Singapore':     { cc: 'sg', lat: 1.35,   lon: 103.82 },
  'America/Sao_Paulo':  { cc: 'br', lat: -23.55, lon: -46.63 },
  'Africa/Cairo':       { cc: 'eg', lat: 30.06,  lon: 31.25  },
  'Asia/Seoul':         { cc: 'kr', lat: 37.57,  lon: 126.98 },
  'Europe/Berlin':      { cc: 'de', lat: 52.52,  lon: 13.40  },
  'Europe/Moscow':      { cc: 'ru', lat: 55.75,  lon: 37.62  },
  'Asia/Riyadh':        { cc: 'sa', lat: 24.69,  lon: 46.72  },
  'America/Toronto':    { cc: 'ca', lat: 43.65,  lon: -79.38 },
  'Pacific/Auckland':   { cc: 'nz', lat: -36.87, lon: 174.77 },
  'Asia/Jerusalem':     { cc: 'il', lat: 31.78,  lon: 35.22  },
  'Europe/Istanbul':    { cc: 'tr', lat: 41.01,  lon: 28.95  },
  'Asia/Bangkok':       { cc: 'th', lat: 13.75,  lon: 100.52 },
  'America/Mexico_City':{ cc: 'mx', lat: 19.43,  lon: -99.13 },
}

const TZ_OPTIONS = Object.keys(TZ_META)

const DEFAULT_CLOCKS: ClockEntry[] = [
  { city: 'Warsaw',   tz: 'Europe/Warsaw'    },
  { city: 'Dubai',    tz: 'Asia/Dubai'       },
  { city: 'New York', tz: 'America/New_York' },
  { city: 'Mumbai',   tz: 'Asia/Kolkata'     },
]

function loadClocks(): ClockEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return DEFAULT_CLOCKS
}

function WorldClocks() {
  const [now,     setNow]     = useState(new Date())
  const [clocks,  setClocks]  = useState<ClockEntry[]>(loadClocks)
  const [temps,   setTemps]   = useState<Record<string, number | null>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [draft,   setDraft]   = useState<ClockEntry>({ city: '', tz: '' })

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch temperatures for all clocks
  useEffect(() => {
    async function fetchTemps() {
      const results: Record<string, number | null> = {}
      for (const { tz } of clocks) {
        const meta = TZ_META[tz]
        if (!meta) { results[tz] = null; continue }
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${meta.lat}&longitude=${meta.lon}&current=temperature_2m&timezone=auto`
          const r = await fetch(url)
          if (r.ok) {
            const d = await r.json()
            results[tz] = Math.round(d.current?.temperature_2m ?? null)
          } else { results[tz] = null }
        } catch { results[tz] = null }
      }
      setTemps(results)
    }
    fetchTemps()
    const interval = setInterval(fetchTemps, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [clocks])

  function saveClocks(updated: ClockEntry[]) {
    setClocks(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function startEdit(idx: number, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(idx)
    setDraft({ ...clocks[idx] })
  }

  function commitEdit() {
    if (editing === null) return
    if (!draft.city.trim() || !draft.tz) { setEditing(null); return }
    const updated = clocks.map((c, i) => i === editing ? { ...draft } : c)
    saveClocks(updated)
    setEditing(null)
  }

  return (
    <div style={{
      padding: '8px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(4,7,18,0.6)',
      flexShrink: 0,
      display: 'flex',
      gap: 6,
    }}>
      {clocks.map(({ city, tz }, idx) => {
        const meta = TZ_META[tz]
        const cc = meta?.cc ?? 'un'

        const time = new Intl.DateTimeFormat('en', {
          timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(now)

        const hour = parseInt(new Intl.DateTimeFormat('en', {
          timeZone: tz, hour: '2-digit', hour12: false,
        }).format(now))
        const isDaytime = hour >= 6 && hour < 20
        const temp = temps[tz]

        if (editing === idx) {
          return (
            <div key={tz + idx} style={{
              flex: 1, borderRadius: 10, padding: '6px 6px',
              border: '1px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.08)',
              display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
            }}>
              <input
                autoFocus
                value={draft.city}
                onChange={e => setDraft(p => ({ ...p, city: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                placeholder="City name"
                style={{
                  fontSize: 10, fontWeight: 700, width: '100%', borderRadius: 5,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#E2E8F0', padding: '3px 5px', outline: 'none',
                }}
              />
              {/* Searchable timezone picker */}
              <div style={{ position: 'relative' }}>
                <input
                  value={draft.tzSearch ?? draft.tz}
                  onChange={e => setDraft(p => ({ ...p, tzSearch: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}
                  placeholder="Search timezone…"
                  style={{
                    fontSize: 9, width: '100%', borderRadius: 5, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#94A3B8', padding: '3px 5px', outline: 'none',
                  }}
                />
                {(draft.tzSearch ?? '').length > 0 && (() => {
                  const q = (draft.tzSearch ?? '').toLowerCase()
                  const matches = TZ_OPTIONS.filter(t => t.toLowerCase().includes(q)).slice(0, 6)
                  if (!matches.length) return null
                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: '#0D1221', border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: 6, marginTop: 2, overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    }}>
                      {matches.map(t => (
                        <div key={t}
                             onMouseDown={e => {
                               e.preventDefault()
                               const cityGuess = t.split('/')[1]?.replace(/_/g, ' ') ?? t
                               setDraft(p => ({ ...p, tz: t, tzSearch: '', city: cityGuess }))
                             }}
                             style={{
                               fontSize: 9, padding: '5px 8px', cursor: 'pointer',
                               color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.04)',
                             }}
                             onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                             onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {t}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                <button onClick={commitEdit}
                        style={{ flex: 1, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: '3px 0',
                                 background: 'rgba(52,211,153,0.15)', color: '#34D399',
                                 border: '1px solid rgba(52,211,153,0.3)', cursor: 'pointer' }}>
                  ✓
                </button>
                <button onClick={() => setEditing(null)}
                        style={{ flex: 1, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: '3px 0',
                                 background: 'rgba(248,113,113,0.1)', color: '#F87171',
                                 border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            </div>
          )
        }

        return (
          <div key={tz + idx}
               onDoubleClick={e => startEdit(idx, e)}
               title="Double-click to edit"
               style={{
                 flex: 1,
                 background: 'rgba(255,255,255,0.03)',
                 borderRadius: 10,
                 padding: '7px 8px',
                 border: '1px solid rgba(255,255,255,0.06)',
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 gap: 2,
                 minWidth: 0,
                 cursor: 'default',
                 transition: 'border-color 0.15s',
               }}
               onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)')}
               onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
            {/* Flag + city */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%', justifyContent: 'center' }}>
              <img src={`https://flagcdn.com/20x15/${cc}.png`} width="20" height="15" alt={city}
                   style={{ borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#64748B', fontWeight: 700,
                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {city}
              </span>
            </div>
            {/* Time */}
            <div style={{
              fontSize: 18, fontWeight: 900, color: '#CBD5E1',
              fontFamily: '"SF Mono", "Fira Code", monospace',
              letterSpacing: '0.5px', lineHeight: 1,
            }}>
              {time}
            </div>
            {/* Day/night + temperature */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10 }}>{isDaytime ? '☀️' : '🌙'}</span>
              {temp !== null && temp !== undefined ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: isDaytime ? '#FBBF24' : '#93C5FD' }}>
                  {temp}°C
                </span>
              ) : (
                <span style={{ fontSize: 9, color: '#334155' }}>--°C</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LeftPanel({ filters, selectedTaskId, onTaskSelect, onNewTask }: Props) {
  const { data: liveData, isLoading, isError, refetch } = useKanban(filters)
  const kanban: KanbanData = (liveData && !isError) ? liveData : { todo: [], in_progress: [], done: [], counts: { todo: 0, in_progress: 0, done: 0 } }
  const [showImport, setShowImport] = useState(false)

  return (
    <aside className="panel-left panel-divider flex flex-col overflow-hidden flex-shrink-0" style={{ width: '34%' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(8,11,18,0.7)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight" style={{ fontSize: '15px', color: '#F1F5F9' }}>
            Tasks
          </span>
          {isLoading && (
            <span className="px-2 py-0.5 rounded-full font-medium"
                  style={{ fontSize: '10px', background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }}>
              syncing…
            </span>
          )}
          {!isError && !isLoading && liveData && (
            <span className="px-2 py-0.5 rounded-full font-semibold"
                  style={{ fontSize: '10px', background: 'rgba(52,211,153,0.1)', color: '#34D399' }}>
              ● live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowImport(true)}
                  className="px-2.5 py-1.5 rounded-full font-semibold transition-all"
                  style={{ fontSize: '11px', background: 'rgba(52,211,153,0.1)',
                           color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}
                  title="Import tasks from Excel">
            📥 Excel
          </button>
          <button onClick={onNewTask} className="btn-primary px-3 py-1.5 rounded-full"
                  style={{ fontSize: '12px' }}>
            + New task
          </button>
        </div>
      </div>

      {/* World Clocks */}
      <WorldClocks />

      {/* Kanban / List Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {filters.view === 'kanban' ? (
          <KanbanBoard
            todo={kanban.todo ?? []}
            inProgress={kanban.in_progress ?? []}
            done={kanban.done ?? []}
            selectedTaskId={selectedTaskId}
            onTaskSelect={onTaskSelect}
          />
        ) : (
          <div className="flex flex-col p-3 gap-1.5 overflow-y-auto flex-1">
            {[...kanban.todo ?? [], ...kanban.in_progress ?? []]
              .sort((a,b) => (!a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date)))
              .map(task => (
                <button key={task.id} onClick={() => onTaskSelect(task.id)}
                        className="text-left px-3 py-2.5 rounded-xl glass-card row-hover">
                  <div className="flex items-center gap-2.5">
                    <div className={`priority-dot priority-${task.priority}`} />
                    <span className="flex-1 truncate font-medium" style={{ fontSize: '13px', color: '#CBD5E1' }}>
                      {task.description}
                    </span>
                    {task.due_badge && (
                      <span className="rounded-full px-2 py-0.5 font-semibold"
                            style={{ fontSize: '10px', background: task.due_badge_color + '18', color: task.due_badge_color }}>
                        {task.due_badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
      {showImport && (
        <ExcelImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { refetch(); setShowImport(false) }}
        />
      )}
    </aside>
  )
}
