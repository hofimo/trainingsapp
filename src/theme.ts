import type { CSSProperties } from 'react'
import type { Plan, Session } from './types'
import { todayISO, weekStart } from './util'

/** Jeder Trainingstag bekommt seine eigene Farbe (Reihenfolge wie im Plan). */
const DAY_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#14b8a6', '#ec4899', '#eab308']

export function dayColor(plan: Plan, dayId: string) {
  const i = plan.days.findIndex((d) => d.id === dayId)
  return DAY_COLORS[(i < 0 ? 0 : i) % DAY_COLORS.length]
}

/** Setzt --day für Elemente, die in der Tagesfarbe erscheinen. */
export const dayStyle = (plan: Plan, dayId: string) => ({ '--day': dayColor(plan, dayId) }) as CSSProperties

/** Kurzzeichen für das Tages-Abzeichen: „Tag A“ → „A“ */
export const dayLetter = (name: string) => (name.replace(/^tag\s+/i, '').trim()[0] ?? '?').toUpperCase()

/** Wochen in Folge mit erreichtem Ziel; die laufende Woche zählt mit, sobald sie das Ziel erreicht. */
export function weekStreak(sessions: Session[], goal = 3) {
  const count = new Map<string, number>()
  for (const s of sessions) if (s.finished) count.set(weekStart(s.date), (count.get(weekStart(s.date)) ?? 0) + 1)
  const d = new Date(weekStart(todayISO()) + 'T12:00:00')
  if ((count.get(weekStart(todayISO())) ?? 0) < goal) d.setDate(d.getDate() - 7)
  let n = 0
  for (;;) {
    const iso = weekStart(d.toISOString().slice(0, 10))
    if ((count.get(iso) ?? 0) < goal) return n
    n++
    d.setDate(d.getDate() - 7)
  }
}
