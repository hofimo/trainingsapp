// Lebensmittel: eingebaute Grundlebensmittel, Open-Food-Facts-Abfrage (Barcode und Suche) und Rechenhilfen.
import type { Food, FoodEntry, Macros, Meal, Portion } from './types'

export const MEALS: { id: Meal; label: string; short: string; icon: string }[] = [
  { id: 'breakfast', label: 'Frühstück', short: 'Früh', icon: '🥣' },
  { id: 'lunch', label: 'Mittagessen', short: 'Mittag', icon: '🍝' },
  { id: 'dinner', label: 'Abendessen', short: 'Abend', icon: '🍽️' },
  { id: 'snack', label: 'Snacks', short: 'Snack', icon: '🍎' },
]

export const mealLabel = (m: Meal) => MEALS.find((x) => x.id === m)?.label ?? m

/** Passende Mahlzeit zur Uhrzeit */
export function mealForNow(d = new Date()): Meal {
  const h = d.getHours() + d.getMinutes() / 60
  if (h < 10.5) return 'breakfast'
  if (h < 14.5) return 'lunch'
  if (h >= 17.5 && h < 21.5) return 'dinner'
  return 'snack'
}

// Grundlebensmittel, Nährwerte pro 100 g/ml (gerundete Durchschnittswerte, Kohlenhydrate = verwertbare KH).
// Format: Name | kcal | Eiweiß | Fett | KH | Portionen "Label:g,Label:g" | ml?
const BASE_RAW = `
Apfel|52|0,3|0,2|11,4|Stück:150
Banane|89|1,1|0,3|20|Stück:120
Birne|57|0,4|0,1|12,4|Stück:160
Orange|47|0,9|0,1|9,4|Stück:150
Mandarine|53|0,8|0,3|11|Stück:60
Kiwi|61|1,1|0,5|11|Stück:75
Erdbeeren|32|0,7|0,3|5,5|Schale:250,Handvoll:80
Heidelbeeren|57|0,7|0,3|12|Schale:125,Handvoll:60
Himbeeren|52|1,2|0,7|5,4|Schale:125,Handvoll:60
Weintrauben|70|0,7|0,2|16|Handvoll:80
Ananas|50|0,5|0,1|12|Scheibe:80
Mango|60|0,8|0,4|13|Stück:300
Wassermelone|30|0,6|0,2|7,5|Stück:300
Pfirsich|41|0,8|0,1|9|Stück:130
Avocado|160|2|15|2|Stück:150,halbe:75
Tomate|18|0,9|0,2|2,6|Stück:80
Cherrytomaten|20|1|0,2|3|Stück:15,Handvoll:80
Gurke|12|0,6|0,1|1,8|Stück:400,Scheibe:10
Paprika|31|1|0,3|5|Stück:150
Karotte|36|0,9|0,2|6,7|Stück:80
Brokkoli|34|2,8|0,4|3|Portion:200
Blumenkohl|25|1,9|0,3|2,5|Portion:200
Zucchini|17|1,2|0,3|2,2|Stück:250
Spinat|23|2,9|0,4|0,6|Portion:150
Blattsalat|14|1,2|0,2|1,5|Portion:60
Kartoffeln gekocht|72|2|0,1|15,6|Stück:80
Süßkartoffel|86|1,6|0,1|18|Stück:250
Zwiebel|40|1,1|0,1|8|Stück:80
Champignons|22|3|0,3|0,5|Portion:150
Erbsen (TK)|81|5,4|0,4|12|Portion:150
Mais (Dose)|86|3|1,2|15|Dose:140,EL:20
Grüne Bohnen|31|1,8|0,2|4,6|Portion:150
Kidneybohnen (Dose)|100|7|0,5|14|Dose:250
Kichererbsen (Dose)|120|7|2|16|Dose:240
Linsen gekocht|116|9|0,4|17|Portion:200
Haferflocken|370|13,5|7|59|EL:10,Portion:50
Müsli ungesüßt|360|10|6|60|Portion:50
Cornflakes|375|7|1|83|Portion:30
Reis gekocht|130|2,7|0,3|28|Portion:200
Reis roh|350|7|0,6|78|Portion:70
Nudeln gekocht|150|5,5|0,9|30|Portion:250
Nudeln roh|355|12,5|1,5|70|Portion:100
Couscous gekocht|112|3,8|0,2|23|Portion:200
Quinoa gekocht|120|4,4|1,9|21|Portion:200
Vollkornbrot|220|7|1,5|40|Scheibe:50
Mischbrot|230|7|1,2|46|Scheibe:50
Toastbrot|260|8|4|47|Scheibe:25
Brötchen|270|9|1,5|54|Stück:60
Vollkornbrötchen|240|9|2,5|43|Stück:70
Knäckebrot|340|10|1,5|66|Scheibe:10
Reiswaffel|385|8|3|80|Stück:8
Tortilla Wrap|300|8|7|50|Stück:60
Ei (Größe M)|155|13|11|0,7|Stück:55
Milch 1,5 %|47|3,4|1,5|4,9|Glas:200,Schuss:30|ml
Milch 3,5 %|64|3,3|3,5|4,8|Glas:200,Schuss:30|ml
Hafermilch|46|0,6|1,5|7|Glas:200|ml
Magerquark|67|12|0,2|4|Becher:250,EL:30
Skyr natur|63|11|0,2|4|Becher:150
Naturjoghurt 1,5 %|47|4|1,5|4,5|Becher:150
Naturjoghurt 3,5 %|62|3,5|3,5|4,3|Becher:150
Griechischer Joghurt 10 %|120|4|10|4|Becher:150
Hüttenkäse|100|12,5|4,5|2,6|Becher:200
Gouda|360|25|28|0|Scheibe:25
Mozzarella|250|18|19|1|Kugel:125
Feta|270|17|22|0,5|Packung:200
Parmesan|400|33|29|0|EL:5
Frischkäse|250|6|23|3|EL:20
Butter|740|0,7|83|0,6|TL:5,Portion:10
Sahne 30 %|290|2,4|30|3|EL:15|ml
Whey Proteinpulver|380|75|6|7|Messlöffel:30
Hähnchenbrust roh|105|23,5|1|0|Stück:150
Hähnchenbrust gebraten|150|30|3|0|Stück:120
Putenbrust roh|107|24|1|0|Stück:150
Rinderhack roh|250|18|20|0|Packung:400
Rinderhack mager roh|125|21|5|0|Packung:400
Schweineschnitzel roh|106|22|2|0|Stück:150
Lachs roh|200|20|13|0|Filet:125
Thunfisch im eigenen Saft|110|26|1|0|Dose:150
Garnelen|85|18|1|0|Portion:150
Kochschinken|110|19|3,5|1|Scheibe:20
Putenaufschnitt|105|21|2|1|Scheibe:20
Salami|400|22|34|0,5|Scheibe:10
Wiener Würstchen|270|13|24|0,5|Stück:50
Tofu natur|145|15|9|1|Packung:200
Olivenöl|884|0|100|0|EL:10,TL:4|ml
Rapsöl|884|0|100|0|EL:10,TL:4|ml
Erdnussbutter|600|25|50|12|EL:15,TL:7
Mandeln|600|21|52|6|Handvoll:25
Walnüsse|670|15|65|7|Handvoll:25
Erdnüsse geröstet|590|25|49|12|Handvoll:25
Cashews|570|18|44|30|Handvoll:25
Zartbitterschokolade 70 %|560|8|42|33|Stück:10,Tafel:100
Vollmilchschokolade|535|7|30|57|Stück:6,Tafel:100
Gummibärchen|340|7|0|77|Handvoll:30
Kartoffelchips|535|6|33|50|Handvoll:25,Tüte:175
Rührkuchen|400|6|20|50|Stück:70
Vanilleeis|200|3,5|10|24|Kugel:50
Honig|305|0,4|0|75|TL:10
Marmelade|250|0,3|0|60|TL:10
Nuss-Nougat-Creme|539|6,3|31|57|TL:10,EL:20
Zucker|400|0|0|100|TL:5
Cola|42|0|0|10,6|Glas:250,Dose:330|ml
Cola Zero|0,3|0|0|0|Glas:250,Dose:330|ml
Orangensaft|45|0,7|0,2|10|Glas:200|ml
Apfelschorle|24|0,1|0|5,5|Glas:300|ml
Bier|43|0,5|0|3|Flasche:500,Glas:300|ml
Alkoholfreies Bier|26|0,3|0|5,5|Flasche:500|ml
Rotwein|85|0,1|0|2,6|Glas:200|ml
Kaffee schwarz|2|0,2|0|0,3|Tasse:150|ml
Cappuccino|33|1,7|1,7|2,5|Tasse:200|ml
Ketchup|100|1,2|0,2|23|EL:15
Mayonnaise|680|1|75|3|EL:15
Hummus|250|7|18|13|EL:20
Pommes frites|290|3,4|15|35|Portion:150
Döner Kebab|215|11|10|20|Stück:400
Burger|250|13|12|24|Stück:220
Pizza Margherita|250|10|10|29|Stück:350
Spaghetti Bolognese|130|7|4,5|16|Teller:400
`

