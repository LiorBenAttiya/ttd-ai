/**
 * TTD AI — WhatsApp Bridge
 * ─────────────────────────────────────────────────────────────
 * Connects your personal WhatsApp via QR scan (whatsapp-web.js).
 * Receives messages → processes commands → calls FastAPI backend.
 * FastAPI calls this bridge to send outbound messages.
 *
 * Run: node index.js
 * Then scan the QR code in your terminal with WhatsApp on your phone.
 */

import 'dotenv/config'
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, MessageMedia } = pkg
import qrcode    from 'qrcode-terminal'
import express   from 'express'
import axios     from 'axios'

const BACKEND     = process.env.BACKEND_URL  ?? 'http://localhost:8000'
const OWNER_PHONE = process.env.OWNER_PHONE  ?? ''
const PORT        = process.env.PORT         ?? 3001

// ── State ─────────────────────────────────────────────────────
let waClient      = null
let isReady       = false
let backendToken  = null
let qrCodeData    = ''
let SELF_CHAT_ID  = ''   // set on 'ready' — e.g. "972543090009@c.us"
let SELF_LID      = ''   // @lid version of self-chat — e.g. "260837...@lid"

// ── Backend auth ──────────────────────────────────────────────
async function getToken() {
  if (backendToken) return backendToken
  try {
    console.log(`[TTD] Fetching token from ${BACKEND}/api/v1/auth/dev-token …`)
    const res = await axios.post(`${BACKEND}/api/v1/auth/dev-token`, {}, { timeout: 5000 })
    backendToken = res.data.access_token
    console.log('[TTD] ✅ Backend token obtained')
    return backendToken
  } catch (e) {
    console.error(`[TTD] ❌ Could not get backend token: ${e.message}`)
    console.error('[TTD]    Is the backend running at', BACKEND, '?')
    return null
  }
}

