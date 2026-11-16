import fs from 'node:fs'
import path from 'node:path'
import { get, put } from '@vercel/blob'

const BLOB_PATH = 'room-tap/data.json'
const TMP_PATH = path.join('/tmp', 'room-tap-data.json')
const LOCAL_PATH = path.join(process.cwd(), 'data.local.json')

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

function normalizeSettings(s) {
  const merged = { ...DEFAULT_SETTINGS, ...s }
  // legacy value from the previous single-entry rule
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

function defaultData() {
  return { settings: { ...DEFAULT_SETTINGS }, events: [] }
}

function hasBlobToken() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

async function readData() {
  if (hasBlobToken()) {
    try {
      const result = await get(BLOB_PATH, { access: 'private', useCache: false })
      if (!result || !result.stream) return defaultData()
      const text = await new Response(result.stream).text()
      const data = JSON.parse(text)
      if (!data.settings) data.settings = { ...DEFAULT_SETTINGS }
      else data.settings = normalizeSettings(data.settings)
      if (!Array.isArray(data.events)) data.events = []
      return data
    } catch (e) {
      console.error('blob read error', e)
      return defaultData()
    }
  }
  const p = process.env.VERCEL ? TMP_PATH : LOCAL_PATH
  try {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'))
      if (!data.settings) data.settings = { ...DEFAULT_SETTINGS }
      else data.settings = normalizeSettings(data.settings)
      if (!Array.isArray(data.events)) data.events = []
      return data
    }
  } catch (e) {
    console.error('fs read error', e)
  }
  return defaultData()
}

async function writeData(data) {
  if (hasBlobToken()) {
    await put(BLOB_PATH, JSON.stringify(data), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return
  }
  const p = process.env.VERCEL ? TMP_PATH : LOCAL_PATH
  fs.writeFileSync(p, JSON.stringify(data), 'utf8')
}

export { readData, writeData, defaultData, DEFAULT_SETTINGS }
