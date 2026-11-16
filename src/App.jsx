import { useEffect, useState } from 'react'
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Analysis from './pages/Analysis.jsx'
import Settings from './pages/Settings.jsx'
import SunMark from './components/SunMark.jsx'
import { fetchState } from './lib/api.js'
import { applyTheme, savedTheme } from './lib/theme.js'

const links = [
  { to: '/', label: 'Today', hint: 'Status and endpoint' },
  { to: '/analysis', label: 'Log', hint: 'History and time inside' },
  { to: '/settings', label: 'Setup', hint: 'Entry and leave rules' },
]

function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand">
            <SunMark className="mark" size={22} />
            <span className="wordmark">Room Tap</span>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close navigation">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="brand-sub">Presence log for one room</p>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={onClose}>
              <span className="nav-label">{l.label}</span>
              <span className="nav-hint">{l.hint}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="live-dot" aria-hidden="true"></span>
          Endpoint live
        </div>
      </aside>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
    </>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    // paint the saved theme before the network round-trip, then confirm with the server
    applyTheme(savedTheme())
    fetchState().then((s) => applyTheme(s.settings?.theme)).catch(() => {})
  }, [])
  return (
    <div className="app">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main">
        <header className="mobile-bar">
          <button className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-label="Open navigation" aria-expanded={open}>
            <span></span><span></span>
          </button>
          <div className="brand small">
            <SunMark className="mark" size={19} />
            <span className="wordmark">Room Tap</span>
          </div>
        </header>
        <div className="page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
