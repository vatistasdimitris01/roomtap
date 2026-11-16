import React, { useEffect, useState, Suspense, lazy } from 'react'
import { fetchEvents, fetchState } from '../lib/api.js'
import { formatDuration } from '../lib/format.js'
import { applyTheme } from '../lib/theme.js'
import SunMark from '../components/SunMark.jsx'

const AreaChart = lazy(() => import('../components/AreaChart.jsx'))

const RULE_LABEL = { smart: 'Smart', hybrid: 'Hybrid', 'time-window': 'Time window', toggle: 'Toggle' }

function toPct(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return ((h * 60 + m) / 1440) * 100
}
function sameDay(a, b) {
  const x = new Date(a), y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}
function mondayOf(d) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}
const weekKey = (date) => { const m = mondayOf(date); return `${m.getFullYear()}-${m.getMonth()}-${m.getDate()}` }
const monthKey = (date) => { const e = new Date(date); return `${e.getFullYear()}-${e.getMonth()}` }
function pairSessions(events) {
  const pairs = []
  let open = null
  for (const e of events) {
    if (e.type === 'enter') open = e
    else if (e.type === 'leave' && open) { pairs.push({ entry: open, leave: e, ms: new Date(e.at) - new Date(open.at) }); open = null }
  }
  return pairs
}

export default function Home() {
  const [events, setEvents] = useState([])
  const [settings, setSettings] = useState(null)
  const [now, setNow] = useState(new Date())
  const [range, setRange] = useState('weekly')

  useEffect(() => {
    const load = () => {
      fetchEvents().then((d) => setEvents(d.events || [])).catch(() => {})
      fetchState().then((s) => { setSettings(s.settings); if (s.settings?.theme) applyTheme(s.settings.theme) }).catch(() => {})
    }
    load()
    const poll = setInterval(load, 5000)
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [])

  const last = events.length ? events[events.length - 1] : null
  const inside = last ? last.type === 'enter' : null
  const statusWord = inside === null ? 'No taps yet' : inside ? 'Inside' : 'Out'
  const statusClass = inside === null ? 'unknown' : inside ? 'in' : 'out'
  const lastTime = last ? new Date(last.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

  // today's time inside
  const todayEvents = events.filter((e) => sameDay(e.at, now))
  let todayMs = 0
  let openEntry = null
  for (const e of todayEvents) {
    if (e.type === 'enter') openEntry = e
    else if (e.type === 'leave' && openEntry) { todayMs += new Date(e.at) - new Date(openEntry.at); openEntry = null }
  }
  if (openEntry) todayMs += now - new Date(openEntry.at)

  const pairs = pairSessions(events)

  // average time in the room, weekly (last 12 weeks) and monthly (last 6 months)
  const weeks = []
  for (let i = 11; i >= 0; i--) {
    const m = mondayOf(now)
    m.setDate(m.getDate() - i * 7)
    weeks.push({ key: weekKey(m), label: m.toLocaleDateString([], { day: 'numeric', month: 'short' }), total: 0, count: 0 })
  }
  for (const p of pairs) {
    const w = weeks.find((x) => x.key === weekKey(p.entry.at))
    if (w) { w.total += p.ms; w.count += 1 }
  }
  const weekly = weeks.map((w) => ({ key: w.key, label: w.label, value: w.count ? w.total / w.count : 0 }))

  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString([], { month: 'short' }), total: 0, count: 0 })
  }
  for (const p of pairs) {
    const m = months.find((x) => x.key === monthKey(p.entry.at))
    if (m) { m.total += p.ms; m.count += 1 }
  }
  const monthly = months.map((m) => ({ key: m.key, label: m.label, value: m.count ? m.total / m.count : 0 }))

  const chartData = range === 'weekly' ? weekly : monthly
  const shownAvg = (() => {
    const buckets = range === 'weekly' ? weeks : months
    const keyOf = range === 'weekly' ? weekKey : monthKey
    const all = pairs.filter((p) => buckets.some((b) => b.key === keyOf(p.entry.at)))
    return all.length ? all.reduce((s, p) => s + p.ms, 0) / all.length : 0
  })()

  const noTiming = settings?.timingEnabled === false
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100

  return (
    <div>
      <div className="hero">
        <div className="hero-main">
          <h1>Is anyone in the room?</h1>
          <p className="lede">Tap the tag by the door. Room Tap reads the hour, decides whether that tap opens or closes your stay, and writes it down.</p>
          <div className={`status-word ${statusClass}`} style={{ marginTop: 28 }}>
            <span className="dot" aria-hidden="true"></span>{statusWord}
          </div>
          <div className="status-line">
            {last ? `Last tap at ${lastTime}, recorded as ${last.type}.` : 'No taps recorded yet. The first tap of the day becomes your entry.'}
          </div>
          <div className="hero-facts">
            <div className="fact"><span className="value">{formatDuration(todayMs)}</span><span className="name">Inside today</span></div>
            <div className="fact"><span className="value">{todayEvents.length}</span><span className="name">Taps today</span></div>
            <div className="fact"><span className="value">{noTiming ? 'Anytime' : RULE_LABEL[settings?.algorithm] || 'Smart'}</span><span className="name">Detection rule</span></div>
          </div>
        </div>
      </div>

      {settings && noTiming && (
        <div className="rail">
          <div className="rail-open">
            <SunMark className="sun" size={20} />
            <span>No specific timing. Your first tap of the day opens the stay; every later tap closes it.</span>
          </div>
        </div>
      )}

      {settings && !noTiming && (
        <div className="rail">
          <div className="rail-track">
            <div className="rail-zone enter" style={{ left: `${toPct(settings.enterWindow.start)}%`, width: `${Math.max(0, toPct(settings.enterWindow.end) - toPct(settings.enterWindow.start))}%` }}></div>
            <div className="rail-zone leave" style={{ left: `${toPct(settings.leaveWindow.start)}%`, width: `${Math.max(0, toPct(settings.leaveWindow.end) - toPct(settings.leaveWindow.start))}%` }}></div>
            <div className="rail-now" style={{ left: `${nowPct}%` }}></div>
          </div>
          <div className="rail-labels"><span>00:00</span><span>12:00</span><span>24:00</span></div>
          <div className="rail-legend">
            <span className="e"><i></i>Entry window {settings.enterWindow.start}–{settings.enterWindow.end}</span>
            <span className="l"><i></i>Leave window {settings.leaveWindow.start}–{settings.leaveWindow.end}</span>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head">
          <h2>Average time in the room</h2>
          <div className="section-tools">
            <span className="section-note">Per visit, by {range === 'weekly' ? 'week' : 'month'}{shownAvg ? ` · ${formatDuration(shownAvg)} average` : ''}</span>
            <div className="seg" role="group" aria-label="Chart range">
              <button className={range === 'weekly' ? 'on' : ''} onClick={() => setRange('weekly')}>Weekly</button>
              <button className={range === 'monthly' ? 'on' : ''} onClick={() => setRange('monthly')}>Monthly</button>
            </div>
          </div>
        </div>
        <div className="panel">
          <Suspense fallback={<div className="chart-loading">Loading chart…</div>}>
            <AreaChart data={chartData} format={formatDuration} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
