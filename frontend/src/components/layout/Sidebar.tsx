import { useState, useEffect } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Props {
  onNewTask: () => void
  onSetup: () => void
  onImport?: () => void
  activeView: string
  onViewChange: (view: string) => void
}

const NAV = [
  { icon: '\u{1F4CB}', label: 'Tasks',    view: 'tasks',    color: '#3B82F6' },
  { icon: '\u{1F4AC}', label: 'WhatsApp', view: 'whatsapp', color: '#25D366' },
  { icon: '\u{1F4E7}', label: 'Outlook',  view: 'outlook',  color: '#0078D4' },
  { icon: '\u{1F4C5}', label: 'Calendar', view: 'calendar', color: '#8B5CF6' },
  { icon: '\u{1F4E6}', label: 'Archive',  view: 'archive',  color: '#F59E0B' },
]

type ServiceStatus = 'online' | 'offline' | 'checking'

interface Services {
  backend: ServiceStatus
  wa:      ServiceStatus
  db:      ServiceStatus
}

const STATUS_COLOR: Record<ServiceStatus, string> = {
  online:   '#34D399',
  offline:  '#F87171',
  checking: '#FBBF24',
}
const STATUS_GLOW: Record<ServiceStatus, string> = {
  online:   'rgba(52,211,153,0.6)',
  offline:  'rgba(248,113,113,0.6)',
  checking: 'rgba(251,191,36,0.5)',
}
const STATUS_LABEL: Record<ServiceStatus, string> = {
  online: 'Online', offline: 'Offline', checking: 'Connecting / Scan QR',
}
const RESTART_HINTS: Record<string, string> = {
  backend: 'cd backend && python -m uvicorn app.main:app --reload',
  wa:      'cd wa-bridge && npx kill-port 3001 && node index.js',
  db:      'Check Supabase dashboard -> project status',
}

async function checkServices(): Promise<Services> {
  // Generic check — returns online/offline
  const check = async (url: string): Promise<ServiceStatus> => {
    try { await axios.get(url, { timeout: 4000 }); return 'online' }
    catch { return 'offline' }
  }

  // WA bridge check — distinguishes ready vs connecting (scanning QR)
  const checkWA = async (): Promise<ServiceStatus> => {
    try {
      const r = await axios.get('http://localhost:3001/health', { timeout: 4000 })
      return r.data?.status === 'ready' ? 'online' : 'checking'
    } catch { return 'offline' }
  }

  const [backend, wa] = await Promise.all([
    check(`${BASE}/health`),
    checkWA(),
  ])
  const db: ServiceStatus = backend === 'online' ? 'online' : 'offline'
  return { backend, wa, db }
}


