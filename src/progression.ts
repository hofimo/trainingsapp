// Automatische Vorschläge nach dem Prinzip der doppelten Progression:
// Erst Wiederholungen im Bereich steigern, und wenn alle Sätze das obere Ende schaffen, das Gewicht erhöhen.
import type { Exercise, PlanItem, Session, SetLog } from './types'

export type SuggestionKind = 'first' | 'up' | 'reps' | 'hold' | 'max' | 'deload'

export interface Suggestion {
  kind: SuggestionKind
  /** Vorgeschlagenes Gewicht pro Hand (nur bei Kurzhantel-Übungen, sonst Zusatzgewicht oder null) */
  weight: number | null
  /** Ziel-Wiederholungen pro Satz */
  reps: number[]
  text: string
  /** Kurzform für die Anzeige des letzten Mals, z. B. "10 kg × 12, 12, 11" */
  last?: string
}

export interface ExerciseHistoryPoint {
  sessionId: string
  date: string
  sets: SetLog[]
}

/** Alle abgeschlossenen Sätze einer Übung, neueste zuerst. */
export function historyFor(exerciseId: string, sessions: Session[], excludeSessionId?: string): ExerciseHistoryPoint[] {
  const out: ExerciseHistoryPoint[] = []
  for (const s of sessions) {
    if (s.id === excludeSessionId) continue
    const sets = s.entries
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .filter((x) => x.done && x.reps != null && x.reps > 0)
    if (sets.length) out.push({ sessionId: s.id, date: s.date, sets })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

export const fmtKg = (w: number) => `${String(w).replace('.', ',')} kg`

export function describeSets(ex: Exercise, sets: SetLog[]): string {
  const reps = sets.map((s) => s.reps).join(', ')
  const unit = ex.kind === 'time' ? ' s' : ''
  const ws = [...new Set(sets.map((s) => s.weight).filter((w): w is number => w != null && w > 0))]
  if (ws.length === 1) return `${fmtKg(ws[0])} × ${reps}${unit}`
  if (ws.length > 1) return sets.map((s) => `${s.weight ?? 0}×${s.reps}`).join(', ')
  return `${reps}${unit}`
}

/** Häufigstes (bei Gleichstand höchstes) Gewicht der Sätze. */
function mainWeight(sets: SetLog[]): number | null {
  const counts = new Map<number, number>()
  for (const s of sets) if (s.weight != null && s.weight > 0) counts.set(s.weight, (counts.get(s.weight) ?? 0) + 1)
  let best: number | null = null
  let bestCount = 0
  for (const [w, c] of counts) if (c > bestCount || (c === bestCount && best != null && w > best)) [best, bestCount] = [w, c]
  return best
}

function snapToAvailable(w: number, weights: number[]): number {
  if (!weights.length) return w
  const sorted = [...weights].sort((a, b) => a - b)
  let pick = sorted[0]
  for (const x of sorted) if (x <= w) pick = x
  return pick
}

const repsAt = (sets: SetLog[], w: number | null) =>
  sets.filter((s) => (w == null ? true : (s.weight ?? 0) === w)).map((s) => s.reps ?? 0)

export function suggest(
  ex: Exercise,
  item: PlanItem,
  sessions: Session[],
  weights: number[],
  excludeSessionId?: string,
): Suggestion {
  const hist = historyFor(ex.id, sessions, excludeSessionId)
  const sorted = [...weights].sort((a, b) => a - b)
  const fill = (r: number) => Array.from({ length: item.sets }, () => r)
  const unit = ex.kind === 'time' ? 's' : 'Wdh.'

  if (!hist.length) {
    if (ex.kind === 'dumbbell') {
      const w = snapToAvailable(ex.start ?? sorted[0] ?? 0, sorted)
      return {
        kind: 'first',
        weight: w,
        reps: fill(item.repMin),
        text: `Erstes Mal: Starte mit ca. ${fmtKg(w)} und wähle das Gewicht so, dass ${item.repMin}–${item.repMax} ${unit} sauber gehen.`,
      }
    }
    return {
      kind: 'first',
      weight: null,
      reps: fill(item.repMin),
      text: `Erstes Mal: Schaffe so viele saubere ${unit} wie möglich, Ziel ${item.repMin}–${item.repMax}.`,
    }
  }

  const last = hist[0]
  const lastText = describeSets(ex, last.sets)
  const w = ex.kind === 'band' ? null : mainWeight(last.sets)
  const lastReps = repsAt(last.sets, w)
  const enoughSets = lastReps.length >= item.sets
  const allTop = enoughSets && lastReps.slice(0, item.sets).every((r) => r >= item.repMax)

  // Stagnation: die letzten beiden Male gleiches Gewicht und weniger Wiederholungen als davor
  if (hist.length >= 3 && ex.kind === 'dumbbell' && w != null) {
    const totals = hist.slice(0, 3).map((h) => (mainWeight(h.sets) === w ? repsAt(h.sets, w).reduce((a, b) => a + b, 0) : -1))
    if (totals.every((t) => t >= 0) && totals[0] < totals[1] && totals[1] < totals[2]) {
      const lower = [...sorted].reverse().find((x) => x < w)
      if (lower != null) {
        return {
          kind: 'deload',
          weight: lower,
          reps: fill(item.repMax),
          text: `Die Leistung sinkt seit zwei Einheiten. Mach heute eine leichtere Einheit mit ${fmtKg(lower)} und achte auf Schlaf und Essen.`,
          last: lastText,
        }
      }
    }
  }

  if (allTop) {
    if (ex.kind === 'dumbbell' && w != null) {
      const next = sorted.find((x) => x > w)
      if (next != null) {
        return {
          kind: 'up',
          weight: next,
          reps: fill(item.repMin),
          text: `Steigern! Du hast alle Sätze mit ${item.repMax} ${unit} geschafft. Heute ${fmtKg(next)}, Ziel ${item.repMin}–${item.repMax} ${unit}.`,
          last: lastText,
        }
      }
      return {
        kind: 'max',
        weight: w,
        reps: fill(item.repMax + 2),
        text: `Schwerstes Gewicht erreicht. Mehr Wiederholungen (${item.repMax + 2}) und 3 s langsam ablassen. ${ex.harder ?? ''}`.trim(),
        last: lastText,
      }
    }
    if (ex.kind === 'time') {
      return {
        kind: 'max',
        weight: null,
        reps: fill(item.repMax + 5),
        text: `Oberes Ziel geschafft. Halte heute ${item.repMax + 5} s. ${ex.harder ?? ''}`.trim(),
        last: lastText,
      }
    }
    const tip =
      ex.kind === 'band'
        ? 'Nimm ein stärkeres Band oder geh weiter vom Befestigungspunkt weg.'
        : (ex.harder ?? 'Nimm ein schwächeres Hilfsband, lass es weg oder mach die Bewegung langsamer.')
    return {
      kind: 'max',
      weight: w,
      reps: fill(item.repMax),
      text: `Oberes Ziel geschafft. ${tip}`,
      last: lastText,
    }
  }

  // Gleiches Gewicht, pro Satz eine Wiederholung mehr (gedeckelt auf das obere Ende)
  const step = ex.kind === 'time' ? 5 : 1
  const target = Array.from({ length: item.sets }, (_, i) => {
    const prev = lastReps[i] ?? lastReps[lastReps.length - 1] ?? item.repMin
    return Math.min(item.repMax, Math.max(item.repMin, prev + step))
  })
  return {
    kind: 'reps',
    weight: w,
    reps: target,
    text:
      w != null && ex.kind === 'dumbbell'
        ? `Bleib bei ${fmtKg(w)} und schaffe pro Satz ${step} ${unit} mehr. Steigern, wenn alle Sätze ${item.repMax} ${unit} schaffen.`
        : `Ziel: ${step} ${unit} mehr pro Satz als letztes Mal, bis alle Sätze ${item.repMax} ${unit} schaffen.`,
    last: lastText,
  }
}

/** Geschätztes Maximalgewicht für 1 Wiederholung (Epley-Formel). */
export const e1rm = (weight: number, reps: number) => weight * (1 + reps / 30)
