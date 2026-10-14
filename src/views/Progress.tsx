import { useMemo, useState } from 'react'
import LineChart, { type Point } from '../components/LineChart'
import { describeSets, e1rm, historyFor } from '../progression'
import { useStore } from '../store'
import { fmtDate, fmtNum, todayISO, weekStart } from '../util'

type Metric = 'weight' | 'e1rm' | 'volume' | 'reps' | 'best'

const METRICS: Record<Metric, { label: string; unit: string; hint: string }> = {
  weight: { label: 'Gewicht', unit: 'kg', hint: 'Schwerstes Gewicht pro Hand in einem Training.' },
  e1rm: { label: 'Kraft (1RM)', unit: 'kg', hint: 'Geschätztes Maximum für 1 Wiederholung aus Gewicht und Wiederholungen. Steigt auch, wenn du nur mehr Wiederholungen schaffst.' },
  volume: { label: 'Volumen', unit: 'kg', hint: 'Summe aus Gewicht × Wiederholungen aller Sätze (pro Hand).' },
  reps: { label: 'Wdh. gesamt', unit: 'Wdh.', hint: 'Alle Wiederholungen aller Sätze zusammen.' },
  best: { label: 'Bester Satz', unit: 'Wdh.', hint: 'Meiste Wiederholungen in einem Satz.' },
}

export default function Progress() {
  const { sessions, plan, exById } = useStore()
  const finished = sessions.filter((s) => s.finished)

  // Übungen mit Daten, Reihenfolge wie im Plan
  const exIds = useMemo(() => {
    const inPlan = plan.days.flatMap((d) => d.items.map((i) => i.exerciseId))
    const withData = new Set(finished.flatMap((s) => s.entries.filter((e) => e.sets.some((x) => x.done)).map((e) => e.exerciseId)))
    return [...new Set([...inPlan, ...withData])].filter((id) => withData.has(id))
  }, [plan, finished])

  const [exId, setExId] = useState<string>('')
  const current = exIds.includes(exId) ? exId : exIds[0]
  const ex = current ? exById(current) : null
  const metrics: Metric[] = ex?.kind === 'dumbbell' ? ['e1rm', 'weight', 'volume'] : ex?.kind === 'time' ? ['best', 'reps'] : ['reps', 'best']
  const [metric, setMetric] = useState<Metric>('e1rm')
  const m = metrics.includes(metric) ? metric : metrics[0]

  const hist = useMemo(() => (current ? historyFor(current, finished).reverse() : []), [current, finished])

  const points: Point[] = hist.map((h) => {
    const sets = h.sets
    let y = 0
    if (m === 'weight') y = Math.max(...sets.map((s) => s.weight ?? 0))
    if (m === 'e1rm') y = Math.max(...sets.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)))
    if (m === 'volume') y = sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0)
    if (m === 'reps') y = sets.reduce((a, s) => a + (s.reps ?? 0), 0)
    if (m === 'best') y = Math.max(...sets.map((s) => s.reps ?? 0))
    return { date: h.date, y: Math.round(y * 10) / 10, label: `${fmtDate(h.date)}: ${ex ? describeSets(ex, sets) : ''}` }
  })

  const unit = ex?.kind === 'time' && (m === 'best' || m === 'reps') ? 's' : METRICS[m].unit

  // Wochenübersicht der letzten 8 Wochen
  const weeks = useMemo(() => {
    const out: { start: string; n: number }[] = []
    const d = new Date(weekStart(todayISO()) + 'T12:00:00')
    for (let i = 7; i >= 0; i--) {
      const w = new Date(d)
      w.setDate(d.getDate() - i * 7)
      const iso = weekStart(w.toISOString().slice(0, 10))
      out.push({ start: iso, n: finished.filter((s) => weekStart(s.date) === iso).length })
    }
    return out
  }, [finished])

  const best = ex?.kind === 'dumbbell' && hist.length ? Math.max(...hist.flatMap((h) => h.sets.map((s) => s.weight ?? 0))) : null
  const bestE = ex?.kind === 'dumbbell' && hist.length ? Math.max(...hist.flatMap((h) => h.sets.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)))) : null
  const first = points[0]?.y
  const lastP = points[points.length - 1]?.y

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Fortschritt</h1>
          <p className="muted">{finished.length} Trainings insgesamt</p>
        </div>
      </header>

      <section className="card">
        <h2>Trainings pro Woche</h2>
        <div className="weeks" role="img" aria-label="Trainings pro Woche, letzte 8 Wochen">
          {weeks.map((w) => (
            <div key={w.start} className="week" title={`Woche ab ${fmtDate(w.start, false)}: ${w.n}`}>
              <div className="week-bar">
                <div style={{ height: `${Math.min(w.n, 4) * 25}%` }} />
              </div>
              <span className="small">{w.n}</span>
            </div>
          ))}
        </div>
        <p className="small muted">Letzte 8 Wochen, Ziel 3 pro Woche</p>
      </section>

      {!ex ? (
        <p className="muted card">Sobald du Trainings abgeschlossen hast, siehst du hier deine Kurven pro Übung.</p>
      ) : (
        <section className="card">
          <select className="select" value={current} onChange={(e) => setExId(e.target.value)}>
            {exIds.map((id) => (
              <option key={id} value={id}>
                {exById(id).name}
              </option>
            ))}
          </select>
          <div className="seg small-seg">
            {metrics.map((k) => (
              <button key={k} className={k === m ? 'on' : ''} onClick={() => setMetric(k)}>
                {METRICS[k].label}
              </button>
            ))}
          </div>
          <h3 className="chart-title">
            {METRICS[m].label} ({unit})
          </h3>
          <LineChart points={points} unit={unit} />
          <p className="small muted">{METRICS[m].hint}</p>

          <div className="tiles">
            {first != null && lastP != null && points.length > 1 && (
              <div className="tile">
                <span className="small muted">Seit Beginn</span>
                <b>
                  {lastP - first >= 0 ? '+' : ''}
                  {fmtNum(lastP - first)} {unit}
                </b>
              </div>
            )}
            {best != null && (
              <div className="tile">
                <span className="small muted">Schwerstes Gewicht</span>
                <b>{fmtNum(best)} kg</b>
              </div>
            )}
            {bestE != null && (
              <div className="tile">
                <span className="small muted">Bestes 1RM (geschätzt)</span>
                <b>{fmtNum(bestE)} kg</b>
              </div>
            )}
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Sätze</th>
              </tr>
            </thead>
            <tbody>
              {[...hist].reverse().slice(0, 12).map((h) => (
                <tr key={h.sessionId}>
                  <td>{fmtDate(h.date)}</td>
                  <td>{describeSets(ex, h.sets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