/* ── Profile / Account Modal ── */
function ProfileModal({ onClose }: { onClose: () => void }) {
  const [name,     setName]     = useState('Lior Ben-David')
  const [email,    setEmail]    = useState('lior@lbatech.com')
  const [phone,    setPhone]    = useState('+972-54-309-0009')
  const [username, setUsername] = useState('lior')
  const [currPass, setCurrPass] = useState('')
  const [newPass,  setNewPass]  = useState('')
  const [confPass, setConfPass] = useState('')
  const [saved,    setSaved]    = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire to PATCH /api/v1/auth/me when endpoint exists
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px', color: '#CBD5E1',
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        marginLeft: 72, width: 340,
        background: 'linear-gradient(160deg, rgba(8,12,28,0.98) 0%, rgba(4,7,18,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: '20px 22px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 14, color: '#fff',
              boxShadow: '0 0 16px rgba(59,130,246,0.4)',
            }}>LB</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>My Account</div>
              <div style={{ fontSize: 11, color: '#475569' }}>Personal information</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <div style={label}>Full Name</div>
            <input value={name} onChange={e => setName(e.target.value)} style={field} />
          </div>

          {/* Username */}
          <div>
            <div style={label}>Username</div>
            <input value={username} onChange={e => setUsername(e.target.value)} style={field} />
          </div>

          {/* Email */}
          <div>
            <div style={label}>Email Address</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={field} />
          </div>

          {/* Phone */}
          <div>
            <div style={label}>Phone Number</div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={field} />
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 4 }}>
            <div style={{ ...label, marginBottom: 10 }}>Change Password</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="password" placeholder="Current password"
                     value={currPass} onChange={e => setCurrPass(e.target.value)} style={field} />
              <input type="password" placeholder="New password"
                     value={newPass} onChange={e => setNewPass(e.target.value)} style={field} />
              <input type="password" placeholder="Confirm new password"
                     value={confPass} onChange={e => setConfPass(e.target.value)} style={field} />
            </div>
          </div>

          {/* Save */}
          <button type="submit" style={{
            padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: saved ? 'rgba(52,211,153,0.2)' : 'rgba(59,130,246,0.2)',
            color: saved ? '#34D399' : '#93C5FD',
            border: saved ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(59,130,246,0.35)',
            cursor: 'pointer', transition: 'all 0.3s',
          }}>
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Sidebar({ onNewTask, onSetup, onImport, activeView, onViewChange }: Props) {
  const [services, setServices] = useState<Services>({ backend: 'checking', wa: 'checking', db: 'checking' })
  const [tooltip,  setTooltip]  = useState<string | null>(null)
  const [copied,   setCopied]   = useState<string | null>(null)
  const [blinking, setBlinking] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    async function run() {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 600)
      const s = await checkServices()
      setServices(s)
    }
    run()
    const id = setInterval(run, 30_000)
    return () => clearInterval(id)
  }, [])

  function handleCopy(key: string) {
    const cmd = RESTART_HINTS[key]
    if (!cmd) return
    navigator.clipboard.writeText(cmd).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2500)
  }

  const serviceList = [
    { key: 'backend', label: 'API', status: services.backend },
    { key: 'wa',      label: 'WA',  status: services.wa },
    { key: 'db',      label: 'DB',  status: services.db },
  ] as const

  return (
    <aside className="sidebar flex flex-col flex-shrink-0" style={{ width: 64 }}>

      {/* Logo */}
      <div className="flex items-center justify-center h-14 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm relative overflow-hidden"
             style={{
               background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #06B6D4 100%)',
               color: '#fff', letterSpacing: '-0.5px',
               boxShadow: '0 0 24px rgba(59,130,246,0.5), 0 4px 12px rgba(0,0,0,0.4)',
             }}>
          <span style={{ position: 'relative', zIndex: 1 }}>AI</span>
          <div style={{ position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)',
                        borderRadius: 'inherit' }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-2 py-4 flex-1">
        {NAV.map(n => {
          const active = activeView === n.view
          return (
            <button key={n.view} title={n.label}
                    onClick={() => onViewChange(n.view)}
                    className={`sidebar-icon w-11 h-11 rounded-xl flex items-center justify-center transition-all ${active ? 'sidebar-icon-active' : ''}`}
                    style={{ fontSize: '20px', color: active ? n.color : 'rgba(71,85,105,0.8)', position: 'relative' }}>
              {n.icon}
              {active && (
                <div style={{ position: 'absolute', right: -1, top: '20%', width: 3, height: '60%',
                              background: n.color, borderRadius: '2px 0 0 2px',
                              boxShadow: `0 0 8px ${n.color}` }} />
              )}
            </button>
          )
        })}

        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

        <button onClick={onImport} title="Import from iPhone Notes"
                className="sidebar-icon w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{ fontSize: '18px', color: 'rgba(100,116,139,0.6)' }}>
          {'\u{1F4E5}'}
        </button>

        <button onClick={onNewTask} title="New task"
                className="btn-primary w-11 h-11 rounded-xl flex items-center justify-center font-bold"
                style={{ fontSize: '22px' }}>
          +
        </button>
      </nav>

      {/* Service status panel */}
      <div className="flex flex-col items-center gap-2 py-3 flex-shrink-0"
           style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{
          fontSize: '8px', color: 'rgba(100,116,139,0.45)', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2,
        }}>
          Services
        </span>
        {serviceList.map(s => (
          <div key={s.key} style={{ position: 'relative' }}>
            <button
              title={`${s.label}: ${STATUS_LABEL[s.status]} -- Click for details, double-click to copy restart`}
              onClick={() => setTooltip(tooltip === s.key ? null : s.key)}
              onDoubleClick={() => handleCopy(s.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px',
                borderRadius: 8,
              }}>
              <div style={{
                width: 11, height: 11, borderRadius: '50%',
                background: copied === s.key ? '#34D399' : STATUS_COLOR[s.status],
                boxShadow: `0 0 8px ${copied === s.key ? 'rgba(52,211,153,0.8)' : STATUS_GLOW[s.status]}`,
                opacity: blinking ? 0.4 : 1,
                transition: 'background 0.4s ease, box-shadow 0.4s ease, opacity 0.3s ease',
              }} />
              <span style={{
                fontSize: '9px',
                color: copied === s.key ? '#34D399' : 'rgba(100,116,139,0.7)',
                fontWeight: 700, letterSpacing: '0.03em', transition: 'color 0.3s',
              }}>
                {copied === s.key ? 'OK' : s.label}
              </span>
            </button>

            {tooltip === s.key && (
              <div style={{
                position: 'absolute', right: 72, bottom: 0, zIndex: 200,
                width: 260, background: 'rgba(8,12,24,0.97)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: STATUS_COLOR[s.status],
                    boxShadow: `0 0 6px ${STATUS_GLOW[s.status]}`,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>
                    {s.label} &mdash; {STATUS_LABEL[s.status]}
                  </span>
                </div>
                {s.status === 'offline' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8 }}>
                    <p style={{ fontSize: 10, color: '#64748B', margin: '0 0 6px',
                                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Restart command
                    </p>
                    <code style={{
                      fontSize: 10, color: '#93C5FD', display: 'block', wordBreak: 'break-all',
                      background: 'rgba(59,130,246,0.08)', borderRadius: 6,
                      padding: '6px 8px', marginBottom: 8,
                    }}>
                      {RESTART_HINTS[s.key]}
                    </code>
                    <button
                      onClick={() => handleCopy(s.key)}
                      style={{
                        width: '100%', padding: '6px 0', borderRadius: 7,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: copied === s.key ? 'rgba(52,211,153,0.2)' : 'rgba(59,130,246,0.15)',
                        color: copied === s.key ? '#34D399' : '#93C5FD',
                        border: copied === s.key ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(59,130,246,0.3)',
                        transition: 'all 0.2s',
                      }}>
                      {copied === s.key ? 'Copied!' : 'Copy restart command'}
                    </button>
                    <p style={{ fontSize: 9, color: '#334155', margin: '6px 0 0', textAlign: 'center' }}>
                      Open terminal and paste
                    </p>
                  </div>
                )}
                <button onClick={() => setTooltip(null)}
                        style={{
                          position: 'absolute', top: 8, right: 10,
                          background: 'none', border: 'none',
                          color: '#475569', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                        }}>
                  X
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-3 py-3 flex-shrink-0"
           style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onSetup} title="Setup"
                className="sidebar-icon w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{ fontSize: '20px', color: 'rgba(71,85,105,0.7)' }}>
          {'⚙'}
        </button>
        <button onClick={() => setShowProfile(true)}
                title="My Account"
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  color: '#fff', fontSize: '11px', border: 'none', cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(59,130,246,0.4)',
                }}>
          LB
          <div style={{ position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
        </button>
      </div>

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

    </aside>
  )
}
