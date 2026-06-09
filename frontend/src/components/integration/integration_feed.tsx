import { useState, useEffect, useRef } from 'react'
import { fetchWAMessages, createTask, fetchEmailMessages, fetchEmailAuthUrl, fetchEmailStatus, fetchEmailBody, fetchEmailAccounts, renameEmailAccount, fetchAIInbox, triggerDailyReport, type AISuggestion } from '@/services/api'
import type { WAMessageRaw, EmailMessage, EmailBody } from '@/services/api'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { globalSearch } from '@/services/api'
import type { GlobalSearchResult } from '@/services/api'

type Tab = 'whatsapp' | 'approvals' | string  // email tabs = account email address
interface Props { selectedTaskId?: string }

const PRIORITY_COLOR: Record<number, string> = { 1: '#F87171', 2: '#FBBF24', 3: '#34D399' }
const TYPE_COLOR: Record<string, string> = {
  task: '#818CF8', contact: '#34D399', email: '#60A5FA',
  message: '#25D366', mailbox: '#F59E0B',
}

/* ── Mock data shown when backend is offline ── */
const NOW = Math.floor(Date.now() / 1000)
const MOCK_WA: WAMessageRaw[] = [
  { id: 'mock1', body: 'Hi Lior, the Q2 finance report is ready for your review. I sent it to your email as well. Let me know if you need any adjustments before Monday.', type: 'chat', timestamp: NOW - 420, fromMe: true, hasMedia: false, duration: null },
  { id: 'mock2', body: 'MEP OSM project update: Site inspection completed ✅ Contractor confirmed materials delivery for Thursday. Budget still on track.', type: 'chat', timestamp: NOW - 3600, fromMe: true, hasMedia: false, duration: null },
  { id: 'mock3', body: 'Follow up with Bank of America re: credit line extension — they need the updated financial statements by end of week.', type: 'chat', timestamp: NOW - 7200, fromMe: true, hasMedia: false, duration: null },
  { id: 'mock4', body: 'Call Dani @ Merrill Edge tomorrow 14:00 about portfolio rebalancing. Confirm appointment.', type: 'chat', timestamp: NOW - 18000, fromMe: true, hasMedia: false, duration: null },
  { id: 'mock5', body: 'SAP B1 sync issue resolved — IT confirmed the new API token is active. Re-test the inventory module this week.', type: 'chat', timestamp: NOW - 86400, fromMe: true, hasMedia: false, duration: null },
]
const MOCK_EMAILS: EmailMessage[] = [
  { id: 'me1', subject: 'Q2 Financial Report — Action Required', sender_name: 'CFO Office', sender_email: 'cfo@lbatech.com', preview: 'Please review the attached Q2 report and provide sign-off by Monday.', received_at: new Date(Date.now() - 1800000).toISOString(), is_read: false, is_flagged: true, has_attachments: true, account: 'lior@lbatech.com' },
  { id: 'me2', subject: 'MEP Project — Site Inspection Summary', sender_name: 'Yossi Levi', sender_email: 'yossi@mepsltn.com', preview: 'Site inspection completed. Contractor confirmed materials delivery for Thursday.', received_at: new Date(Date.now() - 7200000).toISOString(), is_read: false, is_flagged: false, has_attachments: false, account: 'lior@lbatech.com' },
  { id: 'me3', subject: 'Bank of America — Credit Line Review', sender_name: 'B of A Business', sender_email: 'business@bofa.com', preview: 'Your credit line review is scheduled. Please submit updated financials.', received_at: new Date(Date.now() - 14400000).toISOString(), is_read: true, is_flagged: true, has_attachments: false, account: 'lior@lbatech.com' },
  { id: 'me4', subject: 'SAP B1 Integration — Token Renewed', sender_name: 'IT Support', sender_email: 'it@lbatech.com', preview: 'The SAP B1 API token has been renewed. Please re-test the inventory module.', received_at: new Date(Date.now() - 28800000).toISOString(), is_read: true, is_flagged: false, has_attachments: false, account: 'lior@lbatech.com' },
  { id: 'me5', subject: 'Monday.com — Weekly Sprint Summary', sender_name: 'monday.com', sender_email: 'noreply@monday.com', preview: 'Your weekly sprint summary is ready. 3 items completed, 2 in progress.', received_at: new Date(Date.now() - 86400000).toISOString(), is_read: true, is_flagged: false, has_attachments: false, account: 'lior@lbatech.com' },
]


