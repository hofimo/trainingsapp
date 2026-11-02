// Ernährung: Ziele vorschlagen, Durchschnitte und Verbrauch schätzen.
import type { BodyWeight, NutritionDay, NutritionGoals } from './types'
import { todayISO } from './util'

type Key = 'kcal' | 'protein' | 'fat' | 'carbs'

const roundTo = (n: number, step: number) => Math.round(n / step) * step

/**
 * Grober Startvorschlag für Muskelaufbau mit leichtem Defizit:
 * Eiweiß 2 g/kg, Fett 0,8 g/kg, Kalorien ca. 30 kcal/kg minus 500, Rest Kohlenhydrate.
 */
export function suggestGoals(kg: number): NutritionGoals {
  const kcal = roundTo(kg * 30 - 500, 50)
  const protein = roundTo(kg * 2, 5)
  const fat = roundTo(kg * 0.8, 5)
  const carbs = Math.max(0, roundTo((kcal - protein * 4 - fat * 9) / 4, 5))
  return { kcal, protein, fat, carbs }
}

export function isoDaysAgo(n: number, from = todayISO()) {
  const d = new Date(from + 'T12:00:00')
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function average(days: NutritionDay[]) {
  if (!days.length) return null
  const sum = (k: Key) => days.reduce((a, d) => a + d[k], 0) / days.length
  return { kcal: sum('kcal'), protein: sum('protein'), fat: sum('fat'), carbs: sum('carbs'), n: days.length }
}

/**
 * Schätzt den echten Tagesverbrauch aus gegessenen Kalorien und Gewichtsverlauf der letzten 4 Wochen:
 * Verbrauch ≈ Ø Kalorien − Gewichtsänderung pro Tag × 7700 kcal/kg.
 */
export function estimateExpenditure(nutrition: NutritionDay[], weights: BodyWeight[], today = todayISO()) {
  const from = isoDaysAgo(27, today)
  const food = nutrition.filter((n) => n.date >= from && n.date <= today && n.kcal > 0)
  const w = weights.filter((b) => b.date >= from && b.date <= today)
  if (food.length < 10 || w.length < 4) return null
  const t = w.map((b) => new Date(b.date + 'T12:00:00').getTime() / 86_400_000)
  const span = Math.max(...t) - Math.min(...t)
  if (span < 13) return null
  // Lineare Regression: Steigung in kg pro Tag
  const mt = t.reduce((a, x) => a + x, 0) / t.length
  const my = w.reduce((a, b) => a + b.kg, 0) / w.length
  let num = 0
  let den = 0
  w.forEach((b, i) => {
    num += (t[i] - mt) * (b.kg - my)
    den += (t[i] - mt) ** 2
  })
  const slope = den ? num / den : 0
  const avgKcal = food.reduce((a, n) => a + n.kcal, 0) / food.length
  return {
    kcal: roundTo(avgKcal - slope * 7700, 10),
    avgKcal: Math.round(avgKcal),
    kgPerWeek: slope * 7,
    days: food.length,
  }
}
