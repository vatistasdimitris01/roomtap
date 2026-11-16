export function formatDuration(ms) {
  if (!ms || ms <= 0) return '0m'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h) return m ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

export function compactDuration(ms) {
  if (!ms || ms <= 0) return '0'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const h = ms / 3600000
  if (h >= 1) return `${Math.round(h)}h`
  return `${Math.round(ms / 60000)}m`
}
