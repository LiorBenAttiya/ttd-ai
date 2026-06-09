import { useState, useEffect, useRef, type FormEvent } from 'react'
import type { FilterState, ViewMode, Category } from '@/types'
import { useStats } from '@/hooks/useTasks'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Props {
  filters: FilterState
  onViewChange: (v: ViewMode) => void
  onCategoryChange: (c: Category) => void
  onNewTask?: () => void
  onSetup?: () => void
}

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

type ServiceStatus = 'online' | 'offline' | 'checking'
interface Services { backend: ServiceStatus; wa: ServiceStatus; db: ServiceStatus }
const DOT_COLOR: Record<ServiceStatus, string> = {
  online: '#22C55E', offline: '#EF4444', checking: '#F59E0B',
}

interface CountdownEvent { name: string; target: Date }

/* ── Beep sound via Web Audio API ── */
function playBeep(ctx: AudioContext, freq = 880, dur = 0.25) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type      = 'sine'
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + dur)
}

/* ── Countdown Alert Modal ── */
function CountdownAlert({ name, onClose }: { name: string; onClose: () => void }) {
  const audioRef   = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioRef.current = ctx

    // Pattern: 3 fast beeps every 1.2s
    function beepPattern() {
      playBeep(ctx, 880, 0.18)
      setTimeout(() => playBeep(ctx, 1100, 0.18), 220)
      setTimeout(() => playBeep(ctx, 1320, 0.28), 440)
    }
    beepPattern()
    intervalRef.current = setInterval(beepPattern, 1200)

    // Auto-stop after 10s
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      onClose()
    }, 10000)

    return () => {
      clearInterval(intervalRef.current!)
      clearTimeout(timeoutRef.current!)
      ctx.close()
    }
  }, [onClose])

  function stop() {
    clearInterval(intervalRef.current!)
    clearTimeout(timeoutRef.current!)
    audioRef.current?.close()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: '0 24px 80px rgba(15,23,42,0.25)', minWidth: 320, animation: 'alertPulse 0.6s ease-in-out infinite alternate' }}>
        <style>{`@keyframes alertPulse{from{box-shadow:0 24px 80px rgba(239,68,68,0.2)}to{box-shadow:0 24px 80px rgba(239,68,68,0.5),0 0 0 8px rgba(239,68,68,0.08)}}`}</style>
        <div style={{ fontSize: 48, marginBottom: 14, animation: 'spin 0.5s linear infinite' }}>⏰</div>
        <style>{`@keyframes spin{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}`}</style>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>Time's Up!</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 22 }}>"{name}" has ended</div>
        <button onClick={stop}
                style={{ padding: '11px 32px', borderRadius: 12, background: '#EF4444', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}>
          Stop Alarm
        </button>
        <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 10 }}>Auto-stops in 10 seconds</div>
      </div>
    </div>
  )
}

function CountdownWidget() {
  const [event,     setEvent]     = useState<CountdownEvent | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [showForm,  setShowForm]  = useState(false)
  const [name,      setName]      = useState('')
  const [dateVal,   setDateVal]   = useState('')
  const [timeVal,   setTimeVal]   = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertName, setAlertName] = useState('')
  const firedRef = useRef(false)

  useEffect(() => {
    if (!event) return
    const t = setInterval(() => {
      const diff = Math.max(0, Math.floor((event.target.getTime() - Date.now()) / 1000))
      setRemaining(diff)
      if (diff === 0 && !firedRef.current) {
        firedRef.current = true
        setAlertName(event.name)
        setShowAlert(true)
        setEvent(null)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [event])

  function handleSet(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dateVal || !timeVal) return
    const target = new Date(`${dateVal}T${timeVal}`)
    if (isNaN(target.getTime()) || target <= new Date()) return
    firedRef.current = false
    setEvent({ name: name.trim(), target })
    setRemaining(Math.floor((target.getTime() - Date.now()) / 1000))
    setShowForm(false); setName(''); setDateVal(''); setTimeVal('')
  }

  function fmt(secs: number) {
    const d = Math.floor(secs / 86400)
    const h = Math.floor((secs % 86400) / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (d > 0) return `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const isUrgent   = event && remaining > 0 && remaining <= 3600
  const isCritical = event && remaining > 0 && remaining <= 600

  return (
    <>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {event ? (
          <div onClick={() => setEvent(null)} title="Click to clear"
               style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                 background: isCritical ? 'rgba(239,68,68,0.2)' : isUrgent ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.15)',
                 border: `1px solid ${isCritical ? 'rgba(239,68,68,0.5)' : isUrgent ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.25)'}` }}>
            <span style={{ fontSize: 12 }}>{isCritical ? '🚨' : isUrgent ? '⚠️' : '⏱'}</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#BAE6FD', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: '"SF Mono","Fira Code",monospace', letterSpacing: '0.5px' }}>{fmt(remaining)}</span>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
            <span style={{ fontSize: 14 }}>⏱</span><span>+ Countdown</span>
          </button>
        )}
        {showForm && (
          <form onSubmit={handleSet} style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', zIndex: 999,
            background: '#1E3A8A', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 8px 32px rgba(15,23,42,0.4)', minWidth: 220 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#93C5FD', marginBottom: 2 }}>⏱ Set Countdown</div>
            <input autoFocus placeholder="Event name" value={name} onChange={e => setName(e.target.value)}
                   style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}
                     style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }} />
              <input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)}
                     style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="submit" style={{ flex: 1, padding: '6px 0', borderRadius: 6, fontWeight: 700, fontSize: 12, background: 'rgba(96,165,250,0.25)', color: '#BAE6FD', border: '1px solid rgba(96,165,250,0.4)', cursor: 'pointer' }}>Start ⏱</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '6px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>✕</button>
            </div>
          </form>
        )}
      </div>

      {showAlert && (
        <CountdownAlert
          name={alertName || 'Countdown'}
          onClose={() => { setShowAlert(false); firedRef.current = false }}
        />
      )}
    </>
  )
}

