import { useState } from 'react'
import { useCreateTask } from '@/hooks/useTasks'
import { COMPANIES } from '@/data/config'

interface Props { onClose: () => void }

interface ParsedTask {
  id: string
  description: string
  priority: 1 | 2 | 3
  company: string
  due_date: string
  notes: string
  include: boolean
}

const PRIORITIES = [
  { value: 1 as const, label: '🔴 Business' },
  { value: 2 as const, label: '🟡 Personal' },
  { value: 3 as const, label: '🟢 General' },
]

function detectPriority(text: string): 1 | 2 | 3 {
  const lower = text.toLowerCase()
  if (lower.includes('urgent') || lower.includes('business') || lower.includes('דחוף') || lower.includes('עסקי')) return 1
  if (lower.includes('personal') || lower.includes('אישי')) return 2
  return 3
}

function parseNotes(raw: string): ParsedTask[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2 && !line.startsWith('#') && !line.startsWith('//'))
    .map((line, i) => {
      // Strip common list prefixes: -, •, *, 1., 2. etc
      const cleaned = line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
      return {
        id: `import-${i}`,
        description: cleaned,
        priority: detectPriority(cleaned),
        company: '',
        due_date: '',
        notes: '',
        include: true,
      }
    })
    .filter(t => t.description.length > 2)
}

