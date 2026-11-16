const BASE = ''
async function json(r) {
  if (!r.ok) throw new Error(`request failed: ${r.status}`)
  return r.json()
}
export function fetchState() {
  return fetch(`${BASE}/api/state`).then(json)
}
export function saveSettings(settings) {
  return fetch(`${BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).then(json)
}
export function fetchEvents() {
  return fetch(`${BASE}/api/events`).then(json)
}
export function updateEvent(patch) {
  return fetch(`${BASE}/api/events`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then(json)
}
export function deleteEvent(id) {
  return fetch(`${BASE}/api/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(json)
}
export function addEvent(ev) {
  return fetch(`${BASE}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ev),
  }).then(json)
}
