import { useState, useEffect } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Contact {
  id: string
  full_name: string
  initials: string
  email?: string
  phone?: string
  company?: string
  role?: string
  open_tasks?: number
}

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', full_name: 'David Cohen',   initials: 'DC', email: 'david@lbatech.com',  company: 'LBATech',  role: 'CTO',      open_tasks: 3 },
  { id: 'c2', full_name: 'Sarah Levi',    initials: 'SL', email: 'sarah@mepsltn.com',  company: 'MEP OSM',  role: 'PM',       open_tasks: 1 },
  { id: 'c3', full_name: 'Yossi Mizrahi', initials: 'YM', email: 'yossi@lbatech.com',  company: 'LBATech',  role: 'Dev Lead', open_tasks: 5 },
  { id: 'c4', full_name: 'Noa Shapiro',   initials: 'NS', email: 'noa@partner.co.il',  company: 'Partner',  role: 'Sales',    open_tasks: 0 },
  { id: 'c5', full_name: 'Avi Green',     initials: 'AG', email: 'avi@lbatech.com',    company: 'LBATech',  role: 'Finance',  open_tasks: 2 },
]

const AVATAR_COLORS = ['#3B82F6','#7C3AED','#0369A1','#16a34a','#D97706','#DC2626']

export default function ContactsPanel() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    axios.get(`${BASE}/contacts`, { timeout: 4000 })
      .then(r => { setContacts(r.data?.contacts ?? r.data ?? []); setLoaded(true) })
      .catch(() => { setContacts(MOCK_CONTACTS); setLoaded(true) })
  }, [])

  const filtered = contacts.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ flex: 1, overflow: 'hidden', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Header + search */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Contacts</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 7, padding: '6px 10px' }}>
          <i className="ti ti-search" style={{ fontSize: 13, color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search contacts…"
                 style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#1E293B' }} />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!loaded && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Loading contacts…</div>
        )}
        {loaded && filtered.length === 0 && (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No contacts found</div>
          </div>
        )}
        {filtered.map((c, idx) => {
          const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 120ms' }}
                 onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                 onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${color}20`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color, flexShrink: 0 }}>
                {c.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{c.full_name}</div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{[c.role, c.company].filter(Boolean).join(' · ')}</div>
              </div>
              {(c.open_tasks ?? 0) > 0 && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, flexShrink: 0 }}>
                  {c.open_tasks} tasks
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
