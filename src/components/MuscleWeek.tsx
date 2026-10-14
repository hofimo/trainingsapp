import { useMemo, useState } from 'react'
import { MUSCLES, setsPerMuscle } from '../muscles'
import type { Session } from '../types'
import { fmtDate, fmtNum, todayISO, weekStart } from '../util'

const SCALE = 24

function shiftWeek(iso: string, weeks: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return weekStart(d.toISOString().slice(0, 10))
}

/** Harte Sätze pro Muskel in einer Woche, mit grünem Zielbereich. */
export default function MuscleWeek({ sessions }: { sessions: Session[] }) {
  const thisWeek = weekStart(todayISO())
  const [week, setWeek] = useState(thisWeek)
  const { sets, unmapped } = useMemo(() => setsPerMuscle(sessions, week), [sessions, week])

  const end = shiftWeek(week, 1)
  const sunday = new Date(end + 'T12:00:00')
  sunday.setDate(sunday.getDate() - 1)
  const title = week === thisWeek ? 'Diese Woche' : week === shiftWeek(thisWeek, -1) ? 'Letzte Woche' : `${fmtDate(week, false)} – ${fmtDate(sunday.toISOString().slice(0, 10), false)}`

  return (
    <section className="card">
      <h2>Sätze pro Muskel</h2>
      <div className="week-nav">
        <button className="btn tiny ghost" aria-label="Woche davor" onClick={() => setWeek(shiftWeek(week, -1))}>
          ‹
        </button>
        <b>{title}</b>
        <button className="btn tiny ghost" aria-label="Woche danach" disabled={week >= thisWeek} onClick={() => setWeek(shiftWeek(week, 1))}>
          ›
        </button>
      </div>
      {MUSCLES.map((m) => {
        const n = sets[m.id]
        if (m.min == null && n === 0) return null
        // In der laufenden Woche ist „zu wenig“ noch kein Warnsignal
        const state = m.min == null ? '' : n < m.min ? (week < thisWeek ? 'low' : '') : m.max != null && n > m.max ? 'high' : 'ok'
        const hint = m.min == null ? '' : ` (Ziel ${m.min}–${m.max})`
        return (
          <div key={m.id} className="mus" title={`${m.name}: ${fmtNum(n)} Sätze${hint}`}>
            <span>{m.name}</span>
            <div className="mus-bar">
              {m.min != null && m.max != null && (
                <div className="mus-zone" style={{ left: `${(m.min / SCALE) * 100}%`, width: `${((Math.min(m.max, SCALE) - m.min) / SCALE) * 100}%` }} />
              )}
              <div className={`mus-fill ${state}`} style={{ width: `${Math.min(n / SCALE, 1) * 100}%` }} />
            </div>
            <span className={`mus-n ${state}`}>{fmtNum(n)}</span>
          </div>
        )
      })}
      <p className="small muted">
        Erledigte Sätze der Woche. Grün hinterlegt ist der Zielbereich für Muskelaufbau, bei Bizeps und Trizeps 10–20 Sätze. Mittrainierte Muskeln zählen halb, z. B. der Bizeps bei Klimmzügen.
        {unmapped > 0 && ` ${unmapped} Sätze aus eigenen Übungen sind nicht zugeordnet.`}
      </p>
    </section>
  )
}
