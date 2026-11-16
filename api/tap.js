import { readData, writeData } from './_lib/store.js'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
}

function toMin(t) {
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function inWindow(nowMin, w) {
  const s = toMin(w.start), e = toMin(w.end)
  if (s <= e) return nowMin >= s && nowMin <= e
  return nowMin >= s || nowMin <= e
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const data = await readData()
  const settings = data.settings
  const token = (req.query && req.query.token) || (req.body && req.body.token)
  if (settings.token && token !== settings.token) {
    return res.status(401).json({ ok: false, error: 'invalid token' })
  }

  const now = new Date()
  const nowMs = now.getTime()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const events = data.events
  const last = events.length ? events[events.length - 1] : null
  const noTiming = settings.timingEnabled === false

  // Double-tap guard: a tap this soon after the previous one is accidental.
  const guardMs = Math.max(0, Number(settings.minStayMinutes) || 0) * 60000
  const tooSoon = !!last && guardMs > 0 && nowMs - new Date(last.at).getTime() < guardMs

  let type
  if (!last) {
    // Nothing recorded yet: a tap can only open a stay.
    type = 'enter'
  } else if (tooSoon) {
    type = 'ignored'
  } else if (settings.algorithm === 'time-window' && !noTiming) {
    if (inWindow(nowMin, settings.enterWindow)) type = 'enter'
    else if (inWindow(nowMin, settings.leaveWindow)) type = 'leave'
    else type = last.type === 'enter' ? 'leave' : 'enter'
  } else if (settings.algorithm === 'hybrid' && !noTiming) {
    if (inWindow(nowMin, settings.enterWindow)) type = 'enter'
    else if (inWindow(nowMin, settings.leaveWindow)) type = 'leave'
    else if (last.type === 'enter') {
      const stayMin = (nowMs - new Date(last.at).getTime()) / 60000
      type = stayMin >= (settings.minStayMinutes || 0) ? 'leave' : 'enter'
    } else {
      type = 'enter'
    }
  } else {
    // smart (default) and toggle: flip the last state, so the day can hold
    // as many entries and leaves as you like.
    type = last.type === 'enter' ? 'leave' : 'enter'
    if (!noTiming && last.type === type) {
      // The log already says what the flip would produce (hand-edited or
      // corrupted state). Let the clock repair it.
      if (inWindow(nowMin, settings.enterWindow)) type = 'enter'
      else if (inWindow(nowMin, settings.leaveWindow)) type = 'leave'
    }
  }

  if (type === 'ignored') {
    return res.status(200).json({
      ok: true,
      type: 'ignored',
      at: now.toISOString(),
      message: 'Too soon after the last tap — nothing recorded',
      song: '',
    })
  }

  const ev = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    type,
    at: now.toISOString(),
    source: 'nfc',
    note: (req.query && req.query.note) || (req.body && req.body.note) || '',
  }
  events.push(ev)
  if (events.length > 5000) data.events = events.slice(-5000)
  await writeData(data)

  const song = type === 'enter' ? (settings.enterSong || '') : (settings.leaveSong || '')
  return res.status(200).json({
    ok: true,
    type,
    at: ev.at,
    message: type === 'enter' ? 'Welcome in' : 'See you later',
    song,
  })
}