async function callBackend(method, path, data) {
  const token = await getToken()
  return axios({ method, url: `${BACKEND}/api/v1${path}`, data,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
}

// ── WhatsApp client ───────────────────────────────────────────
function initWhatsApp() {
  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: process.env.SESSION_PATH ?? './.wwebjs_auth' }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901503-alpha.html',
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    },
  })

  // QR code — scan this with your phone
  waClient.on('qr', qr => {
    qrCodeData = qr
    console.log('\n\n📱 SCAN THIS QR CODE WITH YOUR PERSONAL WHATSAPP:\n')
    qrcode.generate(qr, { small: true })
    console.log('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n')
  })

  waClient.on('authenticated', () => {
    console.log('[WA] ✅ Authenticated — session saved, no QR needed next time')
  })

  waClient.on('ready', async () => {
    isReady = true
    try {
      const me = waClient.info
      SELF_CHAT_ID = me.wid._serialized  // e.g. "972543090009@c.us"

      // Also capture @lid — newer WhatsApp uses @lid as the Saved Messages chat remote ID
      try {
        const selfChat = await waClient.getChatById(SELF_CHAT_ID)
        const chatId = selfChat?.id?._serialized ?? ''
        if (chatId && chatId !== SELF_CHAT_ID) {
          SELF_LID = chatId
          console.log('[WA] ✅ WhatsApp ready! Self:', SELF_CHAT_ID, '| LID:', SELF_LID)
        } else {
          console.log('[WA] ✅ WhatsApp ready! Self:', SELF_CHAT_ID)
        }
      } catch (_) {
        console.log('[WA] ✅ WhatsApp ready! Self:', SELF_CHAT_ID)
      }
    } catch (_) {
      console.log('[WA] ✅ WhatsApp ready!')
    }
  })

  waClient.on('auth_failure', msg => {
    console.error('[WA] ❌ Auth failed:', msg)
    isReady = false
  })

  waClient.on('disconnected', reason => {
    console.log('[WA] Disconnected:', reason)
    isReady = false
    // Auto-reconnect after 5 seconds
    setTimeout(initWhatsApp, 5000)
  })

  // ── Message handler — STRICT: only owner self-messages ──────
  async function handleMsg(msg) {
    const from   = msg.from ?? ''
    const to     = msg.to   ?? ''
    const body   = msg.body?.trim() ?? ''

    // ── SECURITY: Block ALL group chats immediately ────────────
    if (from.includes('@g.us') || to.includes('@g.us')) {
      // NEVER process group chat messages
      return
    }

    // ── SECURITY: Block status broadcasts ─────────────────────
    if (from.includes('broadcast') || from.includes('status@')) return

    // ── SECURITY: Only process messages FROM the owner ─────────
    const fromNumber = from.replace('@c.us', '').replace('+', '')
    if (OWNER_PHONE && fromNumber !== OWNER_PHONE) {
      console.log(`[WA] Ignored — not from owner: from=${fromNumber}`)
      return
    }

    // ── SECURITY: Only process self-sent messages (fromMe=true) ─
    if (!msg.fromMe) {
      console.log(`[WA] Ignored — not fromMe: from=${fromNumber}`)
      return
    }

    // ── SECURITY: Only process self-messages (Saved Messages) ──
    // msg.id.remote is the chat identifier. For Saved Messages it's @lid in newer WA.
    const remote    = (msg.id?.remote ?? '').toString()
    const remoteNum = remote.replace('@c.us','').replace('@lid','').replace('+','')
    const toNum     = to.replace('@c.us','').replace('+','')

    // Auto-learn the self-chat @lid on the first real message.
    // Safe: already confirmed fromMe=true and from=owner above.
    // type=chat ensures it's a real text message, not a notification.
    if (!SELF_LID && msg.type === 'chat' && remote.endsWith('@lid')) {
      SELF_LID = remote
      console.log('[WA] 🔐 Self-chat LID learned:', SELF_LID)
    }

    const isSelfMessage =
      (SELF_CHAT_ID && remote === SELF_CHAT_ID) ||  // @c.us format
      (SELF_LID     && remote === SELF_LID)      ||  // @lid format (newer WA)
      remoteNum === OWNER_PHONE                   ||  // number match
      toNum     === OWNER_PHONE                   ||  // to == owner
      to === from                                     // same address

    if (OWNER_PHONE && !isSelfMessage) {
      console.log(`[WA] Ignored — not self-chat (remote=${remote})`)
      return
    }

    console.log(`[WA] ← Self-message: "${body.slice(0, 80)}"`)


    try {
      if (msg.hasMedia && msg.type === 'ptt') {
        await handleVoiceNote(msg)
        return
      }
      await handleTextMessage(msg, body)
    } catch (err) {
      console.error('[WA] Error processing message:', err.message)
      try { await msg.reply('⚠️ Sorry, something went wrong. Try again.') } catch (_) {}
    }
  }

  waClient.on('message',        handleMsg)  // incoming messages
  waClient.on('message_create', handleMsg)  // outgoing + self messages (WA Web, Saved Messages)

  // ── DEBUG: log every event to find what fires ──────────────
  const DEBUG_EVENTS = ['message','message_create','message_ack','message_revoke_everyone','message_revoke_me']
  DEBUG_EVENTS.forEach(evt => {
    waClient.on(evt, (msg) => {
      const from = msg?.from ?? '?'
      const to   = msg?.to   ?? '?'
      const body = msg?.body?.slice(0,40) ?? ''
      console.log(`[DEBUG] event="${evt}" from=${from} to=${to} type=${msg?.type} body="${body}"`)
    })
  })


  waClient.initialize()
}

