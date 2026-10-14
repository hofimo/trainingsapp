import type { Session } from './types'
import { weekStart } from './util'

export type Muscle = 'biceps' | 'triceps' | 'chest' | 'back' | 'shoulders' | 'quads' | 'glutes' | 'calves' | 'core'

/** Empfohlene harte Sätze pro Woche (grobe Richtwerte für Muskelaufbau) */
export const MUSCLES: { id: Muscle; name: string; min?: number; max?: number }[] = [
  { id: 'biceps', name: 'Bizeps', min: 10, max: 20 },
  { id: 'triceps', name: 'Trizeps', min: 10, max: 20 },
  { id: 'chest', name: 'Brust', min: 6, max: 20 },
  { id: 'back', name: 'Rücken', min: 6, max: 20 },
  { id: 'shoulders', name: 'Schultern', min: 6, max: 20 },
  { id: 'quads', name: 'Oberschenkel', min: 6, max: 20 },
  { id: 'glutes', name: 'Po & Beinbeuger', min: 6, max: 20 },
  { id: 'calves', name: 'Waden' },
  { id: 'core', name: 'Rumpf', min: 3, max: 15 },
]

/** Hauptmuskel zählt 1 Satz, mittrainierte Muskeln zählen einen halben. */
const MAP: Record<string, Partial<Record<Muscle, number>>> = {
  goblet_squat: { quads: 1, glutes: 0.5 },
  split_squat: { quads: 1, glutes: 0.5 },
  reverse_lunge: { quads: 1, glutes: 0.5 },
  hip_thrust: { glutes: 1 },
  rdl: { glutes: 1 },
  step_up: { quads: 1, glutes: 0.5 },
  calf_raise: { calves: 1 },
  db_bench: { chest: 1, triceps: 0.5, shoulders: 0.5 },
  incline_press: { chest: 1, triceps: 0.5, shoulders: 0.5 },
  pushup: { chest: 1, triceps: 0.5 },
  close_pushup: { triceps: 1, chest: 0.5 },
  db_fly: { chest: 1 },
  pullup: { back: 1, biceps: 0.5 },
  chinup: { back: 1, biceps: 0.5 },
  row: { back: 1, biceps: 0.5 },
  face_pull: { shoulders: 1, back: 0.5 },
  band_pull_apart: { shoulders: 1, back: 0.5 },
  reverse_fly: { shoulders: 1, back: 0.5 },
  shoulder_press: { shoulders: 1, triceps: 0.5 },
  lateral_raise: { shoulders: 1 },
  curl: { biceps: 1 },
  hammer_curl: { biceps: 1 },
  incline_curl: { biceps: 1 },
  concentration_curl: { biceps: 1 },
  band_curl: { biceps: 1 },
  french_press: { triceps: 1 },
  kickback: { triceps: 1 },
  overhead_ext: { triceps: 1 },
  band_pushdown: { triceps: 1 },
  bench_dip: { triceps: 1, chest: 0.5 },
  dead_bug: { core: 1 },
  bird_dog: { core: 1 },
  side_plank: { core: 1 },
  plank: { core: 1 },
}

/** Grundübungen bekommen die lange Pause, alles andere die kurze. */
const COMPOUND = new Set([
  'goblet_squat', 'split_squat', 'reverse_lunge', 'hip_thrust', 'rdl', 'step_up', 'db_bench', 'incline_press',
  'pushup', 'close_pushup', 'pullup', 'chinup', 'row', 'shoulder_press', 'bench_dip',
])
export const isCompound = (exerciseId: string) => COMPOUND.has(exerciseId)

export const hasMuscles = (exerciseId: string) => exerciseId in MAP

/** Erledigte Sätze pro Muskel in der Woche, die mit `week` (Montag, YYYY-MM-DD) beginnt. */
export function setsPerMuscle(sessions: Session[], week: string) {
  const out = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<Muscle, number>
  let unmapped = 0
  for (const s of sessions) {
    if (weekStart(s.date) !== week) continue
    for (const e of s.entries) {
      const done = e.sets.filter((x) => x.done).length
      if (!done) continue
      const m = MAP[e.exerciseId]
      if (!m) {
        unmapped += done
        continue
      }
      for (const [k, f] of Object.entries(m)) out[k as Muscle] += done * (f ?? 0)
    }
  }
  return { sets: out, unmapped }
}
