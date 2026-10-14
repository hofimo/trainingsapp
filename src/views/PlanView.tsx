import { useState } from 'react'
import ExerciseInfo from '../components/ExerciseInfo'
import NumInput from '../components/NumInput'
import { defaultPlan } from '../defaults'
import { uid, useStore } from '../store'
import type { Kind, Plan, PlanItem } from '../types'

const KIND_LABEL: Record<Kind, string> = {
  dumbbell: 'Kurzhantel',
  bodyweight: 'Körpergewicht',
  band: 'Band',
  time: 'Zeit (Sekunden)',
}

export default function PlanView() {
  const { plan, savePlan, exercises, exById, addCustomExercise } = useStore()
  const [dayId, setDayId] = useState(plan.days[0]?.id)
  const [adding, setAdding] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<Kind>('dumbbell')
  const day = plan.days.find((d) => d.id === dayId) ?? plan.days[0]

  const edit = (fn: (p: Plan) => void) => {
    const p = structuredClone(plan)
    fn(p)
    savePlan(p)
  }
  const editItems = (fn: (items: PlanItem[]) => PlanItem[]) =>
    edit((p) => {
      const d = p.days.find((x) => x.id === day.id)!
      d.items = fn(d.items)
    })
  const patch = (id: string, v: Partial<PlanItem>) => editItems((items) => items.map((i) => (i.id === id ? { ...i, ...v } : i)))

  function move(idx: number, dir: -1 | 1) {
    editItems((items) => {
      const j = idx + dir
      if (j < 0 || j >= items.length) return items
      const next = [...items]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  function toggleSuperset(idx: number) {
    editItems((items) => {
      const next = items.map((i) => ({ ...i }))
      const cur = next[idx]
      const prev = next[idx - 1]
      if (!prev) return next
      if (cur.group && cur.group === prev.group) cur.group = undefined
      else {
        const g = prev.group ?? 'G' + uid()
        prev.group = g
        cur.group = g
      }
      return next
    })
  }

  function addExercise(exerciseId: string) {
    editItems((items) => [...items, { id: 'p' + uid(), exerciseId, sets: 3, repMin: 8, repMax: 12 }])
    setAdding(false)
  }

  function addCustom() {
    const name = newName.trim()
    if (!name) return
    const id = 'c_' + uid()
    addCustomExercise({ id, name, kind: newKind, custom: true, start: newKind === 'dumbbell' ? 5 : undefined })
    addExercise(id)
    setNewName('')
  }

  function addDay() {
    const id = 'D' + uid()
    edit((p) => {
      p.days.push({ id, name: `Tag ${String.fromCharCode(65 + p.days.length)}`, items: [] })
    })
    setDayId(id)
  }

  function removeDay() {
    if (plan.days.length <= 1 || !confirm(`${day.name} aus dem Plan entfernen?`)) return
    edit((p) => {
      p.days = p.days.filter((d) => d.id !== day.id)
    })
    setDayId(plan.days[0].id)
  }

  const groups = [...new Set(exercises.map((e) => e.kind))]

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Plan</h1>
          <p className="muted">Änderungen gelten ab dem nächsten Training.</p>
        </div>
      </header>

      <div className="seg">
        {plan.days.map((d) => (
          <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setDayId(d.id)}>
            {d.name}
          </button>
        ))}
        <button onClick={addDay} aria-label="Tag hinzufügen">
          +
        </button>
      </div>

      <section className="card">
        <label className="field">
          <span className="small muted">Name des Tages</span>
          <input
            className="text"
            value={day.name}
            onChange={(e) =>
              edit((p) => {
                p.days.find((d) => d.id === day.id)!.name = e.target.value
              })
            }
          />
        </label>
      </section>

      {day.items.map((item, idx) => {
        const ex = exById(item.exerciseId)
        const linked = idx > 0 && !!item.group && item.group === day.items[idx - 1].group
        return (
          <section key={item.id} className={`card plan-item ${linked ? 'linked' : ''}`}>
            {linked && <div className="group-tag">Supersatz mit der Übung darüber</div>}
            <div className="ex-head">
              <h2>{ex.name}</h2>
              <div className="row-btns">
                {(ex.img || ex.cue) && (
                  <button className="btn tiny ghost" onClick={() => setInfo(info === item.id ? null : item.id)}>
                    Technik
                  </button>
                )}
                <button className="btn tiny ghost" aria-label="nach oben" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  ↑
                </button>
                <button className="btn tiny ghost" aria-label="nach unten" onClick={() => move(idx, 1)} disabled={idx === day.items.length - 1}>
                  ↓
                </button>
                <button
                  className="btn tiny ghost danger"
                  aria-label="entfernen"
                  onClick={() => confirm(`${ex.name} entfernen?`) && editItems((items) => items.filter((i) => i.id !== item.id))}
                >
                  ✕
                </button>
              </div>
            </div>
            {info === item.id && <ExerciseInfo ex={ex} />}
            <div className="plan-fields">
              <label>
                <span className="small muted">Sätze</span>
                <NumInput value={item.sets} onChange={(v) => v != null && v > 0 && v < 11 && patch(item.id, { sets: v })} />
              </label>
              <label>
                <span className="small muted">{ex.kind === 'time' ? 'Sek. von' : 'Wdh. von'}</span>
                <NumInput value={item.repMin} onChange={(v) => v != null && v > 0 && patch(item.id, { repMin: v, repMax: Math.max(v, item.repMax) })} />
              </label>
              <label>
                <span className="small muted">bis</span>
                <NumInput value={item.repMax} onChange={(v) => v != null && v > 0 && patch(item.id, { repMax: v })} />
              </label>
            </div>
            {idx > 0 && (
              <button className="btn tiny ghost" onClick={() => toggleSuperset(idx)}>
                {linked ? 'Supersatz aufheben' : 'Als Supersatz mit der Übung darüber'}
              </button>
            )}
          </section>
        )
      })}

      {!adding ? (
        <div className="actions">
          <button className="btn" onClick={() => setAdding(true)}>
            + Übung hinzufügen
          </button>
        </div>
      ) : (
        <section className="card">
          <h2>Übung hinzufügen</h2>
          <select className="select" defaultValue="" onChange={(e) => e.target.value && addExercise(e.target.value)}>
            <option value="" disabled>
              Aus der Liste wählen …
            </option>
            {groups.map((k) => (
              <optgroup key={k} label={KIND_LABEL[k]}>
                {exercises
                  .filter((e) => e.kind === k)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="small muted">Oder eigene Übung anlegen:</p>
          <div className="form-row">
            <input className="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <select className="select" value={newKind} onChange={(e) => setNewKind(e.target.value as Kind)}>
              {Object.entries(KIND_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <button className="btn primary" onClick={addCustom} disabled={!newName.trim()}>
              Anlegen
            </button>
            <button className="btn ghost" onClick={() => setAdding(false)}>
              Abbrechen
            </button>
          </div>
        </section>
      )}

      <div className="actions">
        {plan.days.length > 1 && (
          <button className="btn ghost danger" onClick={removeDay}>
            {day.name} entfernen
          </button>
        )}
        <button
          className="btn ghost"
          onClick={() => confirm('Plan auf den Startplan zurücksetzen? Deine Trainings bleiben erhalten.') && savePlan(defaultPlan())}
        >
          Startplan wiederherstellen
        </button>
      </div>
    </div>
  )
}
