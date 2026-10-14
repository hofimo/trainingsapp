export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function fmtDate(iso: string, withWeekday = true) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  const s = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`
  return withWeekday ? `${WD[d.getDay()]} ${s}` : s
}

export const fmtShort = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

export const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

/** Liest Zahlen mit Komma oder Punkt. */
export const parseNum = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

/** Montag der Woche als YYYY-MM-DD */
export function weekStart(iso: string) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