export default function NotesImportModal({ onClose }: Props) {
  const [step, setStep]         = useState<'paste' | 'review' | 'uploading' | 'done'>('paste')
  const [raw, setRaw]           = useState('')
  const [tasks, setTasks]       = useState<ParsedTask[]>([])
  const [uploaded, setUploaded] = useState(0)
  const [errors, setErrors]     = useState<string[]>([])

  const { mutateAsync: createTask } = useCreateTask()

  function handleParse() {
    const parsed = parseNotes(raw)
    if (!parsed.length) return
    setTasks(parsed)
    setStep('review')
  }

  function updateTask(id: string, field: keyof ParsedTask, value: any) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  async function handleUpload() {
    const toUpload = tasks.filter(t => t.include && t.description.trim())
    setStep('uploading')
    setUploaded(0)
    const errs: string[] = []

    for (const t of toUpload) {
      try {
        await createTask({
          description: t.description,
          priority:    t.priority,
          due_date:    t.due_date || undefined,
        })
        setUploaded(n => n + 1)
      } catch (e: any) {
        errs.push(`❌ "${t.description.slice(0,40)}…" — ${e.message}`)
      }
    }

    setErrors(errs)
    setStep('done')
  }

  const selectedCount = tasks.filter(t => t.include).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full mx-4 rounded-2xl overflow-hidden flex flex-col"
           style={{ maxWidth: step === 'review' ? 860 : 560, maxHeight: '90vh',
                    background: 'rgba(11,15,25,0.98)', border: '1px solid rgba(59,130,246,0.25)',
                    boxShadow: '0 32px 100px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.07)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '20px' }}>📋</span>
            <div>
              <h2 className="font-bold tracking-tight" style={{ fontSize: '15px', color: '#F1F5F9' }}>
                Import from iPhone Notes
              </h2>
              <p style={{ fontSize: '11px', color: '#475569', marginTop: 2 }}>
                {step === 'paste'     && 'Paste your notes — one task per line'}
                {step === 'review'    && `Review ${tasks.length} tasks before uploading`}
                {step === 'uploading' && `Uploading ${selectedCount} tasks…`}
                {step === 'done'      && `Done! ${uploaded} tasks uploaded`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#475569', fontSize: '18px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>✕</button>
        </div>

        {/* ── STEP 1: Paste ── */}
        {step === 'paste' && (
          <div className="flex flex-col gap-4 p-6">
            <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <p style={{ fontSize: '12px', color: '#93C5FD', lineHeight: 1.6 }}>
                Copy your Notes from iPhone and paste below. Each line becomes a task.
                Lines starting with -, •, or numbers are cleaned automatically.
                Hebrew text is fully supported. ✓
              </p>
            </div>
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder={`Paste your notes here…\n\nExample:\n- Call David about the contract\n- לסיים את הדוח השנתי\n- Book flights to Dubai\n- Review Q2 financials with Avi`}
              rows={14}
              autoFocus
              className="w-full rounded-xl px-4 py-3 resize-none outline-none task-desc"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#E2E8F0',
                       border: '1px solid rgba(59,130,246,0.2)', fontSize: '13px',
                       lineHeight: '1.7', fontFamily: 'inherit' }}
              onFocus={e  => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
              onBlur={e   => (e.target.style.borderColor = 'rgba(59,130,246,0.2)')} />
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', color: '#475569' }}>
                {raw.split('\n').filter(l => l.trim().length > 2).length} lines detected
              </span>
              <div className="flex gap-2">
                <button onClick={onClose}
                        className="px-4 py-2 rounded-xl font-medium"
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', color: '#475569' }}>
                  Cancel
                </button>
                <button onClick={handleParse} disabled={raw.trim().length < 3}
                        className="px-5 py-2 rounded-xl font-bold transition-all"
                        style={{ fontSize: '13px',
                                 background: raw.trim().length > 2 ? 'rgba(59,130,246,0.85)' : 'rgba(59,130,246,0.3)',
                                 color: '#fff', boxShadow: raw.trim().length > 2 ? '0 0 16px rgba(59,130,246,0.3)' : 'none' }}>
                  Parse tasks →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review table ── */}
        {step === 'review' && (
          <div className="flex flex-col overflow-hidden flex-1 min-h-0">
            {/* Table header */}
            <div className="flex-shrink-0 px-4 py-2 grid gap-2 text-xs font-semibold uppercase tracking-wider"
                 style={{ gridTemplateColumns: '32px 1fr 130px 140px 110px 80px',
                          color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: 'rgba(4,7,14,0.8)' }}>
              <span>✓</span>
              <span>Task description</span>
              <span>Priority</span>
              <span>Company</span>
              <span>Due date</span>
              <span>Remove</span>
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 overflow-y-auto">
              {tasks.map((t, idx) => (
                <div key={t.id}
                     className="grid gap-2 px-4 py-2 items-center"
                     style={{ gridTemplateColumns: '32px 1fr 130px 140px 110px 80px',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                              opacity: t.include ? 1 : 0.35 }}>

                  {/* Include checkbox */}
                  <div onClick={() => updateTask(t.id, 'include', !t.include)}
                       className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                       style={{ background: t.include ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.08)',
                                border: `1px solid ${t.include ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.15)'}` }}>
                    {t.include && <span style={{ fontSize: '11px', color: '#fff' }}>✓</span>}
                  </div>

                  {/* Description */}
                  <input value={t.description} onChange={e => updateTask(t.id, 'description', e.target.value)}
                         className="rounded-lg px-2.5 py-1.5 outline-none task-desc w-full"
                         style={{ background: 'rgba(255,255,255,0.05)', color: '#E2E8F0',
                                  border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px' }}
                         onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.4)')}
                         onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />

                  {/* Priority */}
                  <select value={t.priority} onChange={e => updateTask(t.id, 'priority', Number(e.target.value) as 1|2|3)}
                          className="rounded-lg px-2 py-1.5 outline-none w-full"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8',
                                   border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', colorScheme: 'dark' }}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>

                  {/* Company */}
                  <select value={t.company} onChange={e => updateTask(t.id, 'company', e.target.value)}
                          className="rounded-lg px-2 py-1.5 outline-none w-full"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8',
                                   border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', colorScheme: 'dark' }}>
                    <option value="">— None —</option>
                    {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
                  </select>

                  {/* Due date */}
                  <input type="date" value={t.due_date} onChange={e => updateTask(t.id, 'due_date', e.target.value)}
                         className="rounded-lg px-2 py-1.5 outline-none w-full"
                         style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8',
                                  border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', colorScheme: 'dark' }} />

                  {/* Remove */}
                  <button onClick={() => setTasks(prev => prev.filter(x => x.id !== t.id))}
                          className="px-2 py-1 rounded-lg text-xs transition-all"
                          style={{ color: 'rgba(248,113,113,0.5)', background: 'transparent' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.5)')}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                 style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(4,7,14,0.8)' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '12px', color: '#475569' }}>
                  {selectedCount} of {tasks.length} tasks selected
                </span>
                <button onClick={() => setTasks(prev => prev.map(t => ({ ...t, include: true })))}
                        style={{ fontSize: '11px', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Select all
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('paste')}
                        className="px-4 py-2 rounded-xl font-medium"
                        style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', color: '#475569' }}>
                  ← Back
                </button>
                <button onClick={handleUpload} disabled={selectedCount === 0}
                        className="px-5 py-2 rounded-xl font-bold transition-all"
                        style={{ fontSize: '13px',
                                 background: selectedCount > 0 ? 'rgba(52,211,153,0.85)' : 'rgba(52,211,153,0.3)',
                                 color: '#0B0F19',
                                 boxShadow: selectedCount > 0 ? '0 0 16px rgba(52,211,153,0.3)' : 'none' }}>
                  Upload {selectedCount} tasks ↑
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Uploading ── */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center justify-center p-12 gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 0 32px rgba(59,130,246,0.5)' }}>
              <span style={{ fontSize: '28px' }}>⬆️</span>
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ fontSize: '16px', color: '#F1F5F9' }}>
                Uploading tasks…
              </p>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: 4 }}>
                {uploaded} / {selectedCount} uploaded
              </p>
            </div>
            <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="progress-bar-fill h-full rounded-full transition-all"
                   style={{ width: `${selectedCount > 0 ? (uploaded / selectedCount) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center p-12 gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
                 style={{ background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.5)',
                          boxShadow: '0 0 24px rgba(52,211,153,0.3)', fontSize: '30px' }}>
              ✅
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ fontSize: '16px', color: '#6EE7B7' }}>
                {uploaded} tasks imported successfully!
              </p>
              <p style={{ fontSize: '12px', color: '#475569', marginTop: 4 }}>
                They are now in your Kanban board under "To-Do"
              </p>
            </div>
            {errors.length > 0 && (
              <div className="w-full rounded-xl p-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p style={{ fontSize: '11px', color: '#FCA5A5', marginBottom: 4, fontWeight: 600 }}>
                  {errors.length} failed:
                </p>
                {errors.map((e, i) => <p key={i} style={{ fontSize: '11px', color: '#FCA5A5' }}>{e}</p>)}
              </div>
            )}
            <button onClick={onClose}
                    className="px-8 py-2.5 rounded-xl font-bold"
                    style={{ background: 'rgba(59,130,246,0.85)', color: '#fff', fontSize: '14px',
                             boxShadow: '0 0 16px rgba(59,130,246,0.3)' }}>
              View my tasks →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
