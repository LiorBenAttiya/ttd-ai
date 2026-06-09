const REPORT_CARDS = [
  { icon: 'ti-chart-bar', color: '#3B82F6', bg: '#DBEAFE', title: 'Weekly Summary', desc: 'Tasks completed, overdue, and in progress', action: 'Generate' },
  { icon: 'ti-mail-forward', color: '#16a34a', bg: '#DCFCE7', title: 'Daily Briefing', desc: 'Send AI-generated daily report via email', action: 'Send Now' },
  { icon: 'ti-chart-pie', color: '#D97706', bg: '#FEF3C7', title: 'Category Breakdown', desc: 'Business vs Personal task distribution', action: 'View' },
  { icon: 'ti-clock-hour-4', color: '#7C3AED', bg: '#EDE9FE', title: 'Time Analysis', desc: 'Average task duration and completion trends', action: 'View' },
  { icon: 'ti-users', color: '#0369A1', bg: '#E0F2FE', title: 'Delegation Report', desc: 'Tasks delegated and their current status', action: 'View' },
  { icon: 'ti-alert-triangle', color: '#DC2626', bg: '#FEE2E2', title: 'Overdue Report', desc: 'All tasks past their due date', action: 'Export' },
]

export default function ReportsPanel() {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Reports & Analytics</div>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>AI-powered insights on your tasks and productivity</div>
      </div>

      {/* Cards grid */}
      <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'auto' }}>
        {REPORT_CARDS.map(({ icon, color, bg, title, desc, action }) => (
          <div key={title} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'box-shadow 150ms, border-color 150ms' }}
               onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(15,23,42,0.08)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1' }}
               onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 18, color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{title}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{desc}</div>
            </div>
            <button style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${color}30`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {action}
            </button>
          </div>
        ))}
      </div>

      {/* Coming soon footer */}
      <div style={{ padding: '10px 14px', background: '#F1F5F9', borderTop: '1px solid #E2E8F0', flexShrink: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>📊 Advanced analytics coming in v1.1</span>
      </div>
    </div>
  )
}
