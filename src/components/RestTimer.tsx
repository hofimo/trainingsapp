import { useEffect, useState } from 'react'
import { beep } from '../sound'

export interface Rest {
  /** Ende als Zeitstempel in ms */
  endsAt: number
  total: number
  label: string
}

const KEY = 'restTimer'

export function loadRest(): Rest | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Rest | null
    return r && r.endsAt > Date.now() - 60_000 ? r : null
  } catch {
    return null
  }
}

export function storeRest(r: Rest | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r))
    else localStorage.removeItem(KEY)
  } catch {
    // ohne Speicher läuft der Timer trotzdem, nur nicht über einen Neustart hinweg
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function RestTimer({ rest, onChange }: { rest: Rest | null; onChange: (r: Rest | null) => void }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!rest) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [rest])

  const left = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0
  const over = !!rest && left <= 0

  // Signal, wenn die Pause abläuft. War die App im Hintergrund, kommt es beim Zurückkehren (bis 60 s danach).
  useEffect(() => {
    if (!rest) return
    let fired = false
    const fire = () => {
      if (fired || Date.now() < rest.endsAt || Date.now() - rest.endsAt > 60_000) return
      fired = true
      beep()
      navigator.vibrate?.([200, 100, 200])
    }
    const t = setTimeout(fire, Math.max(0, rest.endsAt - Date.now()))
    const onVisible = () => document.visibilityState === 'visible' && fire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [rest])

  // Nach Ablauf noch kurz „Weiter“ zeigen, dann ausblenden
  useEffect(() => {
    if (rest && Date.now() - rest.endsAt > 8000) onChange(null)
  }, [rest, now, onChange])

  if (!rest) return null

  const add = (s: number) => {
    const endsAt = Math.max(Date.now() + 1000, (over ? Date.now() : rest.endsAt) + s * 1000)
    onChange({ ...rest, endsAt, total: Math.max(rest.total + s, 1) })
  }

  return (
    <div className={`rest ${over ? 'rest-over' : ''}`} role="timer" aria-live="polite">
      <div className="rest-fill" style={{ width: `${over ? 100 : Math.min(100, (1 - left / rest.total) * 100)}%` }} />
      <div className="rest-body">
        <div className="rest-text">
          <span className="small">{over ? 'Pause vorbei' : `Pause · ${rest.label}`}</span>
          <b>{over ? 'Weiter geht’s' : fmt(left)}</b>
        </div>
        {!over && (
          <>
            <button className="btn" onClick={() => add(-15)} aria-label="15 Sekunden kürzer">
              −15
            </button>
            <button className="btn" onClick={() => add(15)} aria-label="15 Sekunden länger">
              +15
            </button>
          </>
        )}
        <button className="btn ghost" onClick={() => onChange(null)}>
          {over ? 'OK' : 'Stopp'}
        </button>
      </div>
    </div>
  )
}
