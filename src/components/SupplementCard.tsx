import { useState } from 'react'
import { useStore } from '../store'
import type { DayTime } from '../types'
import { fmtShort, todayISO } from '../util'

export const TIME_LABEL: Record<DayTime, string> = {
  morning: 'Morgens',
  noon: 'Mittags',
  evening: 'Abends',
}
const ORDER: DayTime[] = ['morning', 'noon', 'evening']

function lastDays(n: number) {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`)
  }
  return out
}

/** Supplements des Tages zum Abhaken. compact: startet eingeklappt (z. B. während des Trainings). */
export default function SupplementCard({ compact = false }: { compact?: boolean }) {
  const { supplements, supplementLogs, toggleSupplement } = useStore()
  const today = todayISO()
  const taken = supplementLogs.find((l) => l.date === today)?.taken ?? []
  const done = supplements.filter((s) => taken.includes(s.id)).length
  const allDone = supplements.length > 0 && done === supplements.length
  const [open, setOpen] = useState(!compact && !allDone)
  const [info, setInfo] = useState<string | null>(null)

  if (!supplements.length) return null

  const days = lastDays(7)
  const ratio = (date: string) => {
    const t = supplementLogs.find((l) => l.date === date)?.taken ?? []
    return supplements.filter((s) => t.includes(s.id)).length / supplements.length
  }

  return (
    <section className="card supp">
      <button className="supp-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <h2>Supplements heute</h2>
        <span className={`pill ${allDone ? 'pill-up' : ''}`}>
          {allDone ? '✓ ' : ''}
          {done}/{supplements.length}
        </span>
      </button>

      {open && (
        <>
          {ORDER.filter((t) => supplements.some((s) => s.time === t)).map((t) => (
            <div key={t} className="supp-group">
              <div className="small muted supp-time">{TIME_LABEL[t]}</div>
              {supplements
                .filter((s) => s.time === t)
                .map((s) => {
                  const on = taken.includes(s.id)
                  return (
                    <div key={s.id}>
                      <div className={`supp-row ${on ? 'done' : ''}`}>
                        <button className={`check ${on ? 'on' : ''}`} aria-label={on ? `${s.name} nicht genommen` : `${s.name} genommen`} onClick={() => {
                          toggleSupplement(today, s.id)
                          navigator.vibrate?.(30)
                        }}>
                          ✓
                        </button>
                        <div className="supp-text" onClick={() => toggleSupplement(today, s.id)}>
                          <b>{s.name}</b>
                          <span className="small muted">{s.dose}</span>
                        </div>
                        {s.note && (
                          <button className="btn tiny ghost" aria-label="Hinweis" onClick={() => setInfo(info === s.id ? null : s.id)}>
                            i
                          </button>
                        )}
                      </div>
                      {info === s.id && <p className="cue small">{s.note}</p>}
                    </div>
                  )
                })}
            </div>
          ))}

          <div className="supp-week" aria-label="Letzte 7 Tage">
            {days.map((d) => {
              const r = ratio(d)
              return (
                <div key={d} className="supp-day" title={`${fmtShort(d)}: ${Math.round(r * 100)} %`}>
                  <span className={`supp-dot ${r === 1 ? 'full' : r > 0 ? 'part' : ''}`} />
                  <span className="small muted">{d === today ? 'heute' : fmtShort(d)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
