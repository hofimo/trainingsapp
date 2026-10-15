import { useState } from 'react'
import ExThumb, { MuscleTag } from '../components/ExThumb'
import Ring from '../components/Ring'
import SupplementCard from '../components/SupplementCard'
import { suggest } from '../progression'
import { uid, useStore } from '../store'
import { dayLetter, dayStyle, weekStreak } from '../theme'
import type { Session } from '../types'
import { fmtDate, weekStart, todayISO } from '../util'
import Workout, { Summary } from './Workout'
import { sayIt, startMessage } from '../motivation'
import { unlockAudio } from '../sound'

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
  const streak = weekStreak(sessions)
  const doneToday = !!last && new Date(last.date).toDateString() === new Date().toDateString()

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
    unlockAudio()
    s.startMsg = startMessage(s, sessions, settings)
    saveSession(s)
    sayIt(settings, s.startMsg)
  }

  const name = settings.name?.trim()
  const hour = new Date().getHours()
  const hi = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'
  const justDone = !!last?.finishedAt && Date.now() - new Date(last.finishedAt).getTime() < 3 * 3600_000

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>{name ? `${hi}, ${name}` : 'Heute'}</h1>
          <p className="muted">{last ? `Zuletzt ${fmtDate(last.date)} (${last.dayName})` : 'Los geht’s mit deinem ersten Training'}</p>
        </div>
      </header>

      {justDone && last && <Summary session={last} />}

      <section className="hero">
        <Ring value={thisWeek} max={3}>
          <b>{thisWeek}/3</b>
          <span>Woche</span>
        </Ring>
        <div className="hero-text">
          <b>{doneToday ? 'Heute erledigt 💪' : thisWeek >= 3 ? 'Wochenziel geschafft! 🎉' : `Noch ${3 - thisWeek} Training${3 - thisWeek === 1 ? '' : 's'} diese Woche`}</b>
          <div className="hero-stats">
            <span>
              🔥 <b>{streak}</b> {streak === 1 ? 'Woche' : 'Wochen'} in Folge
            </span>
            <span>
              🏋️ <b>{finished.length}</b> Trainings
            </span>
          </div>
        </div>
      </section>

      <SupplementCard />

      <div className="seg">
        {plan.days.map((d) => (
          <button key={d.id} className={d.id === day.id ? 'on' : ''} style={dayStyle(plan, d.id)} onClick={() => setChosen(d.id)}>
            <i className="day-dot" />
            {d.name}
            {d.id === nextDay?.id && <small> dran</small>}
          </button>
        ))}
      </div>

      <section className="card day-card" style={dayStyle(plan, day.id)}>
        <div className="day-banner">
          <span className="day-badge">{dayLetter(day.name)}</span>
          <div>
            <h2>{day.name}</h2>
            <span className="small">
              {day.items.length} Übungen · {day.items.reduce((n, i) => n + i.sets, 0)} Sätze
            </span>
          </div>
        </div>
        <ul className="preview">
          {day.items.map((item, i) => {
            const ex = exById(item.exerciseId)
            const sug = suggest(ex, item, sessions, settings.weights)
            const prevG = i > 0 ? day.items[i - 1].group : undefined
            const nextG = day.items[i + 1]?.group
            const grouped = !!item.group && (item.group === prevG || item.group === nextG)
            return (
              <li key={item.id} className={grouped ? 'grouped' : ''}>
                <ExThumb ex={ex} />
                <div className="grow-text">
                  <b>{ex.name}</b>
                  <span className="muted small">
                    {' '}
                    {item.sets}×{item.repMin === item.repMax ? item.repMin : `${item.repMin}–${item.repMax}`}
                    {ex.perSide ? '/Seite' : ''}
                  </span>
                  <div>
                    <MuscleTag id={ex.id} />
                  </div>
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

      <div className="actions" style={dayStyle(plan, day.id)}>
        <button className="btn primary big day-btn" onClick={start}>
          {day.name} starten
        </button>
      </div>
    </div>
  )
}