const num = (s: string) => parseFloat(s.replace(',', '.'))

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const BASE_FOODS: Food[] = BASE_RAW.trim()
  .split('\n')
  .map((line) => {
    const [name, kcal, p, f, c, portions, unit] = line.split('|')
    return {
      id: `b:${slug(name)}`,
      name,
      unit: unit === 'ml' ? 'ml' : 'g',
      per100: { kcal: num(kcal), protein: num(p), fat: num(f), carbs: num(c) },
      portions: (portions ?? '')
        .split(',')
        .filter(Boolean)
        .map((x) => {
          const [label, g] = x.split(':')
          return { label, g: num(g) }
        }),
      source: 'base' as const,
    }
  })

const r1 = (n: number) => Math.round(n * 10) / 10

/** Nährwerte für eine Menge in g/ml */
export function macrosFor(food: Pick<Food, 'per100'>, amount: number): Macros {
  const k = amount / 100
  return {
    kcal: Math.round(food.per100.kcal * k),
    protein: r1(food.per100.protein * k),
    fat: r1(food.per100.fat * k),
    carbs: r1(food.per100.carbs * k),
  }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, x) => ({ kcal: a.kcal + x.kcal, protein: a.protein + x.protein, fat: a.fat + x.fat, carbs: a.carbs + x.carbs }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
}

