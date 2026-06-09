import { useState, useEffect, useRef } from 'react'
import type { FilterState, KanbanData } from '@/types'
import { useKanban } from '@/hooks/useTasks'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ExcelImportModal from '@/components/ui/ExcelImportModal'
import { globalSearch } from '@/services/api'
import type { GlobalSearchResult } from '@/services/api'

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
  const [now,     setNow]     = useState(new Date())
  const [clocks,  setClocks]  = useState<ClockEntry[]>(loadClocks)
  const [temps,   setTemps]   = useState<Record<string, number | null>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [draft,   setDraft]   = useState<ClockEntry>({ city: '', tz: '' })

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
    <div style={{ padding: '6px 9px 5px', borderBottom: '1px solid #E2E8F0', flexShrink: 0, background: '#fff' }}>
      {/* Single row of 4 clocks */}
      <div style={{ display: 'flex', gap: 4 }}>
        {clocks.map(({ city, tz }, idx) => {
          const time = new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
          const hour = parseInt(new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', hour12: false }).format(now))
          const isDaytime = hour >= 6 && hour < 20
          const temp = temps[tz]

          if (editing === idx) {
            return (
              <div key={tz + idx} style={{ flex: 1, background: '#1E3A8A', borderRadius: 7, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid rgba(96,165,250,0.4)' }}>
                <input autoFocus value={draft.city} onChange={e => setDraft(p => ({ ...p, city: e.target.value }))}
                       onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                       placeholder="City"
                       style={{ fontSize: 8, fontWeight: 700, width: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '1px 4px', outline: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <input value={draft.tzSearch ?? draft.tz} onChange={e => setDraft(p => ({ ...p, tzSearch: e.target.value }))}
                         placeholder="Timezone…"
                         style={{ fontSize: 7, width: '100%', borderRadius: 3, boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#BAE6FD', padding: '1px 4px', outline: 'none' }} />
                  {(draft.tzSearch ?? '').length > 0 && (() => {
                    const q = (draft.tzSearch ?? '').toLowerCase()
                    const matches = TZ_OPTIONS.filter(t => t.toLowerCase().includes(q)).slice(0, 5)
                    if (!matches.length) return null
                    return (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0F172A', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 5, marginTop: 2, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        {matches.map(t => (
                          <div key={t} onMouseDown={e => { e.preventDefault(); setDraft(p => ({ ...p, tz: t, tzSearch: '', city: t.split('/')[1]?.replace(/_/g, ' ') ?? t })) }}
                               style={{ fontSize: 8, padding: '3px 6px', cursor: 'pointer', color: '#93C5FD', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
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
                  <button onClick={commitEdit} style={{ flex: 1, fontSize: 8, fontWeight: 700, borderRadius: 3, padding: '1px 0', background: 'rgba(34,197,94,0.2)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditing(null)} style={{ flex: 1, fontSize: 8, fontWeight: 700, borderRadius: 3, padding: '1px 0', background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )
          }

          return (
            <div key={tz + idx} onDoubleClick={() => { setEditing(idx); setDraft({ ...clocks[idx] }) }}
                 title="Double-click to edit"
                 style={{ flex: 1, background: '#1E3A8A', borderRadius: 7, padding: '5px 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default', transition: 'opacity .15s', minWidth: 0 }}
                 onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                 onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: '#93C5FD', fontWeight: 700, letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city.toUpperCase()}</span>
                <span style={{ fontSize: 10, lineHeight: 1 }}>{isDaytime ? '☀️' : '🌙'}</span>
              </div>
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1, fontFamily: '"SF Mono","Fira Code",monospace', textAlign: 'center' }}>{time}</div>
              <div style={{ fontSize: 8, color: '#60A5FA', marginTop: 2 }}>{temp !== null && temp !== undefined ? `${temp}°C` : '--'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── AI Search Bar ── */
const TYPE_ICON: Record<string, string> = {
  task: 'ti-checkbox', contact: 'ti-user', email: 'ti-mail', message: 'ti-brand-whatsapp',
}
const TYPE_COLOR: Record<string, string> = {
  task: '#3B82F6', contact: '#16a34a', email: '#7C3AED', message: '#25D366',
}

function AISearchBar() {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<GlobalSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open,      setOpen]      = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function doSearch(q: string) {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setSearching(true)
    clearTimeout(debounce.current ?? undefined)
    debounce.current = setTimeout(async () => {
      try {
        const res = await globalSearch(q)
        setResults(res)
        setOpen(true)
      } catch { setResults([]) }
      setSearching(false)
    }, 280)
  }

  function handleChange(v: string) {
    setQuery(v)
    doSearch(v)
  }

  return (
    <div ref={wrapRef} style={{ padding: '7px 9px', borderBottom: '1px solid #E2E8F0', flexShrink: 0, background: '#F8FAFC', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '7px 12px', boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none', transition: 'box-shadow 150ms', borderColor: open ? '#3B82F6' : '#E2E8F0' }}>
        {/* Sparkle AI icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1"/>
              <stop offset="50%" stopColor="#3B82F6"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <path d="M8 1 L9.2 5.8 L14 7 L9.2 8.2 L8 13 L6.8 8.2 L2 7 L6.8 5.8 Z" fill="url(#sg)"/>
          <path d="M13 1 L13.6 3 L15.5 3.5 L13.6 4 L13 6 L12.4 4 L10.5 3.5 L12.4 3 Z" fill="#93C5FD" opacity="0.8"/>
        </svg>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (query) setOpen(true) }}
          placeholder="Search tasks, emails, WhatsApp, contacts…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#1E293B' }}
        />
        {searching && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5.5" stroke="#CBD5E1" strokeWidth="2"/>
            <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </svg>
        )}
        {query && !searching && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
                  style={{ color: '#CBD5E1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 9, right: 9, zIndex: 200, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 12px 40px rgba(15,23,42,0.12)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div key={i}
                 style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 100ms' }}
                 onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                 onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#fff'}>
              <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${TYPE_COLOR[r.type] ?? '#94A3B8'}18` }}>
                <i className={`ti ${TYPE_ICON[r.type] ?? 'ti-file'}`} style={{ fontSize: 12, color: TYPE_COLOR[r.type] ?? '#94A3B8' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                {r.subtitle && (
                  <div style={{ fontSize: 10, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{r.subtitle}</div>
                )}
              </div>
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: `${TYPE_COLOR[r.type] ?? '#94A3B8'}15`, color: TYPE_COLOR[r.type] ?? '#94A3B8', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>
                {r.type}
              </span>
            </div>
          ))}
        </div>
      )}
      {open && query && results.length === 0 && !searching && (
        <div style={{ position: 'absolute', top: '100%', left: 9, right: 9, zIndex: 200, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px', textAlign: 'center', boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>No results for "{query}"</div>
        </div>
      )}
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
      <div style={{ padding: '7px 9px', borderBottom: '1px solid #E2E8F0', background: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button onClick={onNewTask}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(59,130,246,0.25)' }}>
          <i className="ti ti-plus" style={{ fontSize: 12 }} /> New Task
        </button>
        {onImport && (
          <button onClick={() => setShowImport(true)}
                  style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <i className="ti ti-table-import" style={{ fontSize: 12, marginRight: 3 }} /> Import
          </button>
        )}
      </div>

      {/* ── World Clocks (single row) ── */}
      <WorldClocks />

      {/* ── AI Search ── */}
      <AISearchBar />

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
              .sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date)))
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