// ── Text command parser ───────────────────────────────────────
async function handleTextMessage(msg, body) {
  const lower = body.toLowerCase()

  // ── List tasks ──────────────────────────────────────────
  if (lower === 'list' || lower === 'tasks' || lower === 'היום' || lower === 'רשימה') {
    const res = await callBackend('GET', '/tasks?view=list&status=pending&limit=10')
    const tasks = res.data ?? []
    if (!tasks.length) {
      await msg.reply('✅ No pending tasks! Enjoy your day 🎉')
      return
    }
    const PRIORITY_EMOJI = { 1: '🔴', 2: '🟡', 3: '🟢' }
    let reply = `📋 *Your tasks (${tasks.length}):*\n\n`
    tasks.forEach((t, i) => {
      const emoji = PRIORITY_EMOJI[t.priority] ?? '⚪'
      const due   = t.due_date ? ` · Due ${t.due_date}` : ''
      reply += `${i+1}. ${emoji} ${t.description}${due}\n`
    })
    await msg.reply(reply)
    return
  }

  // ── Stats ───────────────────────────────────────────────
  if (lower === 'stats' || lower === 'status') {
    const res = await callBackend('GET', '/dashboard/stats')
    const s = res.data
    await msg.reply(
      `📊 *TTD AI Stats*\n\n` +
      `✅ Completed: ${s.completed}/${s.total}\n` +
      `🔴 Overdue: ${s.overdue}\n` +
      `📈 Progress: ${s.pct_complete}%`
    )
    return
  }

  // ── Help ────────────────────────────────────────────────
  if (lower === 'help' || lower === '?' || lower === 'עזרה') {
    await msg.reply(
      `🤖 *TTD AI Commands:*\n\n` +
      `📋 *list* — show your pending tasks\n` +
      `📊 *stats* — show progress summary\n` +
      `➕ *task: [description]* — create a task\n` +
      `✅ *done: [task #]* — complete a task\n` +
      `🎙️ Send a *voice note* — I'll transcribe and create a task\n` +
      `📅 *report* — send today's full report\n\n` +
      `Or just describe what needs to be done in plain text!`
    )
    return
  }

  // ── Report ──────────────────────────────────────────────
  if (lower === 'report' || lower === 'דוח') {
    await sendDailyReport(msg.from)
    return
  }

  // ── Explicit task creation ───────────────────────────────
  if (lower.startsWith('task:') || lower.startsWith('משימה:') || lower.startsWith('add:')) {
    const desc = body.replace(/^(task:|משימה:|add:)\s*/i, '').trim()
    if (desc) {
      await createTaskFromText(desc, 'whatsapp_text', msg)
      return
    }
  }

  // ── Done command ─────────────────────────────────────────
  if (lower.startsWith('done:') || lower.startsWith('✅')) {
    await msg.reply('✅ Use the web dashboard to mark tasks as done, or tap Done on the task card.')
    return
  }

  // ── Natural language → AI agent proposes task ────────────
  // Any other message: create task directly or propose via AI
  if (body.length > 5) {
    await createTaskFromText(body, 'whatsapp_text', msg)
  }
}