/** Für die Suche: klein, ohne Umlaute und Satzzeichen */
export const norm = (s: string) => slug(s).replace(/-/g, ' ')

/** Treffer-Güte für die lokale Suche (0 = kein Treffer) */
export function matchScore(food: Food, q: string) {
  const words = norm(q).split(' ').filter(Boolean)
  if (!words.length) return 0
  const hay = norm(`${food.name} ${food.brand ?? ''}`)
  if (!words.every((w) => hay.includes(w))) return 0
  const name = norm(food.name)
  let s = 1
  if (name.startsWith(words[0])) s += 2
  if (name.split(' ').some((w) => w === words[0])) s += 1
  if (food.source === 'base') s += 0.5
  return s
}

/** Beschreibung einer Menge, z. B. "2 × Scheibe (100 g)" */
export function amountText(e: Pick<FoodEntry, 'amount' | 'unit' | 'portion'>) {
  const n = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',')
  if (!e.amount) return ''
  if (e.portion) return `${n(e.portion.qty)} × ${e.portion.label} (${n(e.amount)} ${e.unit})`
  return `${n(e.amount)} ${e.unit}`
}

// ---------- Open Food Facts ----------
// Freie Lebensmitteldatenbank (openfoodfacts.org), ohne Konto und Schlüssel nutzbar.

const OFF_FIELDS = 'code,product_name,product_name_de,generic_name_de,brands,nutriments,serving_quantity,serving_size,quantity,product_quantity'

interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  generic_name_de?: string
  brands?: string
  nutriments?: Record<string, number | string | undefined>
  serving_quantity?: number | string
  serving_size?: string
  quantity?: string
  product_quantity?: number | string
}

const toNum = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? n : null
}

/** Wandelt ein Open-Food-Facts-Produkt in ein Lebensmittel um. null, wenn Name oder Nährwerte fehlen. */
export function fromOff(p: OffProduct): Food | null {
  const n = p.nutriments ?? {}
  const name = (p.product_name_de || p.product_name || p.generic_name_de || '').trim()
  const code = (p.code ?? '').trim()
  let kcal = toNum(n['energy-kcal_100g'])
  if (kcal == null) {
    const kj = toNum(n['energy-kj_100g']) ?? toNum(n['energy_100g'])
    if (kj != null) kcal = kj / 4.184
  }
  if (!name || !code || kcal == null) return null
  const unit: 'g' | 'ml' = /\bml\b|\bl\b|liter/i.test(`${p.serving_size ?? ''} ${p.quantity ?? ''}`) ? 'ml' : 'g'
  const portions: Portion[] = []
  const serving = toNum(p.serving_quantity)
  if (serving && serving > 0 && serving < 2000) portions.push({ label: 'Portion', g: serving })
  const pack = toNum(p.product_quantity)
  if (pack && pack > 0 && pack <= 2000 && pack !== serving) portions.push({ label: 'Packung', g: pack })
  return {
    id: `off:${code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode: code,
    unit,
    per100: {
      kcal: Math.round(kcal),
      protein: r1(toNum(n.proteins_100g) ?? 0),
      fat: r1(toNum(n.fat_100g) ?? 0),
      carbs: r1(toNum(n.carbohydrates_100g) ?? 0),
    },
    portions,
    source: 'off',
  }
}

async function getJson(url: string, ms = 12000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

export type LookupResult = { food: Food } | { notFound: true } | { incomplete: true; name?: string }

/** Sucht ein Produkt per Barcode. Wirft bei Netzwerkfehlern. */
export async function lookupBarcode(code: string): Promise<LookupResult> {
  const data = await getJson(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`)
  if (!data || data.status !== 1 || !data.product) return { notFound: true }
  const food = fromOff({ code, ...data.product })
  if (!food) return { incomplete: true, name: data.product.product_name_de || data.product.product_name }
  return { food }
}

/** Volltextsuche bei Open Food Facts, bevorzugt in Deutschland verkaufte Produkte. */
export async function searchOff(q: string): Promise<Food[]> {
  const url =
    `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=30&sort_by=unique_scans_n&fields=${OFF_FIELDS}`
  const data = await getJson(url, 15000)
  const out: Food[] = []
  const seen = new Set<string>()
  for (const p of (data?.products ?? []) as OffProduct[]) {
    const f = fromOff(p)
    if (f && !seen.has(f.id)) {
      seen.add(f.id)
      out.push(f)
    }
  }
  return out
}
