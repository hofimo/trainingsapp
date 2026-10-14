import { useState } from 'react'
import SupplementCard from '../components/SupplementCard'
import { suggest } from '../progression'
import { uid, useStore } from '../store'
import type { Session } from '../types'
import { fmtDate, weekStart, todayISO } from '../util'
import Workout from './Workout'

export default function Today() {
  const { plan, sessions, settings, exById, saveSession } = useStore()
  const open = sessions.find((s) => !s.finished)
  const finished = sessions.filter((s) => s.finished)
  const last = finished[0]
  const lastIdx = last ? plan.days.findIndex((d) => d.id === last.dayId) : -1
  const nextDay = plan.days[(lastIdx + 1) % plan.days.length]
  const [chosen, setChosen] = useState<string | null>(null)
  const day = plan.days.find((d) => d.id === chosen) ?? nextDay

  if (open)
    return (
      <>
        <Workout session={open} onClose={() => {}} />
        <SupplementCard compact />
      </>
    )
  if (!day) return <p className="muted">Kein Trainingstag im Plan. Lege unter „Plan“ einen an.</p>

  const thisWeek = finished.filter((s) => weekStart(s.date) === weekStart(todayISO())).length

  function start() {
    const s: Session = {
      id: uid(),
      date: new Date().toISOString(),
      dayId: day.id,
      dayName: day.name,
      finished: false,
      entries: day.items.map((item) => {
        const ex = exById(item.exerciseId)
        const sug = suggest(ex, item, sessions, settings.weights)
        return {
          planItemId: item.id,
          exerciseId: item.exerciseId,
          sets: Array.from({ length: item.sets }, () => ({
            reps: null,
            weight: ex.kind === 'dumbbell' ? sug.weight : null,
            done: false,
          })),
        }
      }),
    }
    saveSession(s)
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Heute</h1>
          <p className="muted">
            Diese Woche {thisWeek}/3 Trainings{last ? ` · zuletzt ${fmtDate(last.date)} (${last.dayName})` : ''}
          </p>
        </div>
      </header>

      <SupplementCard />

      <div className="seg">
        {plan.days.map((d) => (
          <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setChosen(d.id)}>
            {d.name}
            {d.id === nextDay?.id && <small> dran</small>}
          </button>
        ))}
      </div>

      <section className="card">
        <h2>{day.name}: Vorschau</h2>
        <ul className="preview">
          {day.items.map((item, i) => {
            const ex = exById(item.exerciseId)
            const sug = suggest(ex, item, sessions, settings.weights)
            const prevG = i > 0 ? day.items[i - 1].group : undefined
            const nextG = day.items[i + 1]?.group
            const grouped = !!item.group && (item.group === prevG || item.group === nextG)
            return (
              <li key={item.id} className={grouped ? 'grouped' : ''}>
                <div>
                  <b>{ex.name}</b>
                  <span className="muted small">
                    {' '}
                    {item.sets}×{item.repMin === item.repMax ? item.repMin : `${item.repMin}–${item.repMax}`}
                    {ex.perSide ? '/Seite' : ''}
                  </span>
                </div>
                <span className={`pill pill-${sug.kind}`}>
                  {sug.kind === 'up' ? '↑ ' : ''}
                  {sug.weight != null && ex.kind === 'dumbbell' ? `${String(sug.weight).replace('.', ',')} kg` : ex.kind === 'band' ? 'Band' : ex.kind === 'time' ? `${sug.reps[0]} s` : `${sug.reps[0]} Wdh.`}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="actions">
        <button className="btn primary big" onClick={start}>
          {day.name} starten
        </button>
      </div>
    </div>
  )
}
