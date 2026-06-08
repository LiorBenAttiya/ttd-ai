import { useState, useRef } from 'react'
import { defaultCompanies, LABEL_COLORS } from '@/data/setup'
import type { CompanyConfig, CompanyEmail } from '@/data/setup'

interface Props { onClose: () => void }

const uuid = () => crypto.randomUUID()
const LABEL_OPTIONS = ['primary', 'delegate', 'cc', 'other'] as const
const PRESET_COLORS = [
  '#0078d4','#dc2626','#059669','#6366f1','#0891b2',
  '#f59e0b','#9333ea','#ec4899','#14b8a6','#64748b',
]

// ── Inline editable text ──────────────────────────────────────
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
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className={className}
        style={{ outline: 'none', background: 'rgba(99,102,241,0.1)', borderRadius: '6px',
                 border: '1px solid rgba(99,102,241,0.4)', padding: '2px 6px', ...style }}
      />
    )
  }
  return (
    <span
      onClick={start}
      title="Click to edit"
      className={`cursor-text hover:bg-white/5 rounded px-1 transition-colors ${className}`}
      style={style}>
      {value || <span style={{ color: 'rgba(100,116,139,0.4)', fontStyle: 'italic' }}>{placeholder}</span>}
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

  // ── Company mutations ─────────────────────────────────────
  function updateCompany(id: string, field: keyof CompanyConfig, value: string) {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }
  function deleteCompany(id: string) {
    const rest = companies.filter(c => c.id !== id)
    setCompanies(rest)
    setActiveId(rest[0]?.id)
  }
  function addCompany() {
    if (!newCoName.trim()) return
    const co: CompanyConfig = { id: uuid(), name: newCoName.trim(), color: '#6366f1', flag: '🏢', emails: [] }
    setCompanies(prev => [...prev, co])
    setActiveId(co.id)
    setNewCoName('')
  }

  // ── Email mutations ───────────────────────────────────────
  function updateEmail(companyId: string, emailId: string, field: keyof CompanyEmail, value: string | boolean) {
    setCompanies(prev => prev.map(co =>
      co.id !== companyId ? co : {
        ...co, emails: co.emails.map(e => e.id !== emailId ? e : { ...e, [field]: value })
      }
    ))
  }
  function removeEmail(companyId: string, emailId: string) {
    setCompanies(prev => prev.map(co =>
      co.id !== companyId ? co : { ...co, emails: co.emails.filter(e => e.id !== emailId) }
    ))
  }
  function addEmail() {
    if (!newEmail.email.trim() || !active) return
    const em: CompanyEmail = {
      id: uuid(), email: newEmail.email.trim(), person_name: newEmail.name.trim(),
      label: newEmail.label, active: true,
    }
    setCompanies(prev => prev.map(co =>
      co.id !== active.id ? co : { ...co, emails: [...co.emails, em] }
    ))
    setNewEmail({ email: '', name: '', label: 'primary' })
    setShowAddEmail(false)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-3xl mx-4 rounded-2xl overflow-hidden flex flex-col"
           style={{ maxHeight: '90vh', background: 'rgba(11,15,25,0.98)',
                    border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 32px 100px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.7)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'rgba(226,232,240,0.95)' }}>Setup</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '9px' }}>
              Companies & Emails · click any field to edit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                    style={{ background: saved ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.2)',
                             color: saved ? '#34d399' : '#a5b4fc',
                             border: `1px solid ${saved ? 'rgba(52,211,153,0.4)' : 'rgba(99,102,241,0.35)'}` }}>
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
            <button onClick={onClose} style={{ color: 'rgba(100,116,139,0.6)', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.8)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.6)')}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left — company list */}
          <div className="flex flex-col overflow-y-auto flex-shrink-0"
               style={{ width: 230, borderRight: '1px solid rgba(99,102,241,0.1)', background: 'rgba(14,18,32,0.5)' }}>

            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                 style={{ color: 'rgba(100,116,139,0.5)', fontSize: '9px', borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
              Companies
            </div>

            {companies.map(co => (
              <div key={co.id}
                   className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${activeId === co.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                   style={{ borderLeft: `3px solid ${activeId === co.id ? co.color : 'transparent'}` }}
                   onClick={() => setActiveId(co.id)}>

                {/* Color dot — click to open color picker */}
                <div className="relative flex-shrink-0">
                  <div className="w-3 h-3 rounded-full cursor-pointer"
                       style={{ background: co.color, boxShadow: activeId === co.id ? `0 0 6px ${co.color}88` : 'none' }}
                       onClick={e => { e.stopPropagation(); setShowColorPicker(showColorPicker === co.id ? null : co.id) }}
                       title="Click to change colour" />
                  {showColorPicker === co.id && (
                    <div className="absolute left-5 top-0 z-20 rounded-xl p-2 flex flex-wrap gap-1.5"
                         style={{ background: 'rgba(20,27,45,0.97)', border: '1px solid rgba(99,102,241,0.3)',
                                  width: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                      {PRESET_COLORS.map(c => (
                        <div key={c} className="w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform"
                             style={{ background: c, border: co.color === c ? '2px solid white' : '2px solid transparent' }}
                             onClick={e => { e.stopPropagation(); updateCompany(co.id, 'color', c); setShowColorPicker(null) }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Editable company name */}
                <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                  <EditableText
                    value={co.name}
                    onChange={v => updateCompany(co.id, 'name', v)}
                    style={{ fontSize: '12px', color: activeId === co.id ? 'rgba(226,232,240,0.95)' : 'rgba(148,163,184,0.65)', display: 'block', width: '100%' }}
                  />
                </div>

                {/* Email count + delete */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs rounded-full px-1.5"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(100,116,139,0.5)', fontSize: '9px' }}>
                    {co.emails.length}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          style={{ color: 'rgba(239,68,68,0.5)' }}
                          title="Delete company"
                          onClick={e => { e.stopPropagation(); if (confirm(`Delete ${co.name}?`)) deleteCompany(co.id) }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Add company */}
            <div className="px-3 py-2 mt-auto flex-shrink-0"
                 style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
              <input value={newCoName} onChange={e => setNewCoName(e.target.value)}
                     placeholder="+ Add company…"
                     onKeyDown={e => e.key === 'Enter' && addCompany()}
                     className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none"
                     style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.8)',
                              border: '1px solid rgba(99,102,241,0.15)', fontSize: '11px' }} />
            </div>
          </div>

          {/* Right — email management */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-4">
            {active ? (
              <>
                {/* Company header — fully editable */}
                <div className="flex items-center gap-3 pb-4"
                     style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                  <div className="w-4 h-4 rounded-full flex-shrink-0"
                       style={{ background: active.color, boxShadow: `0 0 10px ${active.color}66` }} />

                  {/* Editable flag */}
                  <EditableText value={active.flag} onChange={v => updateCompany(active.id, 'flag', v)}
                    style={{ fontSize: '20px' }} placeholder="🏢" />

                  {/* Editable company name (large) */}
                  <EditableText value={active.name} onChange={v => updateCompany(active.id, 'name', v)}
                    style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(226,232,240,0.95)' }}
                    placeholder="Company name" />

                  <span className="ml-auto text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>
                    Click any field to edit
                  </span>
                </div>

                {/* Email list header */}
                <div className="text-xs font-semibold uppercase tracking-widest"
                     style={{ color: 'rgba(100,116,139,0.5)', fontSize: '9px' }}>
                  Email addresses  ·  click to edit
                </div>

                {/* Emails */}
                <div className="flex flex-col gap-2">
                  {active.emails.length === 0 ? (
                    <p className="text-xs py-3 text-center" style={{ color: 'rgba(100,116,139,0.4)' }}>
                      No emails — add one below
                    </p>
                  ) : (
                    active.emails.map(em => {
                      const lc = LABEL_COLORS[em.label]
                      return (
                        <div key={em.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl"
                             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.1)' }}>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Editable email */}
                              <EditableText value={em.email} onChange={v => updateEmail(active.id, em.id, 'email', v)}
                                style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(226,232,240,0.85)' }}
                                placeholder="email@example.com" />
                              <span className="px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ fontSize: '9px', background: lc.bg, color: lc.text }}>
                                {lc.label}
                              </span>
                            </div>
                            {/* Editable person name */}
                            <EditableText value={em.person_name} onChange={v => updateEmail(active.id, em.id, 'person_name', v)}
                              style={{ fontSize: '11px', color: 'rgba(100,116,139,0.55)', marginTop: '2px', display: 'block' }}
                              placeholder="Person name" />
                          </div>

                          {/* Label dropdown */}
                          <select value={em.label}
                                  onChange={e => updateEmail(active.id, em.id, 'label', e.target.value)}
                                  className="text-xs rounded-lg px-2 py-1 outline-none"
                                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.7)',
                                           border: '1px solid rgba(99,102,241,0.15)', colorScheme: 'dark', fontSize: '10px' }}>
                            {LABEL_OPTIONS.map(l => (
                              <option key={l} value={l}>{LABEL_COLORS[l].label}</option>
                            ))}
                          </select>

                          {/* Delete */}
                          <button onClick={() => removeEmail(active.id, em.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                                  style={{ color: 'rgba(239,68,68,0.5)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}>
                            ✕
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Add email */}
                {showAddEmail ? (
                  <div className="rounded-xl p-4 flex flex-col gap-3"
                       style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="flex gap-2">
                      <input value={newEmail.email} placeholder="email@example.com" autoFocus
                             onChange={e => setNewEmail(n => ({ ...n, email: e.target.value }))}
                             onKeyDown={e => e.key === 'Enter' && addEmail()}
                             className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                             style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)',
                                      border: '1px solid rgba(99,102,241,0.25)', fontSize: '12px' }} />
                      <input value={newEmail.name} placeholder="Person name"
                             onChange={e => setNewEmail(n => ({ ...n, name: e.target.value }))}
                             onKeyDown={e => e.key === 'Enter' && addEmail()}
                             className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                             style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)',
                                      border: '1px solid rgba(99,102,241,0.25)', fontSize: '12px' }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {LABEL_OPTIONS.map(l => {
                          const lc = LABEL_COLORS[l]
                          return (
                            <button key={l} type="button"
                                    onClick={() => setNewEmail(n => ({ ...n, label: l }))}
                                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                    style={{
                                      background: newEmail.label === l ? lc.bg : 'rgba(255,255,255,0.04)',
                                      color:      newEmail.label === l ? lc.text : 'rgba(100,116,139,0.5)',
                                      border:     `1px solid ${newEmail.label === l ? lc.text + '55' : 'rgba(255,255,255,0.06)'}`,
                                    }}>
                              {lc.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <button onClick={() => setShowAddEmail(false)}
                                className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ color: 'rgba(100,116,139,0.6)', background: 'rgba(255,255,255,0.04)' }}>
                          Cancel
                        </button>
                        <button onClick={addEmail}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                                         border: '1px solid rgba(99,102,241,0.4)' }}>
                          Add ↵
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddEmail(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all w-full"
                          style={{ border: '1px dashed rgba(99,102,241,0.25)', color: 'rgba(99,102,241,0.6)', background: 'transparent' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = 'rgba(99,102,241,0.6)' }}>
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>＋</span>
                    <span>Add email address to {active.name}</span>
                  </button>
                )}

                {/* How it works */}
                <div className="rounded-xl p-3 mt-1"
                     style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>How it works: </span>
                    <strong style={{ color: 'rgba(226,232,240,0.7)' }}>Primary</strong> auto-fills the From address when creating a task.
                    {' '}<strong style={{ color: 'rgba(226,232,240,0.7)' }}>Delegate</strong> appears as an option to assign the task.
                    {' '}<strong style={{ color: 'rgba(226,232,240,0.7)' }}>CC</strong> is copied on any email sent for this company.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full" style={{ color: 'rgba(100,116,139,0.35)' }}>
                Select a company on the left
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
