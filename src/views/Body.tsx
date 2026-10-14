import { useState } from 'react'
import LineChart from '../components/LineChart'
import NumInput from '../components/NumInput'
import { useStore } from '../store'
import { fmtDate, fmtNum, todayISO } from '../util'

export default function Body() {
  const { bodyWeights, saveBodyWeight, removeBodyWeight } = useStore()
  const latest = bodyWeights[bodyWeights.length - 1]
  const [kg, setKg] = useState<number | null>(null)
  const [date, setDate] = useState(todayISO())

  const points = bodyWeights.map((b) => ({ date: b.date, y: b.kg }))
  // Gleitender Durchschnitt über die letzten 7 Einträge, glättet Tagesschwankungen
  const trend = points.map((p, i) => {
    const win = points.slice(Math.max(0, i - 6), i + 1)
    return { date: p.date, y: Math.round((win.reduce((a, x) => a + x.y, 0) / win.length) * 10) / 10 }
  })

  const first = bodyWeights[0]
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const ref30 = [...bodyWeights].reverse().find((b) => new Date(b.date) <= monthAgo)

  function save() {
    if (kg == null || kg < 30 || kg > 300) return
    saveBodyWeight({ date, kg })
    setKg(null)
  }

  const delta = (a: number, b: number) => `${a - b >= 0 ? '+' : ''}${fmtNum(a - b)} kg`

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Körpergewicht</h1>
          <p className="muted">{latest ? `Aktuell ${fmtNum(latest.kg)} kg` : 'Noch nichts eingetragen'}</p>
        </div>
      </header>

      <section className="card">
        <h2>Eintragen</h2>
        <p className="small muted">Am besten morgens nach dem Aufstehen, immer unter gleichen Bedingungen.</p>
        <div className="form-row">
          <NumInput decimal className="num wide" value={kg} placeholder={latest ? String(latest.kg).replace('.', ',') : 'kg'} onChange={setKg} ariaLabel="Gewicht in kg" />
          <input className="date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
          <button className="btn primary" onClick={save} disabled={kg == null}>
            Speichern
          </button>
        </div>
      </section>

      {points.length > 0 && (
        <section className="card">
          <h3 className="chart-title">Gewicht (kg)</h3>
          <LineChart points={points} trend={points.length > 2 ? trend : undefined} seriesName="Messung" trendName="7er-Durchschnitt" unit="kg" />
          <div className="tiles">
            {first && latest && first !== latest && (
              <div className="tile">
                <span className="small muted">Seit Beginn</span>
                <b>{delta(latest.kg, first.kg)}</b>
              </div>
            )}
            {ref30 && latest && (
              <div className="tile">
                <span className="small muted">Letzte 30 Tage</span>
                <b>{delta(latest.kg, ref30.kg)}</b>
              </div>
            )}
          </div>
        </section>
      )}

      {bodyWeights.length > 0 && (
        <section className="card">
          <h2>Einträge</h2>
          <table className="table">
            <tbody>
              {[...bodyWeights].reverse().map((b) => (
                <tr key={b.date}>
                  <td>{fmtDate(b.date)}</td>
                  <td>{fmtNum(b.kg)} kg</td>
                  <td className="right">
                    <button className="btn tiny ghost" aria-label="Eintrag löschen" onClick={() => confirm('Eintrag löschen?') && removeBodyWeight(b.date)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
