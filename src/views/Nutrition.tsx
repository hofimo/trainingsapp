import { useState } from 'react'
import LineChart from '../components/LineChart'
import NumInput from '../components/NumInput'
import { average, estimateExpenditure, isoDaysAgo, parseNutritionText, suggestGoals } from '../nutrition'
import { useStore } from '../store'
import type { NutritionDay, NutritionGoals } from '../types'
import { fmtDate, fmtNum, todayISO } from '../util'

const MACROS = [
  { key: 'protein', label: 'Eiweiß', cls: 'm-protein' },
  { key: 'fat', label: 'Fett', cls: 'm-fat' },
  { key: 'carbs', label: 'Kohlenhydrate', cls: 'm-carbs' },
] as const

const fmtInt = (n: number) => fmtNum(Math.round(n), 0)

function Bar({ label, value, goal, unit, cls }: { label: string; value: number; goal?: number; unit: string; cls: string }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div className={`macro ${cls}`}>
      <div className="macro-head">
        <span>{label}</span>
        <span>
          <b>{fmtInt(value)}</b>
          {goal ? ` / ${fmtInt(goal)}` : ''} {unit}
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

/** Ein Tag mit Kalorien und Makros, optional mit Zielbalken */
function DayView({ day, goals }: { day: NutritionDay; goals?: NutritionGoals }) {
  return (
    <div className="macros">
      <Bar label="Kalorien" value={day.kcal} goal={goals?.kcal} unit="kcal" cls="m-kcal" />
      {MACROS.map((m) => (
        <Bar key={m.key} label={m.label} value={day[m.key]} goal={goals?.[m.key]} unit="g" cls={m.cls} />
      ))}
    </div>
  )
}

export default function Nutrition() {
  const { nutrition, saveNutrition, removeNutrition, bodyWeights, settings, saveSettings } = useStore()
  const goals = settings.nutritionGoals
  const today = todayISO()
  const todayEntry = nutrition.find((n) => n.date === today)
  const latest = nutrition[nutrition.length - 1]
  const shown = todayEntry ?? latest
  const kg = bodyWeights[bodyWeights.length - 1]?.kg

  const [msg, setMsg] = useState<string | null>(null)
  const [pasteBox, setPasteBox] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [manual, setManual] = useState(false)
  const [mDate, setMDate] = useState(today)
  const [mVals, setMVals] = useState<Record<'kcal' | 'protein' | 'fat' | 'carbs', number | null>>({ kcal: null, protein: null, fat: null, carbs: null })
  const [editGoals, setEditGoals] = useState(false)
  const [g, setG] = useState<NutritionGoals>(goals ?? suggestGoals(kg ?? 90))
  const [help, setHelp] = useState(nutrition.length === 0)
  const [showAll, setShowAll] = useState(false)

  function take(text: string) {
    const days = parseNutritionText(text)
    if (!days.length) {
      setMsg('Im eingefügten Text waren keine Werte. Prüfe den Kurzbefehl (Anleitung unten).')
      return false
    }
    saveNutrition(days)
    setMsg(days.length === 1 ? `Übernommen für ${fmtDate(days[0].date)}: ${fmtInt(days[0].kcal)} kcal.` : `${days.length} Tage übernommen.`)
    return true
  }

  async function fromClipboard() {
    setMsg(null)
    try {
      const text = await navigator.clipboard.readText()
      if (take(text)) setPasteBox(false)
      else setPasteBox(true)
    } catch {
      // Zugriff verweigert oder nicht unterstützt: Text von Hand einfügen lassen
      setPasteBox(true)
    }
  }

  function openManual(date = today) {
    const ex = nutrition.find((n) => n.date === date)
    setMDate(date)
    setMVals(ex ? { kcal: ex.kcal, protein: ex.protein, fat: ex.fat, carbs: ex.carbs } : { kcal: null, protein: null, fat: null, carbs: null })
    setManual(true)
    setMsg(null)
  }

  function saveManual() {
    const p = mVals.protein ?? 0
    const f = mVals.fat ?? 0
    const c = mVals.carbs ?? 0
    const kcal = Math.round(mVals.kcal ?? p * 4 + f * 9 + c * 4)
    if (kcal <= 0) return
    saveNutrition([{ date: mDate, kcal, protein: p, fat: f, carbs: c, source: 'manual' }])
    setManual(false)
    setMsg(`Gespeichert für ${fmtDate(mDate)}.`)
  }

  // Auswertung
  const last7 = nutrition.filter((n) => n.date > isoDaysAgo(7) && n.date <= today)
  const avg7 = average(last7)
  const proteinHits = goals ? last7.filter((n) => n.protein >= goals.protein * 0.9).length : 0
  const est = estimateExpenditure(nutrition, bodyWeights)

  const recent = nutrition.filter((n) => n.date >= isoDaysAgo(59))
  const kcalPts = recent.map((n) => ({ date: n.date, y: n.kcal }))
  const kcalTrend = kcalPts.map((p, i) => {
    const win = kcalPts.slice(Math.max(0, i - 6), i + 1)
    return { date: p.date, y: Math.round(win.reduce((a, x) => a + x.y, 0) / win.length) }
  })
  const protPts = recent.map((n) => ({ date: n.date, y: n.protein }))

  const list = [...nutrition].reverse()
  const visible = showAll ? list : list.slice(0, 14)

  return (
    <div>
      <section className="card">
        <div className="nutri-head">
          <h2>{shown && shown.date !== today ? `Zuletzt: ${fmtDate(shown.date)}` : 'Heute'}</h2>
          {shown?.source === 'health' && <span className="pill">aus Health</span>}
        </div>
        {shown ? <DayView day={shown} goals={goals} /> : <p className="muted">Noch keine Werte. Hol sie dir mit dem Kurzbefehl aus Apple Health oder trag sie von Hand ein.</p>}
        {!todayEntry && shown && <p className="small muted">Für heute noch nichts übernommen.</p>}

        <div className="form-row">
          <button className="btn primary grow" onClick={fromClipboard}>
            📋 Aus Health einfügen
          </button>
          <button className="btn" onClick={() => (manual ? setManual(false) : openManual())}>
            ✏️ Von Hand
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}

        {pasteBox && (
          <div className="paste-box">
            <p className="small muted">Kein Zugriff auf die Zwischenablage. Tippe lange ins Feld und wähle „Einsetzen“.</p>
            <textarea className="note" rows={3} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="TA;datum=…;kcal=…;e=…;f=…;kh=…" />
            <div className="form-row">
              <button
                className="btn primary"
                disabled={!pasteText.trim()}
                onClick={() => {
                  if (take(pasteText)) {
                    setPasteText('')
                    setPasteBox(false)
                  }
                }}
              >
                Übernehmen
              </button>
              <button className="btn ghost" onClick={() => setPasteBox(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {manual && (
          <div className="paste-box">
            <input className="date" type="date" value={mDate} max={today} onChange={(e) => openManual(e.target.value || today)} />
            <div className="nutri-fields">
              <label>
                <span className="small muted">Kalorien (kcal)</span>
                <NumInput className="num wide" value={mVals.kcal} placeholder="aus Makros" onChange={(v) => setMVals({ ...mVals, kcal: v })} ariaLabel="Kalorien" />
              </label>
              {MACROS.map((m) => (
                <label key={m.key}>
                  <span className="small muted">{m.label} (g)</span>
                  <NumInput decimal className="num wide" value={mVals[m.key]} placeholder="g" onChange={(v) => setMVals({ ...mVals, [m.key]: v })} ariaLabel={m.label} />
                </label>
              ))}
            </div>
            <div className="form-row">
              <button className="btn primary" onClick={saveManual} disabled={mVals.kcal == null && mVals.protein == null && mVals.fat == null && mVals.carbs == null}>
                Speichern
              </button>
              <button className="btn ghost" onClick={() => setManual(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>

      {avg7 && (
        <section className="card">
          <h2>Letzte 7 Tage</h2>
          <p className="small muted">Durchschnitt über {avg7.n} {avg7.n === 1 ? 'Tag' : 'Tage'} mit Werten.</p>
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
            Ab etwa 2 Wochen mit Essen und Gewicht rechnet die App aus, wie viel du wirklich verbrauchst. Dafür an mindestens 10 Tagen die Werte übernehmen und morgens wiegen.
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

      <section className="card">
        <button className="supp-head" onClick={() => setHelp(!help)} aria-expanded={help}>
          <h2>Kurzbefehl einrichten</h2>
          <span className="muted">{help ? '▲' : '▼'}</span>
        </button>
        {help && <ShortcutHelp />}
      </section>

      {list.length > 0 && (
        <section className="card">
          <h2>Einträge</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Tag</th>
                <th className="right">kcal</th>
                <th className="right">E / F / KH</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((n) => (
                <tr key={n.date}>
                  <td>
                    <button className="link" onClick={() => (openManual(n.date), window.scrollTo(0, 0))}>
                      {fmtDate(n.date)}
                    </button>
                  </td>
                  <td className="right">{fmtInt(n.kcal)}</td>
                  <td className="right">
                    {fmtInt(n.protein)} / {fmtInt(n.fat)} / {fmtInt(n.carbs)}
                  </td>
                  <td className="right">
                    <button className="btn tiny ghost" aria-label="Eintrag löschen" onClick={() => confirm('Eintrag löschen?') && removeNutrition(n.date)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > visible.length && (
            <button className="btn ghost" onClick={() => setShowAll(true)}>
              Alle {list.length} anzeigen
            </button>
          )}
        </section>
      )}
    </div>
  )
}

function ShortcutHelp() {
  return (
    <div className="howto small">
      <p>
        FDDB und Yazio haben keine offene Schnittstelle, schreiben deine Werte aber nach Apple Health. Ein Kurzbefehl holt sie dort ab und kopiert sie, die Trainingsapp liest sie
        dann mit „Aus Health einfügen“.
      </p>
      <p>
        <b>1. Health-Abgleich in der Ernährungs-App einschalten</b>
        <br />
        FDDB: Profil → Einstellungen → Apple Health. Yazio: Profil → Konto/Einstellungen → Apps &amp; Geräte → Apple Health. In Health Schreibrechte für Nahrungsenergie, Protein, Fett
        und Kohlenhydrate erlauben.
      </p>
      <p>
        <b>2. Kurzbefehl anlegen</b> (App „Kurzbefehle“ → + ), Name z. B. „Makros kopieren“:
      </p>
      <ol>
        <li>
          <i>Health-Messungen suchen</i>: Typ <b>Nahrungsenergie</b> (in der Liste unter Ernährung, manchmal „Energie“ genannt), Filter <b>Startdatum</b> <b>ist heute</b>.
        </li>
        <li>
          <i>Statistik berechnen</i>: <b>Summe</b> der Health-Messungen. Dann <i>Variable festlegen</i>: „kcal“.
        </li>
        <li>
          Die beiden Schritte noch dreimal für <b>Protein</b>, <b>Fett gesamt</b> und <b>Kohlenhydrate</b> (Variablen „eiweiss“, „fett“, „kh“). Tipp: Aktion lange drücken →
          „Duplizieren“.
        </li>
        <li>
          <i>Text</i>: <code>TA;kcal=[kcal];e=[eiweiss];f=[fett];kh=[kh]</code> (in eckigen Klammern die Variablen einsetzen).
        </li>
        <li>
          <i>In Zwischenablage kopieren</i>: Text. Optional danach <i>Mitteilung zeigen</i> „Makros kopiert“.
        </li>
      </ol>
      <p>
        <b>3. Benutzen:</b> Kurzbefehl starten (Widget, Siri „Makros kopieren“ oder Automation abends um 21 Uhr), Trainingsapp öffnen → Körper → Ernährung → „Aus Health einfügen“.
        Ohne Datum im Text zählen die Werte für den Tag, an dem du sie einfügst.
      </p>
      <p>
        <b>Für gestern</b> (wenn du erst morgens einfügst): einen zweiten Kurzbefehl mit Filter <b>Startdatum ist gestern</b> oder <b>ist zwischen</b> gestern 0 Uhr und heute 0 Uhr,
        und im Text vorne das Datum mitgeben: <i>Datum formatieren</i> (Aktuelles Datum, <i>Datum anpassen</i> −1 Tag, Format <code>yyyy-MM-dd</code>) →{' '}
        <code>TA;datum=[Datum];kcal=…</code>. Steht die Energie in Health in kJ, schreib <code>kj=</code> statt <code>kcal=</code>, die App rechnet um.
      </p>
      <p className="muted">Ohne Kurzbefehl geht es auch: „Von Hand“ und die Tageswerte aus FDDB oder Yazio abtippen.</p>
    </div>
  )
}
