import { useCallback, useEffect, useState } from 'react'
import ExerciseInfo from '../components/ExerciseInfo'
import NumInput from '../components/NumInput'
import RestTimer, { loadRest, storeRest, unlockAudio, type Rest } from '../components/RestTimer'
import { isCompound } from '../muscles'
import { describeSets, suggest, type Suggestion } from '../progression'
import { useStore } from '../store'
import type { EntryLog, Exercise, PlanItem, Session, SetLog } from '../types'
import { fmtDate } from '../util'

interface Props {
  session: Session
  onClose: () => void
}

const LABEL: Record<Suggestion['kind'], string> = {
  first: 'Start',
  up: '↑ Steigern',
  reps: 'Wiederholungen steigern',
  hold: 'Halten',
  max: 'Nächste Stufe',
  deload: 'Leichter Tag',
}

export default function Workout({ session, onClose }: Props) {
  const { plan, settings, sessions, exById, saveSession, removeSession } = useStore()
  const [openCue, setOpenCue] = useState<string | null>(null)
  const [rest, setRestState] = useState<Rest | null>(() => (session.finished ? null : loadRest()))
  const day = plan.days.find((d) => d.id === session.dayId)

  const setRest = useCallback((r: Rest | null) => {
    setRestState(r)
    storeRest(r)
  }, [])

  // Bildschirm während des Trainings anlassen, damit der Timer sichtbar bleibt
  useEffect(() => {
    if (session.finished || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let active = true
    const acquire = async () => {
      try {
        if (active && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
      } catch {
        // z. B. Energiesparmodus: dann eben ohne
      }
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', acquire)
      lock?.release().catch(() => {})
    }
  }, [session.finished])

  const update = (fn: (s: Session) => Session) => saveSession(fn(structuredClone(session)))

  const itemFor = (e: EntryLog): PlanItem =>
    day?.items.find((i) => i.id === e.planItemId) ?? {
      id: e.planItemId,
      exerciseId: e.exerciseId,
      sets: e.sets.length,
      repMin: 8,
      repMax: 12,
    }

  const doneSets = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const allSets = session.entries.reduce((n, e) => n + e.sets.length, 0)

  /** Nach einem erledigten Satz die Pause starten, außer mitten im Supersatz oder nach dem letzten Satz. */
  function setDone(ei: number) {
    const item = itemFor(session.entries[ei])
    const next = session.entries[ei + 1]
    if (item.group && next && itemFor(next).group === item.group) return
    if (allSets - doneSets <= 1) return setRest(null)
    const ex = exById(session.entries[ei].exerciseId)
    const total = isCompound(ex.id) ? settings.restLong ?? 90 : settings.restShort ?? 60
    setRest({ endsAt: Date.now() + total * 1000, total, label: ex.name })
  }

  function finish() {
    setRest(null)
    update((s) => ({ ...s, finished: true, finishedAt: s.finishedAt ?? new Date().toISOString() }))
    onClose()
  }

  function discard() {
    if (confirm('Dieses Training wirklich löschen?')) {
      setRest(null)
      removeSession(session.id)
      onClose()
    }
  }

  return (
    <div className="workout">
      <header className="page-head">
        <div>
          <h1>{session.dayName}</h1>
          <p className="muted">
            {fmtDate(session.date)} · {doneSets}/{allSets} Sätze
          </p>
        </div>
        {session.finished && (
          <button className="btn ghost" onClick={onClose}>
            Schließen
          </button>
        )}
      </header>
      <div className="progress-bar">
        <div style={{ width: `${allSets ? (doneSets / allSets) * 100 : 0}%` }} />
      </div>

      {session.entries.map((entry, ei) => {
        const ex = exById(entry.exerciseId)
        const item = itemFor(entry)
        const sug = suggest(ex, item, sessions, settings.weights, session.id)
        const prevGroup = ei > 0 ? itemFor(session.entries[ei - 1]).group : undefined
        const nextGroup = ei < session.entries.length - 1 ? itemFor(session.entries[ei + 1]).group : undefined
        const inGroup = !!item.group && (item.group === prevGroup || item.group === nextGroup)
        const groupStart = inGroup && item.group !== prevGroup
        return (
          <section key={entry.planItemId + ei} className={`card ex-card ${inGroup ? 'in-group' : ''} ${groupStart ? 'group-start' : ''}`}>
            {groupStart && <div className="group-tag">Supersatz: im Wechsel, Pause erst danach</div>}
            <div className="ex-head">
              <div>
                <h2>{ex.name}</h2>
                <p className="muted small">
                  {item.sets} × {item.repMin === item.repMax ? item.repMin : `${item.repMin}–${item.repMax}`}{' '}
                  {ex.kind === 'time' ? 's' : 'Wdh.'}
                  {ex.perSide ? ' pro Seite' : ''}
                </p>
              </div>
              {(ex.cue || ex.img) && (
                <button className="btn tiny ghost" onClick={() => setOpenCue(openCue === entry.planItemId ? null : entry.planItemId)}>
                  Technik
                </button>
              )}
            </div>
            {openCue === entry.planItemId && <ExerciseInfo ex={ex} />}

            <div className={`sug sug-${sug.kind}`}>
              <b>{LABEL[sug.kind]}</b> {sug.text}
              {sug.last && <div className="small muted">Letztes Mal: {sug.last}</div>}
            </div>

            <SetTable
              ex={ex}
              sets={entry.sets}
              sug={sug}
              onDone={() => setDone(ei)}
              onChange={(sets) =>
                update((s) => {
                  s.entries[ei].sets = sets
                  return s
                })
              }
            />

            <textarea
              className="note"
              rows={1}
              placeholder="Notiz zur Übung"
              value={entry.note ?? ''}
              onChange={(e) =>
                update((s) => {
                  s.entries[ei].note = e.target.value
                  return s
                })
              }
            />
          </section>
        )
      })}

      <section className="card">
        <h2>Notiz zum Training</h2>
        <textarea
          className="note"
          rows={3}
          placeholder="Wie lief's? Energie, Schlaf, Rücken …"
          value={session.note ?? ''}
          onChange={(e) => update((s) => ({ ...s, note: e.target.value }))}
        />
      </section>

      <div className="actions">
        {!session.finished ? (
          <button className="btn primary big" onClick={finish}>
            Training beenden
          </button>
        ) : (
          <button className="btn primary big" onClick={onClose}>
            Fertig
          </button>
        )}
        <button className="btn danger ghost" onClick={discard}>
          Training löschen
        </button>
      </div>

      {!session.finished && <RestTimer rest={rest} onChange={setRest} />}
    </div>
  )
}

function SetTable({ ex, sets, sug, onChange, onDone }: { ex: Exercise; sets: SetLog[]; sug: Suggestion; onChange: (s: SetLog[]) => void; onDone: () => void }) {
  const hasWeight = ex.kind === 'dumbbell' || ex.kind === 'bodyweight'
  const set = (i: number, patch: Partial<SetLog>) => onChange(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  function toggle(i: number) {
    const s = sets[i]
    if (s.done) return set(i, { done: false })
    const reps = s.reps ?? sug.reps[i] ?? sug.reps[sug.reps.length - 1] ?? null
    const weight = s.weight ?? (ex.kind === 'dumbbell' ? sug.weight : null)
    // Gewicht in die folgenden, noch offenen Sätze übernehmen
    const next = sets.map((x, j) => {
      if (j === i) return { ...x, reps, weight, done: true }
      if (j > i && !x.done && ex.kind === 'dumbbell' && weight != null) return { ...x, weight }
      return x
    })
    unlockAudio()
    onChange(next)
    onDone()
    navigator.vibrate?.(30)
  }

  return (
    <div className={`sets ${hasWeight ? '' : 'no-weight'}`}>
      <div className="set-row set-head">
        <span>Satz</span>
        {hasWeight && <span>{ex.kind === 'dumbbell' ? 'kg / Hand' : 'Zusatz kg'}</span>}
        <span>{ex.kind === 'time' ? 'Sekunden' : 'Wdh.'}</span>
        <span />
      </div>
      {sets.map((s, i) => (
        <div key={i} className={`set-row ${s.done ? 'done' : ''}`}>
          <span className="set-no">{i + 1}</span>
          {hasWeight && (
            <NumInput
              decimal
              ariaLabel={`Gewicht Satz ${i + 1}`}
              value={s.weight}
              placeholder={ex.kind === 'dumbbell' && sug.weight != null ? String(sug.weight).replace('.', ',') : '0'}
              onChange={(v) => set(i, { weight: v })}
            />
          )}
          <NumInput
            ariaLabel={`Wiederholungen Satz ${i + 1}`}
            value={s.reps}
            placeholder={String(sug.reps[i] ?? sug.reps[sug.reps.length - 1] ?? '')}
            onChange={(v) => set(i, { reps: v })}
          />
          <button className={`check ${s.done ? 'on' : ''}`} aria-label={s.done ? 'Satz offen' : 'Satz erledigt'} onClick={() => toggle(i)}>
            ✓
          </button>
        </div>
      ))}
      <div className="set-tools">
        <button className="btn tiny ghost" onClick={() => onChange([...sets, { reps: null, weight: sets[sets.length - 1]?.weight ?? null, done: false }])}>
          + Satz
        </button>
        {sets.length > 1 && (
          <button className="btn tiny ghost" onClick={() => onChange(sets.slice(0, -1))}>
            − Satz
          </button>
        )}
        {sets.some((s) => s.done) && <span className="small muted">{describeSets(ex, sets.filter((s) => s.done))}</span>}
      </div>
    </div>
  )
}
