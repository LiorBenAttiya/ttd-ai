import { useState } from 'react'
import { useStats } from '@/hooks/useTasks'

interface Props {
  onSetup?: () => void
  activeNav?: string
  onNavChange?: (nav: string) => void
}

const NAV_ITEMS = [
  { icon: 'ti-layout-kanban', label: 'Board',    nav: 'board'    },
  { icon: 'ti-chart-dots-3',  label: 'Reports',  nav: 'reports'  },
  { icon: 'ti-address-book',  label: 'Contacts', nav: 'contacts' },
  { icon: 'ti-archive',       label: 'Archive',  nav: 'archive'  },
]

function NavIcon({ icon, label, onClick, active }: { icon: string; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div onClick={onClick}
           style={{ width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
             background: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)', transition: 'background 0.15s',
             boxShadow: active ? 'inset 0 0 0 1.5px rgba(255,255,255,0.3)' : 'none' }}
           onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
           onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 17, color: active ? '#fff' : 'rgba(255,255,255,0.75)' }} />
      </div>
      <span style={{ fontSize: 8, color: active ? '#BAE6FD' : 'rgba(255,255,255,0.55)', letterSpacing: '0.02em', fontWeight: active ? 700 : 400 }}>{label}</span>
    </div>
  )
}

/* ── Account Modal ── */
function AccountModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           style={{ width: 340, borderRadius: 16, overflow: 'hidden', background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>
        {/* Header */}
        <div style={{ background: '#1E3A8A', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Account</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: 2 }}>✕</button>
        </div>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 18px 16px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10, boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}>LB</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Lior Ben-Attiya</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>lior@lbatech.com</div>
          <div style={{ marginTop: 8, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', fontSize: 10, fontWeight: 700 }}>Administrator</div>
        </div>
        {/* Info rows */}
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: 'ti-building', label: 'Company',   value: 'LBA Technologies'   },
            { icon: 'ti-map-pin',  label: 'Location',  value: 'Tel Aviv, Israel'   },
            { icon: 'ti-device-desktop', label: 'Version', value: 'TTD AI v1.0'   },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 14, color: '#94A3B8', width: 18 }} />
              <span style={{ fontSize: 11, color: '#94A3B8', width: 60 }}>{label}</span>
              <span style={{ fontSize: 11, color: '#1E293B', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Edit Profile</button>
          <button onClick={onClose} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: '#EF4444', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>
    </div>
  )
}

/* ── Help Modal ── */
function HelpModal({ onClose }: { onClose: () => void }) {
  const topics = [
    { icon: 'ti-layout-kanban', title: 'Kanban Board',       desc: 'Drag tasks between To Do, In Progress, and Done. Double-click to edit.' },
    { icon: 'ti-brand-whatsapp', title: 'WhatsApp Integration', desc: 'Messages from your Saved Messages are auto-scanned for actionable tasks.' },
    { icon: 'ti-mail',          title: 'Email Inbox',        desc: 'Connect your Outlook mailbox via the Feed tab to read and convert emails to tasks.' },
    { icon: 'ti-robot',         title: 'AI Inbox',           desc: 'Click "Analyze Now" to let the AI scan all messages and suggest tasks automatically.' },
    { icon: 'ti-timer',         title: 'Countdown',          desc: 'Click "+ Countdown" in the toolbar, set a name + time. An alarm fires at zero.' },
    { icon: 'ti-search',        title: 'AI Search',          desc: 'The search bar searches tasks, emails, WhatsApp messages, and contacts in real time.' },
    { icon: 'ti-settings',      title: 'Setup',              desc: 'Configure companies, email addresses, and labels via the Settings icon.' },
    { icon: 'ti-chart-bar',     title: 'Reports',            desc: 'Generate weekly summaries, category breakdowns, and delegation reports.' },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           style={{ width: 480, maxHeight: '80vh', borderRadius: 16, overflow: 'hidden', background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(15,23,42,0.15)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#1E3A8A', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-help-circle" style={{ fontSize: 16, color: '#93C5FD' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Help & Guide</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: 2 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topics.map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 15, color: '#3B82F6' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{title}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', textAlign: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>TTD AI v1.0 · lior@lbatech.com · </span>
          <a href="https://liorbenattiya.github.io/ttd-ai/" target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#3B82F6' }}>Open app</a>
        </div>
      </div>
    </div>
  )
}

export default function NavRail({ onSetup, activeNav = 'board', onNavChange }: Props) {
  const { data: stats } = useStats()
  const done   = stats?.completed ?? 0
  const todo   = stats?.pending   ?? 0
  const urgent = stats?.overdue   ?? 0

  const [showAccount, setShowAccount] = useState(false)
  const [showHelp,    setShowHelp]    = useState(false)

  return (
    <>
      <aside style={{ width: 68, flexShrink: 0, background: '#1E3A8A', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 10px' }}>

        {/* Avatar — opens account modal */}
        <div onClick={() => setShowAccount(true)}
             title="Account"
             style={{ width: 34, height: 34, borderRadius: '50%', background: '#3B82F6', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, marginBottom: 8, cursor: 'pointer', transition: 'border-color 150ms' }}
             onMouseEnter={e => (e.currentTarget.style.borderColor = '#fff')}
             onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}>
          LB
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '82%', marginBottom: 12 }}>
          {[
            { n: done,   lbl: 'done',   c: '#fff'    },
            { n: todo,   lbl: 'to do',  c: '#60A5FA' },
            { n: urgent, lbl: 'urgent', c: '#FCA5A5' },
          ].map(({ n, lbl, c }) => (
            <div key={lbl} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 5, padding: '3px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: c, fontWeight: 700, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 7, color: '#93C5FD' }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ width: '55%', height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: 12 }} />

        {/* Main nav */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {NAV_ITEMS.map(({ icon, label, nav }) => (
            <NavIcon key={label} icon={icon} label={label} active={activeNav === nav} onClick={() => onNavChange?.(nav)} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <NavIcon icon="ti-settings"    label="Settings" onClick={onSetup}                 />
          <NavIcon icon="ti-help-circle" label="Help"     onClick={() => setShowHelp(true)} />
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6, marginTop: 4 }}>
            v1.0<br />TTD AI
          </div>
        </div>
      </aside>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
      {showHelp    && <HelpModal    onClose={() => setShowHelp(false)}    />}
    </>
  )
}
