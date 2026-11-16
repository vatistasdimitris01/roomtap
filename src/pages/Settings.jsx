import React, { useEffect, useState } from 'react'
import { fetchState, saveSettings } from '../lib/api.js'
import { applyTheme } from '../lib/theme.js'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchState().then((s) => setSettings(s.settings)).catch(() => setStatus('Could not load your settings.'))
  }, [])

  if (!settings) return <div className="panel"><p className="muted">{status || 'Loading…'}</p></div>

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }))
  const save = async () => {
    setStatus('Saving…')
    try { await saveSettings(settings); setStatus('Saved') }
    catch { setStatus('That did not save. Try again.') }
  }
  const pickTheme = (t) => {
    update({ theme: t })
    applyTheme(t)
    saveSettings({ theme: t }).catch(() => {})
  }

  const timing = settings.timingEnabled !== false
  const endpoint = `${window.location.origin}/api/tap?token=${settings.token}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(endpoint); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {}
  }

  return (
    <div>
      <h1>How taps are read</h1>
      <p className="lede">Each tap flips the last one — an entry becomes a leave, and a leave opens a new stay — as many times a day as you like. The windows below refine that when the clock can help.</p>

      <div className="section" style={{ marginTop: 34 }}>
        <div className="section-head"><h2>Appearance</h2><span className="section-note">Light or black</span></div>
        <div className="panel">
          <div className="seg" role="group" aria-label="Theme">
            <button className={settings.theme === 'dark' ? '' : 'on'} onClick={() => pickTheme('light')}>
              <span className="swatch light" aria-hidden="true"></span>Light
            </button>
            <button className={settings.theme === 'dark' ? 'on' : ''} onClick={() => pickTheme('dark')}>
              <span className="swatch dark" aria-hidden="true"></span>Black
            </button>
          </div>
          <p className="tiny" style={{ marginTop: 12, marginBottom: 0 }}>Applies right away and saves on its own — no need to press Save changes.</p>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Timing</h2><span className="section-note">Whether the clock decides</span></div>
        <div className="panel">
          <label className="switch">
            <input
              type="checkbox"
              checked={timing}
              onChange={(e) => update({ timingEnabled: e.target.checked })}
            />
            <span className="switch-track"><span className="switch-thumb"></span></span>
            <span className="switch-text">
              <strong>{timing ? 'Use fixed timing' : 'No specific timing'}</strong>
              <em>
                {timing
                  ? 'Taps are read against the entry and leave windows below.'
                  : 'The first tap of the day is your entry — every later tap is a leave. No windows.'}
              </em>
            </span>
          </label>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Entry window</h2><span className="section-note">A tap in this window can open a stay</span></div>
        <div className="panel">
          <div className="grid-2">
            <div className="field">
              <label>Opens at</label>
              <input type="time" disabled={!timing} value={settings.enterWindow.start} onChange={(e) => update({ enterWindow: { ...settings.enterWindow, start: e.target.value } })} />
            </div>
            <div className="field">
              <label>Closes at</label>
              <input type="time" disabled={!timing} value={settings.enterWindow.end} onChange={(e) => update({ enterWindow: { ...settings.enterWindow, end: e.target.value } })} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label>Song to play on entry</label>
            <input placeholder="Track or playlist name" value={settings.enterSong || ''} onChange={(e) => update({ enterSong: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Leave window</h2><span className="section-note">A tap here closes the stay</span></div>
        <div className="panel">
          <div className="grid-2">
            <div className="field">
              <label>Opens at</label>
              <input type="time" disabled={!timing} value={settings.leaveWindow.start} onChange={(e) => update({ leaveWindow: { ...settings.leaveWindow, start: e.target.value } })} />
            </div>
            <div className="field">
              <label>Closes at</label>
              <input type="time" disabled={!timing} value={settings.leaveWindow.end} onChange={(e) => update({ leaveWindow: { ...settings.leaveWindow, end: e.target.value } })} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label>Song to play on leave</label>
            <input placeholder="Track or playlist name" value={settings.leaveSong || ''} onChange={(e) => update({ leaveSong: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Detection</h2><span className="section-note">How each tap is decided</span></div>
        <div className="panel">
          <div className="grid-2">
            <div className="field">
              <label>Rule</label>
              <select value={settings.algorithm} onChange={(e) => update({ algorithm: e.target.value })}>
                <option value="smart">Smart — flip the last tap, so a day holds many visits</option>
                <option value="hybrid">Hybrid — time window first, then flips</option>
                <option value="time-window">Time window only</option>
                <option value="toggle">Toggle — every tap flips the state</option>
              </select>
            </div>
            <div className="field">
              <label>Double-tap guard — ignore taps within (minutes)</label>
              <input type="number" min="0" value={settings.minStayMinutes} onChange={(e) => update({ minStayMinutes: Number(e.target.value) })} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label>Shortcut token</label>
            <input value={settings.token} onChange={(e) => update({ token: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Shortcut endpoint</h2><span className="section-note">Point your NFC automation here</span></div>
        <div className="panel">
          <div className="endpoint">
            <code>{endpoint}</code>
            <button onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="tiny" style={{ marginTop: 12, marginBottom: 0 }}>A GET request is enough. The response tells the Shortcut whether this was an entry or a leave, and which song to play.</p>
        </div>
      </div>

      <div className="inline" style={{ marginTop: 28 }}>
        <button className="solid" onClick={save}>Save changes</button>
        {status && <span className={status === 'Saved' ? 'saved' : 'muted'}>{status}</span>}
      </div>
    </div>
  )
}
