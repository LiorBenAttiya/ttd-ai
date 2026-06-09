import { useState, useRef } from 'react'
import { defaultCompanies, LABEL_COLORS } from '@/data/setup'
import type { CompanyConfig, CompanyEmail } from '@/data/setup'

interface Props { onClose: () => void }

const uuid = () => crypto.randomUUID()
const LABEL_OPTIONS = ['primary', 'delegate', 'cc', 'other'] as const
const PRESET_COLORS = [
  '#1D4ED8','#3B82F6','#0891b2','#059669','#16a34a',
  '#D97706','#DC2626','#9333ea','#ec4899','#64748b',
]

function EditableText({
  value, onChange, placeholder = 'Click to edit', style = {}, className = ''
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; style?: React.CSSProperties; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  function start() { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 10) }
  function commit() { onChange(draft.trim() || value); setEditing(false) }

  if (editing) {
    return (
      <input ref={inputRef} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className={className}
        style={{ outline: 'none', background: '#EFF6FF', borderRadius: 6,
                 border: '1px solid #BFDBFE', padding: '2px 6px', ...style }} />
    )
  }
  return (
    <span onClick={start} title="Click to edit"
          className={`cursor-text rounded px-1 transition-colors ${className}`}
          style={{ ...style }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {value || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>{placeholder}</span>}
    </span>
  )
}

export default function SetupPage({ onClose }: Props) {
  const [companies, setCompanies] = useState<CompanyConfig[]>(defaultCompanies)
  const [activeId, setActiveId]   = useState(companies[0]?.id)
  const [saved, setSaved]         = useState(false)
  const [showAddEmail, setShowAddEmail] = useState(false)
  const [newEmail, setNewEmail]   = useState({ email: '', name: '', label: 'primary' as typeof LABEL_OPTIONS[number] })
  const [newCoName, setNewCoName] = useState('')
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)

  const active = companies.find(c => c.id === activeId)

  function updateCompany(id: string, field: keyof CompanyConfig, value: string) {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }
  function deleteCompany(id: string) {
    const rest = companies.filter(c => c.id !== id)
    setCompanies(rest); setActiveId(rest[0]?.id)
  }
  function addCompany() {
    if (!newCoName.trim()) return
    const co: CompanyConfig = { id: uuid(), name: newCoName.trim(), color: '#3B82F6', flag: '🏢', emails: [] }
    setCompanies(prev => [...prev, co]); setActiveId(co.id); setNewCoName('')
  }
  function updateEmail(companyId: string, emailId: string, field: keyof CompanyEmail, value: string | boolean) {
    setCompanies(prev => prev.map(co =>
      co.id !== companyId ? co : { ...co, emails: co.emails.map(e => e.id !== emailId ? e : { ...e, [field]: value }) }
    ))
  }
  function removeEmail(companyId: string, emailId: string) {
    setCompanies(prev => prev.map(co =>
      co.id !== companyId ? co : { ...co, emails: co.emails.filter(e => e.id !== emailId) }
    ))
  }
  function addEmail() {
    if (!newEmail.email.trim() || !active) return
    const em: CompanyEmail = { id: uuid(), email: newEmail.email.trim(), person_name: newEmail.name.trim(), label: newEmail.label, active: true }
    setCompanies(prev => prev.map(co => co.id !== active.id ? co : { ...co, emails: [...co.emails, em] }))
    setNewEmail({ email: '', name: '', label: 'primary' }); setShowAddEmail(false)
  }
  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, margin: '0 16px', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(15,23,42,0.15)' }}>

        {/* ── Header ── */}
        <div style={{ background: '#1E3A8A', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-settings" style={{ fontSize: 16, color: '#93C5FD' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Setup</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', color: '#BAE6FD', fontWeight: 500 }}>
              Companies & Emails · click any field to edit
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleSave} style={{
              fontSize: 11, padding: '5px 14px', borderRadius: 20, fontWeight: 600, cursor: 'pointer',
              background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.15)',
              color: saved ? '#86EFAC' : '#fff',
              border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.25)'}`,
              transition: 'all 200ms',
            }}>
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left — company list */}
          <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '8px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              Companies
            </div>

            {companies.map(co => (
              <div key={co.id} onClick={() => setActiveId(co.id)}
                   className="group"
                   style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', transition: 'background 120ms', borderLeft: `3px solid ${activeId === co.id ? co.color : 'transparent'}`, background: activeId === co.id ? '#EFF6FF' : 'transparent' }}
                   onMouseEnter={e => { if (activeId !== co.id) (e.currentTarget as HTMLDivElement).style.background = '#F1F5F9' }}
                   onMouseLeave={e => { if (activeId !== co.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>

                {/* Color dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: co.color, cursor: 'pointer', boxShadow: activeId === co.id ? `0 0 6px ${co.color}66` : 'none' }}
                       onClick={e => { e.stopPropagation(); setShowColorPicker(showColorPicker === co.id ? null : co.id) }}
                       title="Click to change colour" />
                  {showColorPicker === co.id && (
                    <div style={{ position: 'absolute', left: 18, top: 0, zIndex: 20, background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 5, width: 130, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}>
                      {PRESET_COLORS.map(c => (
                        <div key={c} style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: co.color === c ? '2px solid #1E293B' : '2px solid transparent', transition: 'transform 120ms' }}
                             onClick={e => { e.stopPropagation(); updateCompany(co.id, 'color', c); setShowColorPicker(null) }}
                             onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)'}
                             onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
                  <EditableText value={co.name} onChange={v => updateCompany(co.id, 'name', v)}
                    style={{ fontSize: 12, color: activeId === co.id ? '#1E293B' : '#64748B', fontWeight: activeId === co.id ? 600 : 400, display: 'block', width: '100%' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: '#F1F5F9', color: '#94A3B8' }}>{co.emails.length}</span>
                  <button style={{ opacity: 0, fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'opacity 150ms' }}
                          className="group-hover-show"
                          title="Delete company"
                          onClick={e => { e.stopPropagation(); if (confirm(`Delete ${co.name}?`)) deleteCompany(co.id) }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>✕</button>
                </div>
              </div>
            ))}

            {/* Add company */}
            <div style={{ padding: '8px 12px', marginTop: 'auto', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              <input value={newCoName} onChange={e => setNewCoName(e.target.value)}
                     placeholder="+ Add company…"
                     onKeyDown={e => e.key === 'Enter' && addCompany()}
                     style={{ width: '100%', boxSizing: 'border-box', borderRadius: 7, padding: '6px 10px', fontSize: 11, background: '#fff', color: '#1E293B', border: '1px solid #E2E8F0', outline: 'none' }} />
            </div>
          </div>

          {/* Right — email management */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '18px 20px', gap: 14 }}>
            {active ? (
              <>
                {/* Company header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: active.color, boxShadow: `0 0 8px ${active.color}55` }} />
                  <EditableText value={active.flag} onChange={v => updateCompany(active.id, 'flag', v)}
                    style={{ fontSize: 20 }} placeholder="🏢" />
                  <EditableText value={active.name} onChange={v => updateCompany(active.id, 'name', v)}
                    style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }} placeholder="Company name" />
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94A3B8' }}>Click any field to edit</span>
                </div>

                {/* Email list label */}
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Email addresses · click to edit
                </div>

                {/* Emails */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {active.emails.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>No emails — add one below</p>
                  ) : active.emails.map(em => {
                    const lc = LABEL_COLORS[em.label]
                    return (
                      <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', transition: 'border-color 120ms' }}
                           onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1'}
                           onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0'}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <EditableText value={em.email} onChange={v => updateEmail(active.id, em.id, 'email', v)}
                              style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }} placeholder="email@example.com" />
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, fontWeight: 600, background: lc.bg, color: lc.text }}>
                              {lc.label}
                            </span>
                          </div>
                          <EditableText value={em.person_name} onChange={v => updateEmail(active.id, em.id, 'person_name', v)}
                            style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }} placeholder="Person name" />
                        </div>

                        <select value={em.label} onChange={e => updateEmail(active.id, em.id, 'label', e.target.value)}
                                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 7, background: '#fff', color: '#475569', border: '1px solid #E2E8F0', outline: 'none' }}>
                          {LABEL_OPTIONS.map(l => <option key={l} value={l}>{LABEL_COLORS[l].label}</option>)}
                        </select>

                        <button onClick={() => removeEmail(active.id, em.id)}
                                style={{ fontSize: 13, color: '#CBD5E1', background: 'none', border: 'none', cursor: 'pointer', padding: 3, transition: 'color 120ms' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E1')}>✕</button>
                      </div>
                    )
                  })}
                </div>

                {/* Add email */}
                {showAddEmail ? (
                  <div style={{ borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={newEmail.email} placeholder="email@example.com" autoFocus
                             onChange={e => setNewEmail(n => ({ ...n, email: e.target.value }))}
                             onKeyDown={e => e.key === 'Enter' && addEmail()}
                             style={{ flex: 1, borderRadius: 7, padding: '7px 10px', fontSize: 12, background: '#fff', color: '#1E293B', border: '1px solid #BFDBFE', outline: 'none' }} />
                      <input value={newEmail.name} placeholder="Person name"
                             onChange={e => setNewEmail(n => ({ ...n, name: e.target.value }))}
                             onKeyDown={e => e.key === 'Enter' && addEmail()}
                             style={{ flex: 1, borderRadius: 7, padding: '7px 10px', fontSize: 12, background: '#fff', color: '#1E293B', border: '1px solid #BFDBFE', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {LABEL_OPTIONS.map(l => {
                          const lc = LABEL_COLORS[l]
                          return (
                            <button key={l} type="button" onClick={() => setNewEmail(n => ({ ...n, label: l }))}
                                    style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
                                             background: newEmail.label === l ? lc.bg : '#fff',
                                             color: newEmail.label === l ? lc.text : '#94A3B8',
                                             border: `1px solid ${newEmail.label === l ? lc.text + '55' : '#E2E8F0'}` }}>
                              {lc.label}
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                        <button onClick={() => setShowAddEmail(false)}
                                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, background: '#fff', color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button onClick={addEmail}
                                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, background: '#3B82F6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Add ↵
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddEmail(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 12, color: '#3B82F6', background: 'transparent', border: '1px dashed #BFDBFE', cursor: 'pointer', width: '100%', transition: 'all 150ms' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#3B82F6' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#BFDBFE' }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
                    <span>Add email address to {active.name}</span>
                  </button>
                )}

                {/* How it works */}
                <div style={{ borderRadius: 10, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>How it works: </span>
                    <strong style={{ color: '#1E293B' }}>Primary</strong> auto-fills the From address when creating a task.{' '}
                    <strong style={{ color: '#1E293B' }}>Delegate</strong> appears as an option to assign the task.{' '}
                    <strong style={{ color: '#1E293B' }}>CC</strong> is copied on any email sent for this company.
                  </p>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CBD5E1', fontSize: 13 }}>
                Select a company on the left
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
