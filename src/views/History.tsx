import { useState } from 'react'
import { useStore } from '../store'
import { dayLetter, dayStyle } from '../theme'
import { fmtDate, fmtNum } from '../util'
import Workout from './Workout'

export default function History() {
  const { sessions, plan, exById } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const finished = sessions.filter((s) => s.finished)
  const open = finished.find((s) => s.id === openId)

  if (open) return <Workout session={open} onClose={() => setOpenId(null)} />

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Verlauf</h1>
          <p className="muted">{finished.length} Trainings</p>
        </div>
      </header>
      {!finished.length && <p className="muted card">Noch keine abgeschlossenen Trainings. Starte unter „Heute“ dein erstes.</p>}
      {finished.map((s) => {
        const sets = s.entries.flatMap((e) => e.sets.filter((x) => x.done))
        const volume = s.entries.reduce(
          (v, e) => v + (exById(e.exerciseId).kind === 'dumbbell' ? e.sets.filter((x) => x.done).reduce((a, x) => a + (x.weight ?? 0) * (x.reps ?? 0), 0) : 0),
          0,
        )
        const mins = s.finishedAt ? Math.round((new Date(s.finishedAt).getTime() - new Date(s.date).getTime()) / 60000) : null
        return (
          <button key={s.id} className="card row-card hist-card" style={dayStyle(plan, s.dayId)} onClick={() => setOpenId(s.id)}>
            <span className="day-badge small-badge">{dayLetter(s.dayName)}</span>
            <div className="grow-text">
              <b>{s.dayName}</b>
              <div className="muted small">{fmtDate(s.date)}</div>
            </div>
            <div className="right small">
              <div>{sets.length} Sätze</div>
              <div className="muted">
                {fmtNum(volume, 0)} kg{mins != null && mins < 300 ? ` · ${mins} min` : ''}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
