import { useState } from 'react'
import AddFood, { AmountPicker, MacroLine } from '../components/AddFood'
import LineChart from '../components/LineChart'
import NumInput from '../components/NumInput'
import Ring from '../components/Ring'
import { MEALS, amountText, mealForNow, sumMacros } from '../foods'
import { average, estimateExpenditure, isoDaysAgo, suggestGoals } from '../nutrition'
import { uid, useStore } from '../store'
import type { Food, FoodEntry, Meal, NutritionGoals } from '../types'
import { fmtDate, fmtNum, todayISO } from '../util'

const MACROS = [
  { key: 'protein', label: 'Eiweiß', cls: 'm-protein' },
  { key: 'fat', label: 'Fett', cls: 'm-fat' },
  { key: 'carbs', label: 'Kohlenhydrate', cls: 'm-carbs' },
] as const

const fmtInt = (n: number) => fmtNum(Math.round(n), 0)

function Bar({ label, value, goal, cls }: { label: string; value: number; goal?: number; cls: string }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div className={`macro ${cls}`}>
      <div className="macro-head">
        <span>{label}</span>
        <span>
          <b>{fmtInt(value)}</b>
          {goal ? ` / ${fmtInt(goal)}` : ''} g
        </span>
      </div>
      {goal ? (
        <div className="macro-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  )
}

/** Lebensmittel aus dem Eintrag nachbauen, falls es nicht mehr in der Liste ist */
function foodFromEntry(e: FoodEntry): Food | null {
  if (!e.amount) return null
  const k = 100 / e.amount
  return {
    id: e.foodId ?? `entry:${e.id}`,
    name: e.name,
    brand: e.brand,
    unit: e.unit,
    per100: { kcal: e.kcal * k, protein: e.protein * k, fat: e.fat * k, carbs: e.carbs * k },
    portions: e.portion ? [{ label: e.portion.label, g: e.amount / e.portion.qty }] : [],
    source: 'custom',
  }
}

function EditEntry({ entry, onClose }: { entry: FoodEntry; onClose: () => void }) {
  const { foodById, removeFoodEntry } = useStore()
  const food = (entry.foodId && foodById(entry.foodId)) || foodFromEntry(entry)
  return (
    <div className="sheet" role="dialog" aria-label="Eintrag bearbeiten">
      <div className="sheet-top">
        <h1>Eintrag</h1>
        <button className="btn tiny ghost" aria-label="Schließen" onClick={onClose}>
          ✕
        </button>
      </div>
      {food ? (
        <AmountPicker food={food} entry={entry} meal={entry.meal} date={entry.date} onDone={onClose} onCancel={onClose} />
      ) : (
        <div className="picker">
          <h2>{entry.name}</h2>
          <p>
            {fmtInt(entry.kcal)} kcal · <MacroLine m={entry} className="" />
          </p>
          <div className="form-row">
            <button
              className="btn danger"
              onClick={() => {
                removeFoodEntry(entry.id)
                onClose()
              }}
            >
              Löschen
            </button>
            <button className="btn ghost" onClick={onClose}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Nutrition() {
  const { foodLog, saveFoodEntries, nutrition, bodyWeights, settings, saveSettings } = useStore()
  const goals = settings.nutritionGoals
  const today = todayISO()
  const kg = bodyWeights[bodyWeights.length - 1]?.kg

  const [date, setDate] = useState(today)
  const [adding, setAdding] = useState<{ meal: Meal; scan?: boolean } | null>(null)
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [editGoals, setEditGoals] = useState(false)
  const [g, setG] = useState<NutritionGoals>(goals ?? suggestGoals(kg ?? 90))

  const dayEntries = foodLog.filter((e) => e.date === date).sort((a, b) => a.at.localeCompare(b.at))
  const total = sumMacros(dayEntries)
  const yesterday = isoDaysAgo(1, date)
  const left = goals ? goals.kcal - total.kcal : null

  function copyMeal(meal: Meal) {
    const src = foodLog.filter((e) => e.date === yesterday && e.meal === meal)
    saveFoodEntries(src.map((e) => ({ ...e, id: uid(), date, at: new Date().toISOString() })))
  }

  // Auswertung
  const last7 = nutrition.filter((n) => n.date > isoDaysAgo(7) && n.date <= today)
  const avg7 = average(last7)
  const proteinHits = goals ? last7.filter((n) => n.protein >= goals.protein * 0.9).length : 0
  const est = estimateExpenditure(nutrition, bodyWeights)
  const recent = nutrition.filter((n) => n.date >= isoDaysAgo(59) && n.date < today)
  const kcalPts = recent.map((n) => ({ date: n.date, y: Math.round(n.kcal) }))
  const kcalTrend = kcalPts.map((p, i) => {
    const win = kcalPts.slice(Math.max(0, i - 6), i + 1)
    return { date: p.date, y: Math.round(win.reduce((a, x) => a + x.y, 0) / win.length) }
  })
  const protPts = recent.map((n) => ({ date: n.date, y: Math.round(n.protein) }))

  return (
    <div>
      <div className="day-nav">
        <button className="btn tiny ghost" aria-label="Vortag" onClick={() => setDate(isoDaysAgo(1, date))}>
          ‹
        </button>
        <button className="day-nav-label" onClick={() => setDate(today)}>
          {date === today ? 'Heute' : date === isoDaysAgo(1) ? 'Gestern' : fmtDate(date)}
        </button>
        <button className="btn tiny ghost" aria-label="Nächster Tag" disabled={date >= today} onClick={() => setDate(isoDaysAgo(-1, date))}>
          ›
        </button>
      </div>

      <section className="card">
        <div className="kcal-sum">
          <Ring value={total.kcal} max={goals?.kcal ?? Math.max(total.kcal, 1)} size={104}>
            <b>{fmtInt(left != null ? Math.abs(left) : total.kcal)}</b>
            <span>{left == null ? 'kcal' : left >= 0 ? 'übrig' : 'drüber'}</span>
          </Ring>
          <div className="kcal-text">
            <div>
              <span className="small muted">Gegessen</span>
              <b>{fmtInt(total.kcal)} kcal</b>
            </div>
            {goals && (
              <div>
                <span className="small muted">Ziel</span>
                <b>{fmtInt(goals.kcal)} kcal</b>
              </div>
            )}
          </div>
        </div>
        <div className="macros">
          {MACROS.map((m) => (
            <Bar key={m.key} label={m.label} value={total[m.key]} goal={goals?.[m.key]} cls={m.cls} />
          ))}
        </div>
        <div className="form-row">
          <button className="btn primary grow" onClick={() => setAdding({ meal: mealForNow(), scan: true })}>
            Scannen
          </button>
          <button className="btn grow" onClick={() => setAdding({ meal: mealForNow() })}>
            🔍 Suchen
          </button>
        </div>
      </section>

      {MEALS.map((meal) => {
        const list = dayEntries.filter((e) => e.meal === meal.id)
        const sum = sumMacros(list)
        const canCopy = !list.length && foodLog.some((e) => e.date === yesterday && e.meal === meal.id)
        return (
          <section key={meal.id} className="card meal-card">
            <div className="meal-head">
              <div>
                <h2>
                  {meal.icon} {meal.label}
                </h2>
                {list.length > 0 && (
                  <span className="small muted">
                    {fmtInt(sum.kcal)} kcal · <MacroLine m={sum} className="" />
                  </span>
                )}
              </div>
              <button className="add-btn" aria-label={`Zu ${meal.label} hinzufügen`} onClick={() => setAdding({ meal: meal.id })}>
                ＋
              </button>
            </div>
            {list.length > 0 && (
              <ul className="entry-list">
                {list.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditing(e)}>
                      <span className="grow-text">
                        <b>{e.name}</b>
                        <span className="small muted">
                          {[e.brand, amountText(e)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="entry-kcal">{fmtInt(e.kcal)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canCopy && (
              <button className="btn tiny ghost copy-btn" onClick={() => copyMeal(meal.id)}>
                ↺ Wie gestern übernehmen
              </button>
            )}
          </section>
        )
      })}

      {avg7 && (
        <section className="card">
          <h2>Letzte 7 Tage</h2>
          <p className="small muted">Durchschnitt über {avg7.n} {avg7.n === 1 ? 'Tag' : 'Tage'} mit Einträgen.</p>
          <div className="tiles">
            <div className="tile tile-blue">
              <span className="small muted">Ø Kalorien</span>
              <b>{fmtInt(avg7.kcal)}</b>
              {goals && <span className="small muted">Ziel {fmtInt(goals.kcal)}</span>}
            </div>
            <div className={`tile ${goals && avg7.protein >= goals.protein * 0.9 ? 'tile-good' : ''}`}>
              <span className="small muted">Ø Eiweiß</span>
              <b>{fmtInt(avg7.protein)} g</b>
              {goals && (
                <span className="small muted">
                  Ziel erreicht an {proteinHits} von {avg7.n}
                </span>
              )}
            </div>
            <div className="tile">
              <span className="small muted">Ø Fett / KH</span>
              <b>
                {fmtInt(avg7.fat)} / {fmtInt(avg7.carbs)} g
              </b>
            </div>
          </div>
        </section>
      )}

      {kcalPts.length > 1 && (
        <section className="card">
          <h3 className="chart-title">Kalorien pro Tag</h3>
          <LineChart points={kcalPts} trend={kcalPts.length > 2 ? kcalTrend : undefined} seriesName="Tag" trendName="7er-Durchschnitt" unit="kcal" />
          <h3 className="chart-title">Eiweiß pro Tag (g)</h3>
          <LineChart points={protPts} unit="g" height={160} />
          <p className="small muted">Ohne den heutigen Tag, der ist ja noch nicht vorbei.</p>
        </section>
      )}

      <section className="card">
        <h2>Dein Verbrauch</h2>
        {est ? (
          <>
            <p>
              Geschätzt <b>{fmtInt(est.kcal)} kcal</b> pro Tag.
            </p>
            <p className="small muted">
              In den letzten 4 Wochen hast du im Schnitt {fmtInt(est.avgKcal)} kcal gegessen ({est.days} Tage erfasst), dein Gewicht hat sich um {est.kgPerWeek >= 0 ? '+' : ''}
              {fmtNum(est.kgPerWeek, 2)} kg pro Woche verändert. Zum Abnehmen etwa 300–500 kcal unter dem Verbrauch bleiben. Creatin und Salz verschieben das Wasser, deshalb ist das eine Schätzung.
            </p>
          </>
        ) : (
          <p className="small muted">
            Nach etwa 2 Wochen mit Essen und Gewicht rechnet die App aus, wie viel du wirklich verbrauchst. Dafür an mindestens 10 Tagen alles eintragen und morgens wiegen.
          </p>
        )}
      </section>

      <section className="card">
        <div className="nutri-head">
          <h2>Tagesziele</h2>
          {!editGoals && (
            <button className="btn tiny" onClick={() => (setG(goals ?? suggestGoals(kg ?? 90)), setEditGoals(true))}>
              {goals ? 'Ändern' : 'Festlegen'}
            </button>
          )}
        </div>
        {!editGoals &&
          (goals ? (
            <p>
              {fmtInt(goals.kcal)} kcal · {fmtInt(goals.protein)} g Eiweiß · {fmtInt(goals.fat)} g Fett · {fmtInt(goals.carbs)} g KH
            </p>
          ) : (
            <p className="small muted">Noch keine Ziele. Der Vorschlag richtet sich nach deinem Gewicht.</p>
          ))}
        {editGoals && (
          <>
            <div className="nutri-fields">
              <label>
                <span className="small muted">Kalorien (kcal)</span>
                <NumInput className="num wide" value={g.kcal} onChange={(v) => setG({ ...g, kcal: v ?? 0 })} ariaLabel="Ziel Kalorien" />
              </label>
              {MACROS.map((m) => (
                <label key={m.key}>
                  <span className="small muted">{m.label} (g)</span>
                  <NumInput className="num wide" value={g[m.key]} onChange={(v) => setG({ ...g, [m.key]: v ?? 0 })} ariaLabel={`Ziel ${m.label}`} />
                </label>
              ))}
            </div>
            <p className="small muted">
              Vorschlag{kg ? ` bei ${fmtNum(kg)} kg` : ''}: Eiweiß 2 g pro kg, Fett 0,8 g pro kg, Kalorien leicht unter dem Verbrauch, der Rest Kohlenhydrate. Sobald „Dein Verbrauch“ eine
              Schätzung zeigt, passe die Kalorien daran an.
            </p>
            <div className="form-row">
              <button
                className="btn primary"
                onClick={() => {
                  saveSettings({ ...settings, nutritionGoals: g })
                  setEditGoals(false)
                }}
              >
                Speichern
              </button>
              <button className="btn" onClick={() => setG(suggestGoals(kg ?? 90))}>
                Vorschlag
              </button>
              <button className="btn ghost" onClick={() => setEditGoals(false)}>
                Abbrechen
              </button>
            </div>
          </>
        )}
      </section>

      <p className="credit">Produktdaten: Open Food Facts (openfoodfacts.org), frei unter ODbL.</p>

      {adding && <AddFood date={date} meal={adding.meal} startScan={adding.scan} onClose={() => setAdding(null)} />}
      {editing && <EditEntry entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