export default function IntegrationFeed({ selectedTaskId: _ }: Props) {
  const [tab, setTab]           = useState<Tab>('whatsapp')
  const [input, setInput]       = useState('')
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<GlobalSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // ── WA live feed ──────────────────────────────────────────────
  const [waMessages,  setWaMessages]  = useState<WAMessageRaw[]>([])
  const [waStatus,    setWaStatus]    = useState<'loading'|'ready'|'offline'|'connecting'>('loading')
  const [waCreating,  setWaCreating]  = useState<string|null>(null)  // id of msg being turned into task
  const [waCreated,   setWaCreated]   = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  // ── Email accounts + per-account data ───────────────────────
  const [emailAccounts,  setEmailAccounts]  = useState<{ email: string; name: string }[]>([])
  const [renamingTab,    setRenamingTab]    = useState<string | null>(null)
  const [renameValue,    setRenameValue]    = useState('')
  const [emailData,      setEmailData]      = useState<Record<string, { messages: EmailMessage[]; status: 'loading'|'connected'|'disconnected' }>>({})
  // ── AI Inbox state ───────────────────────────────────────────
  const [aiSuggestions,  setAiSuggestions]  = useState<AISuggestion[]>([])
  const [aiLoading,      setAiLoading]      = useState(false)
  const [aiAnalyzedAt,   setAiAnalyzedAt]   = useState<string | null>(null)
  const [aiSources,      setAiSources]      = useState<{ wa_messages: number; emails: number } | null>(null)
  const [aiDismissed,    setAiDismissed]    = useState<Set<string>>(new Set())
  const [aiCreated,      setAiCreated]      = useState<Set<string>>(new Set())
  const [reportSending,  setReportSending]  = useState(false)
  const [reportSent,     setReportSent]     = useState(false)

  const [emailCreating,  setEmailCreating]  = useState<string|null>(null)
  const [emailCreated,   setEmailCreated]   = useState<Set<string>>(new Set())

  // Derived: active email account (tab key = email address)
  const activeAccount = emailAccounts.find(a => a.email === tab)?.email ?? ''
  const emailMessages = emailData[activeAccount]?.messages ?? []
  const emailStatus   = emailData[activeAccount]?.status ?? 'loading'

  useEffect(() => {
    if (tab !== 'whatsapp') return
    let cancelled = false
    async function load() {
      try {
        const res = await fetchWAMessages(60)
        if (cancelled) return
        if (res.status === 'ready' && res.messages) {
          setWaMessages(res.messages)
          setWaStatus('ready')
        } else if (res.status === 'connecting') {
          setWaStatus('connecting')
        } else {
          setWaStatus('offline')
          setWaMessages(prev => prev.length === 0 ? MOCK_WA : prev)
        }
      } catch {
        if (!cancelled) {
          setWaStatus('offline')
          setWaMessages(prev => prev.length === 0 ? MOCK_WA : prev)
        }
      }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [tab])

  // Load accounts on mount + when URL has ?email_connected
  useEffect(() => {
    async function loadAccounts() {
      try {
        const { accounts } = await fetchEmailAccounts()
        setEmailAccounts(accounts)
        // Auto-switch to newly connected account
        const params = new URLSearchParams(window.location.search)
        const newAccount = params.get('account')
        if (newAccount && accounts.find(a => a.email === newAccount)) {
          setTab(newAccount)
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch { /* ignore */ }
    }
    loadAccounts()
  }, [])

  // Poll inbox for the active email account tab
  useEffect(() => {
    if (!emailAccounts.find(a => a.email === tab)) return
    let cancelled = false
    async function loadEmail() {
      try {
        const res = await fetchEmailMessages(50, tab)
        if (cancelled) return
        if (res.connected && res.messages) {
          setEmailData(prev => ({ ...prev, [tab]: { messages: res.messages!, status: 'connected' } }))
        } else {
          setEmailData(prev => ({ ...prev, [tab]: { messages: [], status: 'disconnected' } }))
        }
      } catch {
        if (!cancelled) setEmailData(prev => ({ ...prev, [tab]: { messages: [], status: 'disconnected' } }))
      }
    }
    loadEmail()
    const t = setInterval(loadEmail, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [tab])

  async function fetchAISuggestions() {
    setAiLoading(true)
    try {
      const res = await fetchAIInbox()
      setAiSuggestions(res.suggestions)
      setAiAnalyzedAt(res.analyzed_at)
      setAiSources(res.sources)
      setAiDismissed(new Set())
      setAiCreated(new Set())
    } catch { /* ignore */ }
    setAiLoading(false)
  }

  async function handleSendReport() {
    setReportSending(true)
    setReportSent(false)
    try {
      await triggerDailyReport()
      setReportSent(true)
      setTimeout(() => setReportSent(false), 5000)
    } catch { /* ignore */ }
    setReportSending(false)
  }

  function handleAICreateTask(s: AISuggestion) {
    setNewTaskModal({
      description: s.title,
      context:     s.context || (s.source_type === 'whatsapp' ? '📱 WhatsApp message' : '📧 Email'),
      priority:    s.priority,
      due_date:    s.due_date ?? '',
    })
    // Mark as "opened" so card shows pending state
    setAiCreated(prev => new Set([...prev, s.id]))
  }

  async function handleRenameTab(email: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) { setRenamingTab(null); return }
    try {
      await renameEmailAccount(email, trimmed)
      setEmailAccounts(prev => prev.map(a => a.email === email ? { ...a, name: trimmed } : a))
    } catch { /* ignore */ }
    setRenamingTab(null)
  }

  // ── Email reader modal ───────────────────────────────────────
  const [emailReader, setEmailReader] = useState<EmailBody | null>(null)
  const [emailReaderLoading, setEmailReaderLoading] = useState(false)

  // ── New Task Modal ───────────────────────────────────────────
  const [newTaskModal, setNewTaskModal] = useState<{
    description: string; context: string; priority: number; due_date: string
  } | null>(null)
  const [newTaskSaving, setNewTaskSaving] = useState(false)

  async function handleSaveNewTask() {
    if (!newTaskModal) return
    setNewTaskSaving(true)
    try {
      await createTask({
        description: newTaskModal.description,
        priority: newTaskModal.priority,
        due_date: newTaskModal.due_date || undefined,
      })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setNewTaskModal(null)
    } catch (e) {
      console.error('createTask failed', e)
    } finally {
      setNewTaskSaving(false)
    }
  }

  async function handleOpenEmail(email: EmailMessage) {
    setEmailReaderLoading(true)
    setEmailReader(null)
    try {
      const body = await fetchEmailBody(email.id, activeAccount)
      setEmailReader(body)
    } catch (e) {
      console.error('fetchEmailBody failed', e)
    } finally {
      setEmailReaderLoading(false)
    }
  }

  async function handleConnectOutlook() {
    try {
      const { auth_url } = await fetchEmailAuthUrl()
      window.open(auth_url, '_blank', 'width=500,height=700')
      // Poll for new account after OAuth popup
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const { accounts } = await fetchEmailAccounts()
        if (accounts.length > emailAccounts.length) {
          clearInterval(poll)
          setEmailAccounts(accounts)
          const newest = accounts[accounts.length - 1]
          setTab(newest.email)
        }
        if (attempts > 30) clearInterval(poll)
      }, 2000)
    } catch (e) {
      console.error('Outlook connect failed', e)
    }
  }

  async function handleCreateEmailTask(email: EmailMessage) {
    if (emailCreating || emailCreated.has(email.id)) return
    setEmailCreating(email.id)
    try {
      await createTask({
        description: email.subject.length > 200 ? email.subject.slice(0, 200) : email.subject,
        priority: email.is_flagged ? 1 : 3,
      })
      setEmailCreated(prev => new Set(prev).add(email.id))
      qc.invalidateQueries({ queryKey: ['tasks'] })
    } catch (e) {
      console.error('createTask from email failed', e)
    } finally {
      setEmailCreating(null)
    }
  }

  async function handleCreateTask(msg: WAMessageRaw) {
    if (waCreating || waCreated.has(msg.id)) return
    setWaCreating(msg.id)
    try {
      await createTask({
        description: msg.body.length > 200 ? msg.body.slice(0, 200) + '...' : msg.body,
        priority: 3,
      })
      setWaCreated(prev => new Set(prev).add(msg.id))
      qc.invalidateQueries({ queryKey: ['tasks'] })
    } catch (e) {
      console.error('createTask from WA failed', e)
    } finally {
      setWaCreating(null)
    }
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const backendResults = await globalSearch(query.trim()).catch(() => [])
        const seen = new Set<string>()
        const merged: GlobalSearchResult[] = []
        for (const r of backendResults) {
          if (!seen.has(r.id)) { seen.add(r.id); merged.push(r) }
        }
        merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        setResults(merged)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }, [query])

  const emailTabs = emailAccounts.map(a => ({
    key:   a.email,
    label: a.name || a.email.split('@')[0],
    badge: (emailData[a.email]?.messages ?? []).filter(e => !e.is_read).length || undefined,
  }))

  const DEMO_MAIL_KEY = '__demo_mail__'
  const demoMailTabs: typeof emailTabs = emailAccounts.length === 0
    ? [{ key: DEMO_MAIL_KEY, label: 'Outlook', badge: MOCK_EMAILS.filter(e => !e.is_read).length || undefined }]
    : []

  const tabs: { key: Tab; label: string; badge?: number; isAdd?: boolean }[] = [
    { key: 'whatsapp', label: 'WhatsApp' },
    ...demoMailTabs,
    ...emailTabs,
    { key: '__add__', label: emailAccounts.length === 0 ? '⚡ Connect Mail' : '+ Mail', isAdd: true },
    { key: 'approvals', label: 'AI Inbox' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center flex-shrink-0 px-3 pt-1"
           style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        {tabs.map(({ key, label, badge, isAdd }) => {
          const isEmailTab = emailAccounts.some(a => a.email === key)
          const isRenaming = renamingTab === key
          return (
            <div key={key} className="relative flex items-center">
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameTab(key, renameValue)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameTab(key, renameValue)
                    if (e.key === 'Escape') setRenamingTab(null)
                  }}
                  style={{ fontSize: '12px', width: 80, background: '#E2E8F0',
                           border: '1px solid #CBD5E1', borderRadius: 4,
                           color: '#F1F5F9', padding: '2px 6px', outline: 'none' }}
                />
              ) : (
                <button
                  onClick={() => isAdd ? handleConnectOutlook() : setTab(key)}
                  onDoubleClick={() => {
                    if (isEmailTab) { setRenamingTab(key); setRenameValue(label) }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 font-semibold tracking-tight transition-all ${!isAdd && tab === key ? 'tab-active' : 'tab-inactive'}`}
                  style={{ fontSize: '12px', color: isAdd ? '#475569' : undefined }}
                  title={isEmailTab ? 'Double-click to rename' : undefined}>
                  {label}
                  {badge ? (
                    <span className="px-1.5 py-0.5 rounded-full font-bold"
                          style={{ fontSize: '9px', minWidth: '16px', textAlign: 'center',
                                   background: key === 'approvals' ? 'rgba(59,130,246,0.7)' : 'rgba(0,120,212,0.7)',
                                   color: '#fff' }}>
                      {badge}
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          )
        })}
      </div>


            {/* Feed */}
      <div className="flex-1 overflow-y-auto">

        {/* WhatsApp — live feed */}
        {tab === 'whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', flexShrink: 0,
              background: '#ffffff',
              borderBottom: '1px solid rgba(30,58,138,0.04)',
              fontSize: 11, color: '#334155',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: waStatus === 'ready' ? '#25D366' : waStatus === 'connecting' ? '#FBBF24' : '#F87171',
                boxShadow: waStatus === 'ready' ? '0 0 6px #25D366' : undefined,
              }} />
              <span style={{ color: waStatus === 'ready' ? '#25D366' : waStatus === 'connecting' ? '#FBBF24' : '#F87171', fontWeight: 600 }}>
                {waStatus === 'ready' ? 'Connected — Saved Messages' : waStatus === 'connecting' ? 'Connecting… scan QR in terminal' : 'WA Bridge offline'}
              </span>
              {waStatus === 'ready' && (
                <span style={{ marginLeft: 'auto' }}>{waMessages.length} messages</span>
              )}
            </div>

            {/* Connecting state */}
            {waStatus === 'connecting' && (
              <div style={{ padding: '6px 14px', background: '#FEF3C7', borderBottom: '1px solid #FDE68A', fontSize: 11, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📱</span> Scan QR in terminal — WhatsApp → Settings → Linked Devices → Link a Device
              </div>
            )}

            {/* Offline banner — subtle, non-blocking */}
            {waStatus === 'offline' && (
              <div style={{ padding: '5px 14px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA', fontSize: 11, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', display: 'inline-block', flexShrink: 0 }} />
                Bridge offline — showing cached data  · 
                <code style={{ fontSize: 10, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4 }}>cd wa-bridge && node index.js</code>
              </div>
            )}

            {/* Messages — shown for both ready and offline (mock) */}
            {(waStatus === 'ready' || waStatus === 'offline') && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waMessages.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 40 }}>
                    No messages in Saved Messages yet.
                  </p>
                )}
                {waMessages.map(msg => {
                  const isVoice  = msg.type === 'ptt' || msg.type === 'audio'
                  const hasBody  = msg.body && msg.body.trim().length > 0
                  const created  = waCreated.has(msg.id)
                  const creating = waCreating === msg.id
                  const ts = new Date(msg.timestamp * 1000)
                  const timeStr = ts.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const dateStr = ts.toLocaleDateString('en', { day: 'numeric', month: 'short' })

                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <div style={{
                        maxWidth: '82%', padding: '9px 13px', borderRadius: '14px 14px 4px 14px',
                        background: '#DCF8CE',
                        border: '1px solid #B9F0A0',
                        position: 'relative',
                      }}>
                        {isVoice ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🎙</span>
                            <span style={{ fontSize: 12, color: '#065F46' }}>
                              Voice note{msg.duration ? ` · ${msg.duration}s` : ''}
                            </span>
                          </div>
                        ) : (
                          <p className="task-desc" style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.body}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 5 }}>
                          <span style={{ fontSize: 10, color: '#64748B' }}>{dateStr} {timeStr}</span>
                          <span style={{ fontSize: 11, color: '#25D366' }}>✓✓</span>
                        </div>
                      </div>

                      {/* → Task button */}
                      {(hasBody || isVoice) && (
                        <button
                          onClick={() => handleCreateTask(msg)}
                          disabled={created || creating}
                          style={{
                            fontSize: 10, fontWeight: 700, cursor: created ? 'default' : 'pointer',
                            padding: '3px 10px', borderRadius: 20,
                            background: created ? '#DCFCE7' : '#DBEAFE',
                            color: created ? '#16A34A' : '#1D4ED8',
                            border: created ? '1px solid #BBF7D0' : '1px solid #BFDBFE',
                            transition: 'all 0.2s',
                          }}>
                          {creating ? 'Creating…' : created ? '✓ Task created' : '+ Create Task'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Demo Outlook tab — shown when no real accounts connected */}
        {tab === DEMO_MAIL_KEY && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '5px 14px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA', fontSize: 11, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', display: 'inline-block', flexShrink: 0 }} />
              Outlook not connected — showing cached data  · 
              <button onClick={handleConnectOutlook} style={{ fontSize: 10, color: '#1D4ED8', background: '#DBEAFE', border: '1px solid #BFDBFE', borderRadius: 4, padding: '1px 7px', cursor: 'pointer', fontWeight: 600 }}>Connect now</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {MOCK_EMAILS.map((email, i) => {
                const initials = (email.sender_name || email.sender_email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={email.id} className="row-hover"
                       style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, position: 'relative', background: '#DBEAFE', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 11 }}>
                      {initials}
                      {!email.is_read && (
                        <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', border: '1.5px solid #F8FAFC' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <span style={{ fontSize: 12, color: email.is_read ? '#94A3B8' : '#1E293B', fontWeight: email.is_read ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {email.sender_name || email.sender_email}
                        </span>
                        <span style={{ color: '#94A3B8', fontSize: 10, flexShrink: 0 }}>
                          {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: email.is_read ? '#CBD5E1' : '#475569', margin: '3px 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.subject}
                      </p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {email.is_flagged && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#FEE2E2', color: '#DC2626', fontWeight: 700 }}>🚩 Flagged</span>}
                        <button onClick={e => { e.stopPropagation() }}
                                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', cursor: 'pointer', fontWeight: 600 }}>
                          + Task
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Email account tabs — one per connected account */}
        {emailAccounts.find(a => a.email === tab) && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', flexShrink: 0,
              background: '#ffffff',
              borderBottom: '1px solid rgba(30,58,138,0.04)',
              fontSize: 11,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: emailStatus === 'connected' ? '#0078D4' : emailStatus === 'loading' ? '#FBBF24' : '#475569',
                boxShadow: emailStatus === 'connected' ? '0 0 6px #0078D4' : undefined,
              }} />
              <span style={{ color: emailStatus === 'connected' ? '#60A5FA' : emailStatus === 'loading' ? '#FBBF24' : '#475569', fontWeight: 600 }}>
                {emailStatus === 'connected' ? 'Outlook connected' : emailStatus === 'loading' ? 'Connecting…' : 'Not connected'}
              </span>
              {emailStatus === 'connected' && (
                <span style={{ marginLeft: 'auto', color: '#334155' }}>{emailMessages.length} messages</span>
              )}
            </div>

            {/* Disconnected state */}
            {emailStatus === 'disconnected' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
                <span style={{ fontSize: 40 }}>{'📧'}</span>
                <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                  Connect your Outlook inbox to see live emails and create tasks from them.
                </p>
                <button
                  onClick={handleConnectOutlook}
                  style={{
                    padding: '10px 24px', borderRadius: 12, fontWeight: 700, fontSize: 13,
                    background: 'rgba(0,120,212,0.15)', color: '#0078D4',
                    border: '1px solid rgba(0,120,212,0.3)', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,120,212,0.28)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,120,212,0.15)')}>
                  Connect Outlook
                </button>
              </div>
            )}

            {/* Messages */}
            {emailStatus === 'connected' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {emailMessages.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 40 }}>Inbox is empty.</p>
                )}
                {emailMessages.map(email => {
                  const initials = email.sender_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  const created  = emailCreated.has(email.id)
                  const creating = emailCreating === email.id
                  const ts = new Date(email.received_at)
                  const timeAgo = formatDistanceToNow(ts, { addSuffix: true })
                  return (
                    <div key={email.id} className="row-hover"
                         onDoubleClick={() => handleOpenEmail(email)}
                         title="Double-click to read"
                         style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                                  padding: '12px 14px', borderBottom: '1px solid rgba(30,58,138,0.04)' }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, color: '#0078D4',
                        background: 'rgba(0,120,212,0.15)', border: '1px solid rgba(0,120,212,0.2)',
                      }}>{initials || '?'}</div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: email.is_read ? 500 : 700,
                                         color: email.is_read ? '#475569' : '#F1F5F9',
                                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {email.sender_name || email.sender_email}
                          </span>
                          <span style={{ fontSize: 10, color: '#334155', flexShrink: 0 }}>{timeAgo}</span>
                        </div>
                        <p style={{ fontSize: 12, margin: '2px 0 0', color: email.is_read ? '#334155' : '#94A3B8',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {email.subject && email.subject !== '(no subject)'
                            ? email.subject
                            : <span style={{ color: '#475569', fontStyle: 'italic', fontWeight: 400 }}>(no subject)</span>}
                        </p>
                        <p style={{ fontSize: 11, margin: '2px 0 0', color: '#1E293B',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {email.preview}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          {!email.is_read && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                                           background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>Unread</span>
                          )}
                          {email.is_flagged && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                                           background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>Flagged</span>
                          )}
                          {email.has_attachments && (
                            <span style={{ fontSize: 10, color: '#475569' }}>{'📎'}</span>
                          )}
                          <button
                            onClick={() => handleCreateEmailTask(email)}
                            disabled={created || creating}
                            style={{
                              marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                              padding: '3px 10px', borderRadius: 20, cursor: created ? 'default' : 'pointer',
                              background: created ? 'rgba(52,211,153,0.12)' : 'rgba(59,130,246,0.1)',
                              color: created ? '#34D399' : '#60A5FA',
                              border: created ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(59,130,246,0.2)',
                              transition: 'all 0.2s',
                            }}>
                            {creating ? 'Creating…' : created ? '✓ Task created' : '+ Create Task'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI Inbox ── */}
        {tab === 'approvals' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header bar */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #E2E8F0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gi1" x1="0" y1="0" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6366f1"/>
                        <stop offset="50%" stopColor="#3B82F6"/>
                        <stop offset="100%" stopColor="#06b6d4"/>
                      </linearGradient>
                      <linearGradient id="gi2" x1="0" y1="18" x2="18" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ec4899"/>
                        <stop offset="100%" stopColor="#818cf8"/>
                      </linearGradient>
                    </defs>
                    <path d="M9 1 L10.6 6.4 L16 8 L10.6 9.6 L9 15 L7.4 9.6 L2 8 L7.4 6.4 Z" fill="url(#gi1)"/>
                    <path d="M15 1 L15.8 3.6 L18 4.5 L15.8 5.4 L15 8 L14.2 5.4 L12 4.5 L14.2 3.6 Z" fill="url(#gi2)" opacity="0.8"/>
                    <path d="M3 12 L3.5 13.8 L5 14.5 L3.5 15.2 L3 17 L2.5 15.2 L1 14.5 L2.5 13.8 Z" fill="url(#gi1)" opacity="0.6"/>
                  </svg>
                  AI INBOX
                </span>
                {aiAnalyzedAt && aiSources && (
                  <span style={{ fontSize: 10, color: '#334155', marginLeft: 10 }}>
                    {aiSources.wa_messages} WA · {aiSources.emails} emails → {aiSuggestions.length - aiDismissed.size} suggestions
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleSendReport}
                  disabled={reportSending}
                  title="Generate & send daily report to WhatsApp Saved Messages"
                  style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                           background: reportSent ? 'rgba(52,211,153,0.18)' : reportSending ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.12)',
                           color: reportSent ? '#34D399' : '#FBBF24',
                           border: `1px solid ${reportSent ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.25)'}`,
                           cursor: reportSending ? 'default' : 'pointer' }}>
                  {reportSending ? '⏳ Sending…' : reportSent ? '✅ Sent to WA!' : '📲 Send Report'}
                </button>
                <button
                  onClick={fetchAISuggestions}
                  disabled={aiLoading}
                  style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 8,
                           background: aiLoading ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.18)',
                           color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)',
                           cursor: aiLoading ? 'default' : 'pointer' }}>
                  {aiLoading ? '⏳ Analyzing…' : '✨ Analyze Now'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '10px 12px' }}>
              {/* Empty / loading states */}
              {aiLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: 12, padding: '40px 0', color: '#475569' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%',
                                border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#818CF8',
                                animation: 'spin 0.9s linear infinite' }} />
                  <span style={{ fontSize: 13 }}>Claude is reading your messages…</span>
                </div>
              )}

              {!aiLoading && aiSuggestions.length === 0 && !aiAnalyzedAt && (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#334155' }}>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 16px rgba(99,102,241,0.25))' }}>
                      <defs>
                        <linearGradient id="gie1" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#6366f1"/>
                          <stop offset="45%" stopColor="#3B82F6"/>
                          <stop offset="100%" stopColor="#06b6d4"/>
                        </linearGradient>
                        <linearGradient id="gie2" x1="0" y1="56" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#ec4899"/>
                          <stop offset="100%" stopColor="#818cf8"/>
                        </linearGradient>
                        <radialGradient id="gie3" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#EEF2FF"/>
                          <stop offset="100%" stopColor="#F0F9FF"/>
                        </radialGradient>
                      </defs>
                      <circle cx="28" cy="28" r="28" fill="url(#gie3)"/>
                      <path d="M28 6 L32 20 L46 24 L32 28 L28 42 L24 28 L10 24 L24 20 Z" fill="url(#gie1)"/>
                      <path d="M44 6 L46 13 L52 16 L46 19 L44 26 L42 19 L36 16 L42 13 Z" fill="url(#gie2)" opacity="0.7"/>
                      <path d="M10 36 L11.5 41 L16 43 L11.5 45 L10 50 L8.5 45 L4 43 L8.5 41 Z" fill="url(#gie1)" opacity="0.5"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                    AI Inbox ready
                  </p>
                  <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                    Click <strong style={{ color: '#818CF8' }}>Analyze Now</strong> to scan your<br />
                    WhatsApp messages and emails for actionable tasks.
                  </p>
                </div>
              )}

              {!aiLoading && aiAnalyzedAt && aiSuggestions.filter(s => !aiDismissed.has(s.id)).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#334155' }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 13, color: '#64748B' }}>No actionable items found</p>
                </div>
              )}

              {/* Suggestion cards */}
              {!aiLoading && aiSuggestions.filter(s => !aiDismissed.has(s.id)).map(s => {
                const created = aiCreated.has(s.id)
                const priColor = s.priority === 1 ? '#F87171' : s.priority === 2 ? '#FBBF24' : '#34D399'
                const priLabel = s.priority === 1 ? 'High' : s.priority === 2 ? 'Med' : 'Low'
                const srcIcon  = s.source_type === 'whatsapp' ? '📱' : '📧'

                return (
                  <div key={s.id} style={{
                    marginBottom: 10, borderRadius: 12, padding: '12px 14px',
                    background: created ? 'rgba(52,211,153,0.05)' : 'rgba(99,102,241,0.06)',
                    border: `1px solid ${created ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.15)'}`,
                    transition: 'all 0.2s',
                  }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{srcIcon}</span>
                      <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#E2E8F0',
                                  margin: 0, lineHeight: 1.4 }}>
                        {s.title}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                                     background: `${priColor}20`, color: priColor, flexShrink: 0 }}>
                        {priLabel}
                      </span>
                    </div>

                    {/* Description */}
                    {s.description && (
                      <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 4px 22px', lineHeight: 1.5 }}>
                        {s.description}
                      </p>
                    )}

                    {/* Context + due date */}
                    <div style={{ display: 'flex', gap: 10, margin: '4px 0 10px 22px',
                                  fontSize: 10, color: '#475569', flexWrap: 'wrap' }}>
                      {s.context && <span>{s.context}</span>}
                      {s.due_date && <span style={{ color: '#FBBF24' }}>· Due {s.due_date}</span>}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginLeft: 22 }}>
                      {created ? (
                        <span style={{ fontSize: 11, color: '#34D399', fontWeight: 600 }}>✓ Task created</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAICreateTask(s)}
                            style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 8,
                                     background: 'rgba(52,211,153,0.12)', color: '#34D399',
                                     border: '1px solid rgba(52,211,153,0.2)', cursor: 'pointer' }}>
                            ✓ Create Task
                          </button>
                          <button
                            onClick={() => setAiDismissed(prev => new Set([...prev, s.id]))}
                            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                                     background: 'rgba(248,113,113,0.08)', color: '#F87171',
                                     border: '1px solid rgba(248,113,113,0.15)', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Email Reader Modal ── */}
      {(emailReader || emailReaderLoading) && (
        <div
          onClick={() => { setEmailReader(null); setEmailReaderLoading(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.08)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '720px', maxWidth: '95vw', maxHeight: '85vh',
              background: '#0B0F1C', borderRadius: 16,
              border: '1px solid #E2E8F0',
              boxShadow: '0 32px 80px rgba(15,23,42,0.08)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>

            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(30,58,138,0.06)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              {emailReaderLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%',
                                border: '2px solid rgba(0,120,212,0.3)', borderTopColor: '#0078D4',
                                animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#475569' }}>Loading email…</span>
                </div>
              ) : emailReader ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', margin: '0 0 6px', lineHeight: 1.3 }}>
                    {emailReader.subject}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 11, color: '#475569' }}>
                    <span><span style={{ color: '#334155' }}>From:</span> {emailReader.sender_name} {'<'}{emailReader.sender_email}{'>'}</span>
                    {emailReader.to.length > 0 && (
                      <span><span style={{ color: '#334155' }}>To:</span> {emailReader.to.join(', ')}</span>
                    )}
                    <span>{new Date(emailReader.received_at).toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {emailReader.has_attachments && <span>{'📎'} Attachments</span>}
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => { setEmailReader(null); setEmailReaderLoading(false) }}
                style={{ flexShrink: 0, background: 'rgba(30,58,138,0.06)', border: 'none',
                         borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                         color: '#64748B', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {'✕'}
              </button>
            </div>

            {/* Body */}
            {emailReader && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                {emailReader.body_html ? (
                  <iframe
                    srcDoc={`<html><head><style>
                      body { margin: 0; padding: 20px; font-family: -apple-system, Arial, sans-serif;
                             font-size: 14px; line-height: 1.6; color: #1e293b; background: #fff; }
                      a { color: #0078d4; } img { max-width: 100%; }
                    </style></head><body>${emailReader.body_html}</body></html>`}
                    sandbox="allow-same-origin"
                    style={{ width: '100%', height: '100%', minHeight: '400px', border: 'none' }}
                    title="Email body"
                  />
                ) : (
                  <pre style={{ padding: '20px', fontSize: 13, color: '#1E293B',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {emailReader.body_text || '(No content)'}
                  </pre>
                )}
              </div>
            )}

            {/* Footer */}
            {emailReader && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(30,58,138,0.06)',
                            display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => {
                    if (!emailReader) return
                    setNewTaskModal({
                      description: emailReader.subject,
                      context: `From: ${emailReader.sender_name} <${emailReader.sender_email}>`,
                      priority: emailReader.is_flagged ? 1 : 3,
                      due_date: '',
                    })
                    setEmailReader(null)
                    setEmailReaderLoading(false)
                  }}
                  style={{
                    padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 12,
                    background: 'rgba(59,130,246,0.1)', color: '#60A5FA',
                    border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer',
                  }}>
                  + Create Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Task Modal ── */}
      {newTaskModal && (
        <div
          onClick={() => setNewTaskModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(15,23,42,0.08)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '480px', maxWidth: '95vw',
              background: '#0B0F1C', borderRadius: 16,
              border: '1px solid #E2E8F0',
              boxShadow: '0 32px 80px rgba(15,23,42,0.08)',
              overflow: 'hidden',
            }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(30,58,138,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>New Task</span>
              <button onClick={() => setNewTaskModal(null)}
                      style={{ background: 'rgba(30,58,138,0.06)', border: 'none', borderRadius: 8,
                               width: 28, height: 28, cursor: 'pointer', color: '#64748B', fontSize: 16,
                               display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {'✕'}
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Context (read-only) */}
              <div style={{ fontSize: 11, color: '#475569', padding: '8px 12px',
                            background: '#F1F5F9', borderRadius: 8,
                            border: '1px solid #E2E8F0' }}>
                {newTaskModal.context}
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Task Description
                </label>
                <textarea
                  value={newTaskModal.description}
                  onChange={e => setNewTaskModal(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', resize: 'vertical',
                    background: '#F8FAFC', border: '1px solid #CBD5E1',
                    borderRadius: 10, outline: 'none', fontSize: 13, color: '#1E293B',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                  onFocus={e  => (e.target.style.borderColor = '#3B82F6')}
                  onBlur={e   => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Priority + Due Date row */}
              <div style={{ display: 'flex', gap: 12 }}>
                {/* Priority */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Priority
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { val: 1, label: 'High',   color: '#DC2626', bg: 'rgba(220,38,38,0.1)'   },
                      { val: 2, label: 'Med',    color: '#D97706', bg: 'rgba(217,119,6,0.1)'   },
                      { val: 3, label: 'Low',    color: '#16A34A', bg: 'rgba(22,163,74,0.1)'   },
                    ].map(p => (
                      <button key={p.val}
                        onClick={() => setNewTaskModal(prev => prev ? { ...prev, priority: p.val } : null)}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: newTaskModal.priority === p.val ? p.bg : '#F8FAFC',
                          color: newTaskModal.priority === p.val ? p.color : '#94A3B8',
                          border: newTaskModal.priority === p.val
                            ? `1px solid ${p.color}`
                            : '1px solid #E2E8F0',
                        }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskModal.due_date}
                    onChange={e => setNewTaskModal(prev => prev ? { ...prev, due_date: e.target.value } : null)}
                    style={{
                      padding: '7px 10px', borderRadius: 10, fontSize: 12, color: '#1E293B',
                      background: '#F8FAFC', border: '1px solid #CBD5E1',
                      outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveNewTask}
                disabled={newTaskSaving || !newTaskModal.description.trim()}
                style={{
                  padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                  background: newTaskSaving ? '#E2E8F0' : '#3B82F6',
                  color: newTaskSaving ? '#94A3B8' : '#ffffff',
                  border: 'none', cursor: newTaskSaving ? 'default' : 'pointer',
                  transition: 'all 0.2s', marginTop: 4,
                }}>
                {newTaskSaving ? 'Saving…' : 'Save Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WA compose */}
      {tab === 'whatsapp' && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0"
             style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
                 placeholder="Message via WhatsApp…"
                 className="flex-1 px-4 py-2"
                 style={{
                   fontSize: '13px', borderRadius: 20, border: '1px solid #CBD5E1',
                   outline: 'none', background: '#ffffff', color: '#1E293B',
                 }}
                 onFocus={e  => (e.target.style.borderColor = '#25D366')}
                 onBlur={e   => (e.target.style.borderColor = '#CBD5E1')} />
          <button
                  style={{
                    background: '#25D366', color: '#ffffff', border: 'none',
                    borderRadius: 20, padding: '7px 16px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1DAA52')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#25D366')}>
            Send
          </button>
        </div>
      )}
    </div>
  )
}
