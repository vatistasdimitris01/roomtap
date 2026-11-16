import { readData, writeData } from './_lib/store.js'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
}

function cleanType(t) {
  return t === 'enter' || t === 'leave' ? t : null
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method === 'GET') {
    const data = await readData()
    return res.status(200).json({ events: data.events })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const type = cleanType(body.type)
    if (!type) return res.status(400).json({ error: 'type must be enter or leave' })
    const data = await readData()
    const ev = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type,
      at: body.at ? new Date(body.at).toISOString() : new Date().toISOString(),
      source: 'manual',
      note: typeof body.note === 'string' ? body.note : '',
    }
    data.events.push(ev)
    data.events.sort((a, b) => new Date(a.at) - new Date(b.at))
    await writeData(data)
    return res.status(201).json({ ok: true, event: ev })
  }

  if (req.method === 'PATCH') {
    const body = req.body || {}
    if (!body.id) return res.status(400).json({ error: 'id required' })
    const data = await readData()
    const idx = data.events.findIndex((e) => e.id === body.id)
    if (idx === -1) return res.status(404).json({ error: 'event not found' })
    const ev = data.events[idx]
    if (body.type !== undefined) {
      const type = cleanType(body.type)
      if (!type) return res.status(400).json({ error: 'type must be enter or leave' })
      ev.type = type
    }
    if (body.at !== undefined) ev.at = new Date(body.at).toISOString()
    if (body.note !== undefined) ev.note = String(body.note)
    data.events[idx] = ev
    data.events.sort((a, b) => new Date(a.at) - new Date(b.at))
    await writeData(data)
    return res.status(200).json({ ok: true, event: ev })
  }

  if (req.method === 'DELETE') {
    const id = (req.query && req.query.id) || (req.body && req.body.id)
    if (!id) return res.status(400).json({ error: 'id required' })
    const data = await readData()
    const before = data.events.length
    data.events = data.events.filter((e) => e.id !== id)
    if (data.events.length === before) return res.status(404).json({ error: 'event not found' })
    await writeData(data)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
