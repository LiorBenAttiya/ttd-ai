import { useStats } from '@/hooks/useTasks'

interface Props {
  onSetup?: () => void
  onImport?: () => void
}

const NAV_ITEMS = [
  { icon: 'ti-layout-kanban', label: 'Board'    },
  { icon: 'ti-chart-dots-3',  label: 'Reports'  },
  { icon: 'ti-address-book',  label: 'Contacts' },
  { icon: 'ti-archive',       label: 'Archive'  },
]

function NavIcon({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div
        onClick={onClick}
        style={{
          width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.08)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
        <i className={`ti ${icon}`} style={{ fontSize: 17, color: 'rgba(255,255,255,0.88)' }} />
      </div>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>{label}</span>
    </div>
  )
}

export default function NavRail({ onSetup }: Props) {
  const { data: stats } = useStats()
  const done   = stats?.completed ?? 0
  const todo   = stats?.pending   ?? 0
  const urgent = stats?.overdue   ?? 0

  return (
    <aside style={{
      width: 68, flexShrink: 0,
      background: '#1E3A8A',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0 10px',
    }}>

      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: '#3B82F6', border: '2px solid rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
        marginBottom: 8,
      }}>LB</div>

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
        {NAV_ITEMS.map(({ icon, label }) => (
          <NavIcon key={label} icon={icon} label={label} />
        ))}
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <NavIcon icon="ti-settings"    label="Settings" onClick={onSetup} />
        <NavIcon icon="ti-help-circle" label="Help"     />
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6, marginTop: 4 }}>
          v1.0<br />TTD AI
        </div>
      </div>

    </aside>
  )
}
