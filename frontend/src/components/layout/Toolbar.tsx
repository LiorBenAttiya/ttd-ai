import { useState, useEffect, type FormEvent } from 'react'
import type { FilterState, ViewMode, Category } from '@/types'
import { useStats } from '@/hooks/useTasks'

interface Props {
  filters: FilterState
  onViewChange: (v: ViewMode) => void
  onCategoryChange: (c: Category) => void
}

const CATEGORY_LABELS: Record<Category, string> = { all: 'All', business: '🔴 Business', personal: '🟡 Personal' }
const VIEW_LABELS: Record<ViewMode, string>      = { kanban: 'Kanban', list: 'List', timeline: 'Timeline' }

function toWeatherIcon(code: number): string {
  if (code === 113) return '☀️'
  if (code <= 116)  return '⛅'
  if (code <= 122)  return '☁️'
  if (code <= 143)  return '🌫️'
  if (code <= 185)  return '🌦️'
  if (code <= 266)  return '🌧️'
  if (code <= 374)  return '🌨️'
  return '⛈️'
}

/* ── Countdown Widget ── */
interface CountdownEvent { name: string; target: Date }

function CountdownWidget() {
  const [event, setEvent]       = useState<CountdownEvent | null>(null)
  const [remaining, setRemaining] = useState(0)    // seconds
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [dateVal, setDateVal]   = useState('')
  const [timeVal, setTimeVal]   = useState('')

  // Tick every second
  useEffect(() => {
    if (!event) return
    const t = setInterval(() => {
      const diff = Math.max(0, Math.floor((event.target.getTime() - Date.now()) / 1000))
      setRemaining(diff)
      if (diff === 0) setEvent(null)
    }, 1000)
    return () => clearInterval(t)
  }, [event])

  function handleSet(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dateVal || !timeVal) return
    const target = new Date(`${dateVal}T${timeVal}`)
    if (isNaN(target.getTime()) || target <= new Date()) return
    setEvent({ name: name.trim(), target })
    setRemaining(Math.floor((target.getTime() - Date.now()) / 1000))
    setShowForm(false)
    setName(''); setDateVal(''); setTimeVal('')
  }

  function fmt(secs: number) {
    const d = Math.floor(secs / 86400)
    const h = Math.floor((secs % 86400) / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (d > 0) return `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const isUrgent = event && remaining > 0 && remaining <= 3600   // < 1 hour
  const isCritical = event && remaining > 0 && remaining <= 600  // < 10 min

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {event ? (
        /* Active countdown */
        <div
          onClick={() => setEvent(null)}
          title="Click to clear"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            background: isCritical
              ? 'rgba(248,113,113,0.18)'
              : isUrgent
                ? 'rgba(251,191,36,0.14)'
                : 'rgba(99,102,241,0.12)',
            border: `1px solid ${isCritical ? 'rgba(248,113,113,0.5)' : isUrgent ? 'rgba(251,191,36,0.4)' : 'rgba(99,102,241,0.3)'}`,
            animation: isCritical ? 'pulse-red 1.2s ease-in-out infinite' : 'none',
            transition: 'all 300ms ease',
          }}>
          <span style={{ fontSize: 12 }}>{isCritical ? '🚨' : isUrgent ? '⚠️' : '⏱'}</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{
              fontSize: 9, fontWeight: 600, maxWidth: 90,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: isCritical ? '#FCA5A5' : isUrgent ? '#FDE68A' : '#A5B4FC',
            }}>
              {event.name}
            </span>
            <span style={{
              fontSize: 14, fontWeight: 900,
              fontFamily: '"SF Mono", "Fira Code", monospace',
              letterSpacing: '0.5px',
              color: isCritical ? '#F87171' : isUrgent ? '#FBBF24' : '#818CF8',
            }}>
              {fmt(remaining)}
            </span>
          </div>
        </div>
      ) : (
        /* Add button */
        <button
          onClick={() => setShowForm(v => !v)}
          title="Add critical countdown"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#475569', fontSize: 11, fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#818CF8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#475569' }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>⏱</span>
          <span>+ Countdown</span>
        </button>
      )}

      {/* Mini form popup */}
      {showForm && (
        <form
          onSubmit={handleSet}
          style={{
            position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
            zIndex: 999, background: 'rgba(8,12,24,0.97)',
            border: '1px solid rgba(99,102,241,0.35)', borderRadius: 12,
            padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC', marginBottom: 2 }}>
            ⏱ Set Countdown
          </div>
          <input
            autoFocus
            placeholder="Event name (e.g. Flight TLV → LHR)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7, padding: '6px 10px', color: '#CBD5E1',
              fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="date"
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7, padding: '6px 8px', color: '#CBD5E1',
                fontSize: 12, outline: 'none', colorScheme: 'dark',
              }}
            />
            <input
              type="time"
              value={timeVal}
              onChange={e => setTimeVal(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7, padding: '6px 8px', color: '#CBD5E1',
                fontSize: 12, outline: 'none', colorScheme: 'dark',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" style={{
              flex: 1, padding: '6px 0', borderRadius: 7, fontWeight: 700, fontSize: 12,
              background: 'rgba(99,102,241,0.25)', color: '#A5B4FC',
              border: '1px solid rgba(99,102,241,0.4)', cursor: 'pointer',
            }}>
              Start ⏱
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{
              padding: '6px 10px', borderRadius: 7, fontWeight: 600, fontSize: 12,
              background: 'rgba(255,255,255,0.04)', color: '#475569',
              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
            }}>
              ✕
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function Toolbar({ filters, onViewChange, onCategoryChange }: Props) {
  const { data: liveStats } = useStats()
  const { pct_complete = 0, overdue = 0, total = 0, completed = 0 } = liveStats ?? {}

  /* ── Local time (Israel) ── */
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── Tel Aviv weather ── */
  const [weather, setWeather] = useState<{ temp: string; icon: string } | null>(null)
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('https://wttr.in/Tel+Aviv?format=j1')
        const d = await r.json()
        const c = d.current_condition?.[0]
        const temp = c?.temp_C ? `${c.temp_C}°C` : ''
        const icon = toWeatherIcon(parseInt(c?.weatherCode ?? '113'))
        setWeather({ temp, icon })
      } catch { /* silent — weather is non-critical */ }
    }
    load()
    const t = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const israelTime = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(now)

  const israelDate = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(now)

  return (
    <header className="toolbar flex items-center gap-3 px-5 h-13 flex-shrink-0" style={{ height: 52 }}>

      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-2">
        <span className="font-black tracking-tighter" style={{ fontSize: '16px',
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TTD AI
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />

      {/* Category toggle */}
      <div className="flex items-center rounded-full p-0.5 gap-0.5"
           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        {(['all','business','personal'] as Category[]).map(cat => (
          <button key={cat} onClick={() => onCategoryChange(cat)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${filters.category === cat ? 'toggle-active' : 'toggle-inactive'}`}
                  style={{ fontSize: '12px' }}>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-full p-0.5 gap-0.5"
           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        {(['kanban','list','timeline'] as ViewMode[]).map(v => (
          <button key={v} onClick={() => onViewChange(v)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${filters.view === v ? 'toggle-active' : 'toggle-inactive'}`}
                  style={{ fontSize: '12px' }}>
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* ── Critical Countdown Timer ── */}
      <CountdownWidget />

      <div className="flex-1" />

      {/* Stats pills */}
      <div className="flex items-center gap-2">
        {overdue > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
               style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                        boxShadow: '0 0 10px rgba(248,113,113,0.15)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171',
                          boxShadow: '0 0 6px rgba(248,113,113,0.8)',
                          animation: 'pulse-red 1.5s ease-in-out infinite' }} />
            <span className="font-bold" style={{ fontSize: '11px', color: '#FCA5A5' }}>
              {overdue} overdue
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
             style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <span style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: 600 }}>
            {completed}/{total} done
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2.5">
        <div className="rounded-full overflow-hidden" style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.07)' }}>
          <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct_complete}%` }} />
        </div>
        <span className="font-bold tabular-nums"
              style={{ fontSize: '12px',
                       background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                       WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {pct_complete}%
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />

      {/* ── Local time + weather ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {weather && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, gap: 3 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{weather.icon}</span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{weather.temp}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <img src="https://flagcdn.com/20x15/il.png" width="20" height="15" alt="IL" style={{ borderRadius: 2 }} />
            <span style={{
              fontSize: 18, fontWeight: 900, color: '#E2E8F0',
              fontFamily: '"SF Mono", "Fira Code", monospace', letterSpacing: '0.5px',
            }}>
              {israelTime}
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{israelDate}</span>
        </div>
      </div>

    </header>
  )
}
