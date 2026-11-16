const KEY = 'roomtap-theme'

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch {}
}

export function savedTheme() {
  try { return localStorage.getItem(KEY) || 'light' } catch { return 'light' }
}