// ── Voice note handler ────────────────────────────────────────
async function handleVoiceNote(msg) {
  await msg.reply('🎙️ Got your voice note! Transcribing…')

  const media = await msg.downloadMedia()
  const audioBuffer = Buffer.from(media.data, 'base64')

  // Send audio to backend for Whisper transcription
  const FormData = (await import('form-data')).default
  const form = new FormData()
  form.append('audio', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' })

  try {
    const token = await getToken()
    const res = await axios.post(`${BACKEND}/api/v1/voice/transcribe-and-create`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` }
    })
    const task = res.data
    await msg.reply(
      `🎙️ Transcribed & created:\n\n` +
      `📋 *${task.description}*\n` +
      `${task.due_date ? `📅 Due: ${task.due_date}\n` : ''}` +
      `Priority: ${task.priority === 1 ? '🔴 Business' : task.priority === 2 ? '🟡 Personal' : '🟢 General'}`
    )
  } catch (err) {
    console.error('[WA] Voice processing error:', err.message)
    await msg.reply('❌ Could not process voice note. Is your OpenAI key set in the backend .env?')
  }
}

// ── Create task helper ────────────────────────────────────────
async function createTaskFromText(description, source, msg) {
  try {
    const res = await callBackend('POST', '/tasks', { description, priority: 3, source })
    const task = res.data
    await msg.reply(
      `✅ *Task created!*\n\n` +
      `📋 ${task.description}\n` +
      `🟢 Priority: General\n\n` +
      `Reply *list* to see all tasks, or use the dashboard.`
    )
  } catch (err) {
    console.error('[WA] Task creation error:', err.message)
    await msg.reply('❌ Could not create task. Is the backend running?')
  }
}

// ── Daily report sender ───────────────────────────────────────
async function sendDailyReport(to) {
  try {
    const [tasksRes, statsRes] = await Promise.all([
      callBackend('GET', '/tasks?view=list&status=pending&limit=20'),
      callBackend('GET', '/dashboard/stats'),
    ])

    const tasks  = tasksRes.data ?? []
    const stats  = statsRes.data ?? {}
    const today  = new Date().toISOString().split('T')[0]
    const PRIO   = { 1: '🔴', 2: '🟡', 3: '🟢' }

    const todayTasks = tasks.filter(t => t.due_date === today)
    const weekTasks  = tasks.filter(t => t.due_date && t.due_date > today)
    const overdue    = tasks.filter(t => t.due_status === 'overdue')

    let report = `☀️ *Good morning, Lior!*\n`
    report    += `📅 ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n`

    if (overdue.length) {
      report += `⚠️ *${overdue.length} OVERDUE:*\n`
      overdue.forEach(t => { report += `  ${PRIO[t.priority]} ${t.description}\n` })
      report += '\n'
    }

    if (todayTasks.length) {
      report += `📋 *DUE TODAY (${todayTasks.length}):*\n`
      todayTasks.forEach(t => { report += `  ${PRIO[t.priority]} ${t.description}\n` })
      report += '\n'
    }

    if (weekTasks.length) {
      report += `📅 *THIS WEEK (${weekTasks.length}):*\n`
      weekTasks.slice(0, 5).forEach(t => { report += `  ${PRIO[t.priority]} ${t.description} · ${t.due_date}\n` })
      report += '\n'
    }

    report += `📊 *Progress: ${stats.pct_complete}% · ${stats.completed}/${stats.total} done*`

    if (stats.completed > 0) {
      report += `\n\n💪 Yesterday: ${stats.completed} tasks completed. Keep going!`
    }

    await sendMessage(to, report)
    console.log('[WA] Daily report sent to', to)
  } catch (err) {
    console.error('[WA] Report error:', err.message)
  }
}

// ── Outbound: send a message ──────────────────────────────────
async function sendMessage(to, text) {
  if (!isReady || !waClient) throw new Error('WhatsApp not ready')
  const chatId = to.includes('@') ? to : `${to}@c.us`
  await waClient.sendMessage(chatId, text)
}

// ── Express API — FastAPI calls this to send messages ─────────
const app = express()
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: isReady ? 'ready' : 'connecting', qr: isReady ? null : 'scan QR in terminal' })
})

// ── GET /self-chat — returns the authenticated account's self-chat ID ─────────
app.get('/self-chat', (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not ready' })
  const chatId = SELF_CHAT_ID || (OWNER_PHONE ? `${OWNER_PHONE}@c.us` : null)
  if (!chatId) return res.status(503).json({ error: 'Self-chat ID not yet known' })
  res.json({ chat_id: chatId, owner_phone: OWNER_PHONE })
})

app.get('/qr', (req, res) => {
  if (isReady) return res.json({ connected: true })
  res.json({ connected: false, qr: qrCodeData })
})

app.post('/send', async (req, res) => {
  const { to, message } = req.body
  if (!to || !message) return res.status(400).json({ error: 'to and message required' })
  try {
    await sendMessage(to, message)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/report', async (req, res) => {
  const { to } = req.body
  const phone = to ?? OWNER_PHONE
  if (!phone) return res.status(400).json({ error: 'to phone number required' })
  await sendDailyReport(`${phone}@c.us`)
  res.json({ ok: true })
})

// ── GET /messages — last N messages from Saved Messages (self-chat only) ──
app.get('/messages', async (req, res) => {
  if (!isReady || !waClient) {
    return res.status(503).json({ error: 'WhatsApp not ready', status: 'connecting' })
  }
  try {
    const limit  = Math.min(parseInt(req.query.limit ?? '50'), 100)
    // Try self-chat by @c.us first, fall back to @lid
    const chatId = SELF_CHAT_ID || (OWNER_PHONE ? `${OWNER_PHONE}@c.us` : null)
    if (!chatId) return res.status(503).json({ error: 'Self-chat ID not yet known' })

    let chat
    try {
      chat = await waClient.getChatById(chatId)
    } catch {
      if (SELF_LID) chat = await waClient.getChatById(SELF_LID)
      else throw new Error('Cannot find self-chat')
    }

    const raw = await chat.fetchMessages({ limit })
    const messages = raw.map(m => ({
      id:        m.id._serialized,
      body:      m.body || '',
      type:      m.type,          // 'chat', 'ptt' (voice), 'image', etc.
      fromMe:    m.fromMe,
      timestamp: m.timestamp,     // unix seconds
      hasMedia:  m.hasMedia,
      duration:  m.duration ?? null,  // voice note duration seconds
    })).reverse()                 // newest last (chat order)

    res.json({ status: 'ready', count: messages.length, messages })
  } catch (e) {
    console.error('[WA] /messages error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n🌐 TTD AI WhatsApp Bridge running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   QR:     http://localhost:${PORT}/qr\n`)
})

// ── Start ─────────────────────────────────────────────────────
console.log('🤖 TTD AI WhatsApp Bridge starting…')
console.log(`   Backend: ${BACKEND}`)
console.log(`   Owner:   ${OWNER_PHONE || '(all numbers)'}`)
initWhatsApp()
