// Ernährung: Werte aus dem Kurzbefehl (Apple Health) lesen, Ziele vorschlagen, Verbrauch schätzen.
import type { BodyWeight, NutritionDay, NutritionGoals } from './types'
import { todayISO } from './util'

type Key = 'kcal' | 'protein' | 'fat' | 'carbs'

const KEYS: Record<string, Key | 'kj'> = {
  kcal: 'kcal',
  kalorien: 'kcal',
  energie: 'kcal',
  kj: 'kj',
  e: 'protein',
  eiweiß: 'protein',
  eiweiss: 'protein',
  protein: 'protein',
  f: 'fat',
  fett: 'fat',
  fat: 'fat',
  kh: 'carbs',
  kohlenhydrate: 'carbs',
  carbs: 'carbs',
}

/** Liest Zahlen wie "2150", "2.150", "2.150,5", "180,4" oder "180.4". */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}

function findDate(line: string): string | null {
  const iso = line.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const de = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/)
  if (de) {
    const y = de[3].length === 2 ? `20${de[3]}` : de[3]
    return `${y}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`
  }
  return null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Liest den Text aus dem Kurzbefehl, z. B.
 * "TA;datum=2026-11-02;kcal=2150;e=180,5;f=70;kh=210"
 * Mehrere Tage gehen mit je einer Zeile. Zeilen ohne Datum gelten für heute.
 */
export function parseNutritionText(text: string, fallbackDate = todayISO()): NutritionDay[] {
  const byDate = new Map<string, Partial<Record<Key, number>>>()
  let date = fallbackDate
  for (const line of text.split(/[\r\n]+/)) {
    date = findDate(line) ?? date
    const vals = byDate.get(date) ?? {}
    let found = false
    for (const m of line.matchAll(/([a-zäöüß]+)\s*[=:]\s*(-?[\d.,]+)\s*(kj|kcal)?/gi)) {
      const key = KEYS[m[1].toLowerCase()]
      let v = parseAmount(m[2])
      if (!key || v == null || v < 0) continue
      if (key === 'kj' || m[3]?.toLowerCase() === 'kj') {
        if (key !== 'kj' && key !== 'kcal') continue
        v = v / 4.184
        vals.kcal = v
      } else vals[key] = v
      found = true
    }
    if (found) byDate.set(date, vals)
  }

  const out: NutritionDay[] = []
  for (const [d, v] of byDate) {
    const protein = round1(v.protein ?? 0)
    const fat = round1(v.fat ?? 0)
    const carbs = round1(v.carbs ?? 0)
    const kcal = Math.round(v.kcal ?? protein * 4 + fat * 9 + carbs * 4)
    if (kcal <= 0 && protein + fat + carbs <= 0) continue
    if (kcal > 15000 || protein > 1500 || fat > 1500 || carbs > 3000) continue
    out.push({ date: d, kcal, protein, fat, carbs, source: 'health' })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

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
