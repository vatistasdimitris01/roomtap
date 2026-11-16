import React, { useEffect, useState, Suspense, lazy } from 'react'
import { fetchEvents, updateEvent, deleteEvent, addEvent } from '../lib/api.js'
import { formatDuration } from '../lib/format.js'

const PieChart = lazy(() => import('../components/PieChart.jsx'))
const AreaChart = lazy(() => import('../components/AreaChart.jsx'))

function dayKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function toLocalInput(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function pairSessions(events) {
  const pairs = []
  let open = null
  for (const e of events) {
    if (e.type === 'enter') open = e
    else if (e.type === 'leave' && open) { pairs.push({ entry: open, leave: e, ms: new Date(e.at) - new Date(open.at) }); open = null }
  }
  return pairs
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WD_COLORS = ['#e8552b', '#ee7c4d', '#e3a24a', '#b7a552', '#7f9d5c', '#3d8a5f', '#1e6f4a']
const wdIndex = (d) => (new Date(d).getDay() + 6) % 7

export default function Analysis() {
  const [events, setEvents] = useState([])
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [adding, setAdding] = useState(false)
  const [newEvent, setNewEvent] = useState({ type: 'enter', at: toLocalInput(new Date()), note: '' })
  const [busy, setBusy] = useState(false)

  const load = () => fetchEvents().then((d) => setEvents(d.events || [])).catch(() => {})
  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const pairs = pairSessions(events)
  const totalMs = pairs.reduce((s, p) => s + p.ms, 0)
  const avgMs = pairs.length ? totalMs / pairs.length : 0

  // last 14 days
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push({ key: dayKey(d), label: d.toLocaleDateString([], { weekday: 'narrow' }), day: d.getDate(), ms: 0 })
  }
  for (const p of pairs) {
    const day = days.find((x) => x.key === dayKey(p.entry.at))
    if (day) day.ms += p.ms
  }

  // time inside by weekday
  const byWeekday = WEEKDAYS.map((label, i) => ({ label, value: 0, color: WD_COLORS[i] }))
  for (const p of pairs) byWeekday[wdIndex(p.entry.at)].value += p.ms

  const busiest = byWeekday.reduce((a, b) => (b.value > a.value ? b : a), byWeekday[0])

  const startEdit = (e) => {
    setEditing(e.id)
    setDraft({ type: e.type, at: toLocalInput(e.at), note: e.note || '' })
  }
  const saveEdit = async () => {
    setBusy(true)
    try {
      await updateEvent({ id: editing, type: draft.type, at: new Date(draft.at).toISOString(), note: draft.note })
      setEditing(null)
      await load()
    } finally { setBusy(false) }
  }
  const remove = async (id) => {
    setBusy(true)
    try { await deleteEvent(id); await load() } finally { setBusy(false) }
  }
  const add = async () => {
    setBusy(true)
    try {
      await addEvent({ type: newEvent.type, at: new Date(newEvent.at).toISOString(), note: newEvent.note })
      setAdding(false)
      setNewEvent({ type: 'enter', at: toLocalInput(new Date()), note: '' })
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div>
      <h1>The log</h1>
      <p className="lede">Every tap, and the time it added up to. Fix a wrong entry, move a timestamp, or add one by hand.</p>

      <div className="stats" style={{ marginTop: 34 }}>
        <div className="stat"><div className="value">{events.filter((e) => e.type === 'enter').length}</div><div className="name">Entries</div></div>
        <div className="stat"><div className="value">{events.filter((e) => e.type === 'leave').length}</div><div className="name">Leaves</div></div>
        <div className="stat"><div className="value">{formatDuration(totalMs)}</div><div className="name">Time inside</div></div>
        <div className="stat"><div className="value">{formatDuration(avgMs)}</div><div className="name">Average stay</div></div>
      </div>

      <div className="grid-2" style={{ marginTop: 44, alignItems: 'start' }}>
        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Time by weekday</h2>
            <span className="section-note">When you use the room most</span>
          </div>
          <div className="panel">
            <Suspense fallback={<div className="chart-loading">Loading chart…</div>}>
              <PieChart data={byWeekday} format={formatDuration} />
              {totalMs > 0 && <p className="tiny" style={{ marginTop: 14, marginBottom: 0 }}>{busiest.label} is your busiest day — {formatDuration(busiest.value)} inside.</p>}
            </Suspense>
          </div>
        </div>

        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Time per day</h2>
            <span className="section-note">Last 14 days</span>
          </div>
          <div className="panel">
            <Suspense fallback={<div className="chart-loading">Loading chart…</div>}>
              <AreaChart data={days.map((d) => ({ key: d.key, label: d.label, value: d.ms }))} format={formatDuration} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Tap history</h2>
          <button onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : 'Add a tap'}</button>
        </div>

        {adding && (
          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="edit-grid">
              <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                <option value="enter">Entry</option>
                <option value="leave">Leave</option>
              </select>
              <input type="datetime-local" value={newEvent.at} onChange={(e) => setNewEvent({ ...newEvent, at: e.target.value })} />
              <input placeholder="Note" value={newEvent.note} onChange={(e) => setNewEvent({ ...newEvent, note: e.target.value })} />
              <button className="solid" disabled={busy} onClick={add}>Save</button>
            </div>
          </div>
        )}

        <div className="panel">
          {events.slice().reverse().map((e) => (
            <div className="event" key={e.id}>
              {editing === e.id ? (
                <>
                  <select value={draft.type} onChange={(ev) => setDraft({ ...draft, type: ev.target.value })}>
                    <option value="enter">Entry</option>
                    <option value="leave">Leave</option>
                  </select>
                  <input type="datetime-local" value={draft.at} onChange={(ev) => setDraft({ ...draft, at: ev.target.value })} />
                  <div className="inline">
                    <input placeholder="Note" value={draft.note} onChange={(ev) => setDraft({ ...draft, note: ev.target.value })} />
                    <button className="solid" disabled={busy} onClick={saveEdit}>Save</button>
                    <button className="ghost" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className={`tag ${e.type}`}><span className="d"></span>{e.type === 'enter' ? 'Entry' : 'Leave'}</span>
                  <span className="event-meta">
                    {new Date(e.at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' at '}
                    {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {e.note ? ` — ${e.note}` : ''}
                  </span>
                  <div className="event-actions">
                    <button className="ghost" onClick={() => startEdit(e)}>Edit</button>
                    <button className="ghost danger" disabled={busy} onClick={() => remove(e.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {events.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing logged yet. Tap the tag, or add a tap by hand.</p>}
        </div>
      </div>
    </div>
  )
}
