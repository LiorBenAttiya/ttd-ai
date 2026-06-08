import { useState, useRef } from 'react'
import { previewExcelImport, confirmExcelImport } from '@/services/api'
import type { ImportPreview } from '@/services/api'

interface Props { onClose: () => void; onImported: () => void }

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Business', color: '#60A5FA' },
  2: { label: 'Personal', color: '#FBBF24' },
  3: { label: 'General',  color: '#34D399' },
}

export default function ExcelImportModal({ onClose, onImported }: Props) {
  const [step, setStep]         = useState<'pick' | 'preview' | 'done'>('pick')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [preview, setPreview]   = useState<ImportPreview | null>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [inserted, setInserted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    if (!f.name.endsWith('.xlsx')) { setError('Only .xlsx files are supported'); return }
    setFile(f)
    setError('')
    setLoading(true)
    try {
      const result = await previewExcelImport(f)
      setPreview(result)
      setStep('preview')
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const result = await confirmExcelImport(file)
      setInserted(result.inserted)
      setStep('done')
      onImported()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full mx-4 rounded-2xl overflow-hidden flex flex-col"
           style={{ maxWidth: 520, maxHeight: '85vh',
                    background: 'rgba(13,17,28,0.98)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(52,211,153,0.12)',
                      background: 'rgba(52,211,153,0.05)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>📥</span>
            <span className="font-bold" style={{ fontSize: 14, color: '#F1F5F9' }}>
              Import Tasks from Excel
            </span>
          </div>
          <button onClick={onClose}
                  style={{ color: '#475569', fontSize: 18, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>✕</button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">

          {/* STEP: PICK */}
          {step === 'pick' && (
            <>
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
                Upload your <strong style={{ color: '#CBD5E1' }}>משימות ליאור.xlsx</strong> (or any task Excel).
                Expected columns: <code style={{ color: '#34D399' }}>TASK</code>,{' '}
                <code style={{ color: '#34D399' }}>TYPE</code>,{' '}
                <code style={{ color: '#34D399' }}>COMPANY</code>.
                All tasks land in <strong style={{ color: '#60A5FA' }}>To Do</strong>.
              </p>

              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(52,211,153,0.6)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)' }}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'
                  const f = e.dataTransfer.files[0]
                  if (f) handleFile(f)
                }}
                style={{
                  border: '2px dashed rgba(52,211,153,0.2)',
                  borderRadius: 16, padding: '36px 24px',
                  textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(52,211,153,0.03)',
                  transition: 'border-color 0.2s',
                }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
                <p style={{ fontSize: 14, color: '#34D399', fontWeight: 700 }}>
                  {loading ? 'Parsing…' : 'Click or drag & drop your .xlsx file'}
                </p>
                <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                  Only .xlsx files · Tasks sheet · Max 1,000 rows
                </p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
                     onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && preview && (
            <>
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Total', count: preview.total, color: '#F1F5F9', bg: 'rgba(255,255,255,0.07)' },
                  { label: 'MEP', count: preview.summary.MEP, color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
                  { label: 'LBA Tech', count: preview.summary.LBATECH, color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
                  { label: 'Personal', count: preview.summary.Personal, color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
                  { label: 'Other', count: preview.summary.Other, color: '#94A3B8', bg: 'rgba(148,163,184,0.08)' },
                ].map(chip => (
                  <div key={chip.label}
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                       style={{ background: chip.bg, border: `1px solid ${chip.color}33` }}>
                    <span className="font-bold" style={{ fontSize: 15, color: chip.color }}>{chip.count}</span>
                    <span style={{ fontSize: 11, color: chip.color, opacity: 0.7 }}>{chip.label}</span>
                  </div>
                ))}
                {preview.skipped > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                       style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <span className="font-bold" style={{ fontSize: 15, color: '#F87171' }}>{preview.skipped}</span>
                    <span style={{ fontSize: 11, color: '#F87171', opacity: 0.7 }}>skipped (blank)</span>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 12, color: '#64748B' }}>
                Preview of first 10 rows — all {preview.total} will be imported into <strong style={{ color: '#60A5FA' }}>To Do</strong>
              </p>

              {/* Row preview table */}
              <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 260 }}>
                {preview.rows.slice(0, 10).map((r, i) => {
                  const p = PRIORITY_LABEL[r.priority] ?? PRIORITY_LABEL[3]
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                           style={{ background: p.color }} />
                      <span className="flex-1 truncate" style={{ fontSize: 12, color: '#CBD5E1' }}>
                        {r.description}
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                            style={{ fontSize: 10, background: p.color + '18', color: p.color }}>
                        {p.label}
                      </span>
                    </div>
                  )
                })}
                {preview.rows.length > 10 && (
                  <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '4px 0' }}>
                    + {preview.rows.length - 10} more tasks…
                  </p>
                )}
              </div>
            </>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div style={{ fontSize: 48 }}>✅</div>
              <p className="font-bold" style={{ fontSize: 16, color: '#34D399' }}>
                {inserted} tasks imported!
              </p>
              <p style={{ fontSize: 13, color: '#64748B' }}>
                All tasks are now in your <strong style={{ color: '#60A5FA' }}>To Do</strong> column.
                Move what you want to focus on into <strong style={{ color: '#FBBF24' }}>In Progress</strong>.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-xl"
                 style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <p style={{ fontSize: 12, color: '#F87171' }}>⚠️ {error}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-5 py-4 flex-shrink-0"
             style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {step === 'done' ? (
            <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl font-bold"
                    style={{ fontSize: 13, background: 'rgba(52,211,153,0.15)',
                             color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
              Close
            </button>
          ) : (
            <>
              <button onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl font-semibold"
                      style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)',
                               color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}>
                Cancel
              </button>
              {step === 'preview' && (
                <>
                  <button onClick={() => { setStep('pick'); setPreview(null); setFile(null) }}
                          className="px-4 py-2.5 rounded-xl font-semibold"
                          style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)',
                                   color: '#94A3B8', border: '1px solid rgba(255,255,255,0.07)' }}>
                    ← Back
                  </button>
                  <button onClick={handleConfirm} disabled={loading}
                          className="flex-1 py-2.5 rounded-xl font-bold"
                          style={{ fontSize: 13,
                                   background: loading ? 'rgba(52,211,153,0.3)' : 'rgba(52,211,153,0.85)',
                                   color: '#fff', border: '1px solid rgba(52,211,153,0.6)',
                                   boxShadow: loading ? 'none' : '0 0 16px rgba(52,211,153,0.25)' }}>
                    {loading ? 'Importing…' : `✅ Import ${preview?.total ?? ''} Tasks`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
