import { readData, writeData } from './_lib/store.js'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const body = req.body || {}
  const data = await readData()
  const merged = { ...data.settings, ...body }
  // validate windows
  const ensure = (w) => ({ start: w?.start || '00:00', end: w?.end || '23:59' })
  merged.enterWindow = ensure(merged.enterWindow)
  merged.leaveWindow = ensure(merged.leaveWindow)
  merged.minStayMinutes = Number.isFinite(merged.minStayMinutes) ? merged.minStayMinutes : data.settings.minStayMinutes
  if (merged.algorithm === 'once-daily') merged.algorithm = 'smart' // legacy value
  merged.algorithm = ['smart', 'hybrid', 'time-window', 'toggle'].includes(merged.algorithm) ? merged.algorithm : data.settings.algorithm
  merged.timingEnabled = typeof merged.timingEnabled === 'boolean' ? merged.timingEnabled : data.settings.timingEnabled !== false
  merged.token = typeof merged.token === 'string' ? merged.token : data.settings.token
  merged.theme = ['light', 'dark'].includes(merged.theme) ? merged.theme : (data.settings.theme || 'light')
  data.settings = merged
  await writeData(data)
  return res.status(200).json({ ok: true, settings: merged })
}
