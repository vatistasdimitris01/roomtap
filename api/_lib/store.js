const DEFAULT_SETTINGS = {
  enterWindow: { start: '08:00', end: '12:00' },
  leaveWindow: { start: '16:00', end: '22:00' },
  minStayMinutes: 1,
  algorithm: 'smart',
  timingEnabled: false,
  token: 'roomtap',
  enterSong: '',
  leaveSong: '',
  theme: 'light',
}

const ALGORITHMS = ['smart', 'hybrid', 'time-window', 'toggle']

function normalizeSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings }
  if (merged.algorithm === 'once-daily' || !ALGORITHMS.includes(merged.algorithm)) merged.algorithm = 'smart'
  if (typeof merged.timingEnabled !== 'boolean') merged.timingEnabled = DEFAULT_SETTINGS.timingEnabled
  merged.minStayMinutes = Number.isFinite(Number(merged.minStayMinutes)) ? Number(merged.minStayMinutes) : DEFAULT_SETTINGS.minStayMinutes
  if (typeof merged.token !== 'string') merged.token = DEFAULT_SETTINGS.token
  if (typeof merged.enterSong !== 'string') merged.enterSong = ''
  if (typeof merged.leaveSong !== 'string') merged.leaveSong = ''
  if (merged.theme !== 'dark') merged.theme = 'light'
  if (!merged.enterWindow || typeof merged.enterWindow.start !== 'string') merged.enterWindow = { ...DEFAULT_SETTINGS.enterWindow }
  if (!merged.leaveWindow || typeof merged.leaveWindow.start !== 'string') merged.leaveWindow = { ...DEFAULT_SETTINGS.leaveWindow }
  return merged
}

function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase server environment is not configured')
  return { url: url.replace(/\/$/, ''), key }
}

async function db(path, options = {}) {
  const { url, key } = config()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${detail}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function defaultData() {
  return { settings: { ...DEFAULT_SETTINGS }, events: [] }
}

async function readData() {
  const [settingsRows, events] = await Promise.all([
    db('roomtap_settings?select=id,data&id=eq.default'),
    db('roomtap_events?select=id,type,at,source,note&order=at.asc'),
  ])
  let settings = settingsRows?.[0]?.data
  if (!settings) {
    settings = { ...DEFAULT_SETTINGS }
    await db('roomtap_settings', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 'default', data: settings }),
    })
  }
  return {
    settings: normalizeSettings(settings),
    events: (events || []).map((event) => ({
      ...event,
      at: new Date(event.at).toISOString(),
      source: event.source || 'manual',
      note: event.note || '',
    })),
  }
}

async function writeData(data) {
  const settings = normalizeSettings(data.settings)
  await db('roomtap_settings', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 'default', data: settings, updated_at: new Date().toISOString() }),
  })

  const events = Array.isArray(data.events) ? data.events : []
  if (events.length) {
    await db('roomtap_events', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(events.map((event) => ({
        id: String(event.id),
        type: event.type,
        at: new Date(event.at).toISOString(),
        source: event.source || 'manual',
        note: event.note || '',
      }))),
    })
    const ids = events.map((event) => String(event.id))
    await db(`roomtap_events?id=not.in.(${ids.map(encodeURIComponent).join(',')})`, { method: 'DELETE' })
  } else {
    await db('roomtap_events?id=not.is.null', { method: 'DELETE' })
  }
}

export { readData, writeData, defaultData, DEFAULT_SETTINGS }