/* ── Notifications Panel ── */
function NotificationsPanel({ overdue, onClose }: { overdue: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [onClose])

  return (
    <div ref={ref} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 999, width: 300, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 12px 40px rgba(15,23,42,0.15)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ background: '#1E3A8A', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Notifications</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
      {overdue > 0 ? (
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-clock-exclamation" style={{ fontSize: 14, color: '#EF4444' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{overdue} overdue task{overdue > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Review and update due dates</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🔔</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>No new notifications</div>
        </div>
      )}
    </div>
  )
}

export default function Toolbar({ filters, onViewChange, onCategoryChange, onSetup }: Props) {
  const { data: liveStats } = useStats()
  const { pct_complete = 0, overdue = 0, total = 0, completed = 0 } = liveStats ?? {}

  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  const [weather, setWeather] = useState<{ temp: string; icon: string } | null>(null)
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('https://wttr.in/Tel+Aviv?format=j1')
        const d = await r.json()
        const c = d.current_condition?.[0]
        setWeather({ temp: c?.temp_C ? `${c.temp_C}°C` : '', icon: toWeatherIcon(parseInt(c?.weatherCode ?? '113')) })
      } catch { /* silent */ }
    }
    load(); const t = setInterval(load, 30 * 60 * 1000); return () => clearInterval(t)
  }, [])

  const [services, setServices] = useState<Services>({ backend: 'checking', wa: 'checking', db: 'checking' })
  const checkDone = useRef(false)
  useEffect(() => {
    if (checkDone.current) return; checkDone.current = true
    async function check() {
      try {
        const r = await axios.get(`${BASE}/health`, { timeout: 6000 })
        const d = r.data
        setServices({ backend: 'online', wa: d.wa_bridge === 'connected' ? 'online' : 'offline', db: d.database === 'connected' ? 'online' : 'offline' })
      } catch { setServices({ backend: 'offline', wa: 'offline', db: 'offline' }) }
    }
    check(); const t = setInterval(check, 60_000); return () => clearInterval(t)
  }, [])

  const [showNotifs, setShowNotifs] = useState(false)

  const israelTime = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  const israelDate = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'short' }).format(now)
  const allLive    = services.backend === 'online' && services.db === 'online'

  return (
    <>
      {/* ── Main navy header ── */}
      <header style={{ background: '#1E3A8A', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(15,23,42,0.2)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 52, flexShrink: 0, position: 'relative' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA' }} />
          <span style={{ color: '#93C5FD', fontSize: 14, fontWeight: 700, letterSpacing: '.02em' }}>TTD AI</span>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', alignItems: 'center', borderRadius: 20, padding: '2px 3px', gap: 2, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {(['all','business','personal'] as Category[]).map(cat => (
            <button key={cat} onClick={() => onCategoryChange(cat)}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all ${filters.category === cat ? 'toggle-active' : 'toggle-inactive'}`}
                    style={{ fontSize: 11 }}>
              {cat === 'all' ? 'All' : cat === 'business' ? 'Business' : 'Personal'}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', borderRadius: 20, padding: '2px 3px', gap: 2, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {(['kanban','list','timeline'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => onViewChange(v)}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all ${filters.view === v ? 'toggle-active' : 'toggle-inactive'}`}
                    style={{ fontSize: 11, textTransform: 'capitalize' }}>
              {v}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Centered countdown */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <CountdownWidget />
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        {overdue > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FCA5A5' }}>{overdue} overdue</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize: 11, color: '#BAE6FD', fontWeight: 600 }}>{completed}/{total}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>done</span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct_complete}%` }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#BAE6FD', minWidth: 32 }}>{pct_complete}%</span>
        </div>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)' }} />

        {/* TLV clock + weather */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {weather && <span style={{ fontSize: 16 }}>{weather.icon}</span>}
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6, padding: '3px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 800, fontFamily: '"SF Mono","Fira Code",monospace', letterSpacing: '0.5px', lineHeight: 1.2 }}>{israelTime}</div>
            <div style={{ fontSize: 9, color: '#93C5FD', letterSpacing: '.03em' }}>{weather ? `TLV · ${weather.temp}` : israelDate}</div>
          </div>
        </div>

        {/* Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: allLive ? '#22C55E' : '#EF4444' }} />
          <span style={{ fontSize: 10, color: '#BAE6FD', fontWeight: 500 }}>{allLive ? 'All systems live' : 'Checking…'}</span>
        </div>

        {/* Bell notifications */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifs(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
            <i className="ti ti-bell" style={{ fontSize: 19, color: showNotifs ? '#fff' : '#93C5FD' }} />
            {overdue > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#EF4444', border: '2px solid #1E3A8A', fontSize: 7, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {overdue > 9 ? '9+' : overdue}
              </span>
            )}
          </button>
          {showNotifs && <NotificationsPanel overdue={overdue} onClose={() => setShowNotifs(false)} />}
        </div>

      </header>

      {/* ── Service status bar ── */}
      <div style={{ background: '#162d6e', padding: '3px 14px 3px 78px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { label: 'WhatsApp', status: services.wa },
          { label: 'Outlook',  status: services.backend },
          { label: 'Database', status: services.db },
          { label: 'SAP B1',   status: 'checking' as ServiceStatus },
        ].map(({ label, status }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_COLOR[status] }} />
            <span style={{ fontSize: 9, color: '#93C5FD', fontWeight: 500 }}>
              {label}{status === 'checking' ? ' syncing…' : ''}
            </span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#60A5FA' }}>Last sync: just now</span>
      </div>
    </>
  )
}
