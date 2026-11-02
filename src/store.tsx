import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from './db'
import { EXERCISES, defaultPlan, defaultSettings, defaultSupplements } from './defaults'
import { BASE_FOODS } from './foods'
import type { Backup, BodyWeight, Exercise, Food, FoodEntry, NutritionDay, Plan, Session, Settings, Supplement, SupplementLog } from './types'

interface Store {
  ready: boolean
  plan: Plan
  settings: Settings
  sessions: Session[]
  bodyWeights: BodyWeight[]
  exercises: Exercise[]
  supplements: Supplement[]
  supplementLogs: SupplementLog[]
  saveSupplements: (s: Supplement[]) => void
  toggleSupplement: (date: string, id: string) => void
  exById: (id: string) => Exercise
  savePlan: (p: Plan) => void
  saveSettings: (s: Settings) => void
  addCustomExercise: (e: Exercise) => void
  saveSession: (s: Session) => void
  removeSession: (id: string) => void
  saveBodyWeight: (b: BodyWeight) => void
  removeBodyWeight: (date: string) => void
  /** Tagessummen aus dem Ernährungstagebuch (für Auswertungen) */
  nutrition: NutritionDay[]
  /** Alle Lebensmittel: eingebaute, gespeicherte aus Open Food Facts und eigene */
  foods: Food[]
  foodById: (id: string) => Food | undefined
  /** Speichert ein Lebensmittel (eigenes oder aus Open Food Facts) lokal */
  saveFood: (f: Food) => void
  removeFood: (id: string) => void
  foodLog: FoodEntry[]
  /** Fügt Einträge hinzu oder ersetzt solche mit gleicher id */
  saveFoodEntries: (e: FoodEntry[]) => void
  removeFoodEntry: (id: string) => void
  foodFavs: string[]
  toggleFoodFav: (id: string) => void
  exportBackup: () => Backup
  importBackup: (b: Backup) => Promise<void>
  resetAll: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const dayToEntry = (d: NutritionDay): FoodEntry => ({
  id: `day-${d.date}`,
  date: d.date,
  meal: 'snack',
  name: 'Tageswerte (übernommen)',
  amount: 0,
  unit: 'g',
  kcal: d.kcal,
  protein: d.protein,
  fat: d.fat,
  carbs: d.carbs,
  at: `${d.date}T20:00:00`,
})

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [plan, setPlan] = useState<Plan>(defaultPlan)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [custom, setCustom] = useState<Exercise[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [bodyWeights, setBodyWeights] = useState<BodyWeight[]>([])
  const [supplements, setSupplements] = useState<Supplement[]>(defaultSupplements)
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([])
  const [savedFoods, setSavedFoods] = useState<Food[]>([])
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])
  const [foodFavs, setFoodFavs] = useState<string[]>([])

  const load = useCallback(async () => {
    const [p, s, c, ss, bw, sup, sl, nu, fd, fl, ff] = await Promise.all([
      db.kvGet<Plan>('plan'),
      db.kvGet<Settings>('settings'),
      db.kvGet<Exercise[]>('customExercises'),
      db.getSessions(),
      db.getBodyWeights(),
      db.kvGet<Supplement[]>('supplements'),
      db.getSupplementLogs(),
      db.kvGet<NutritionDay[]>('nutrition'),
      db.kvGet<Food[]>('foods'),
      db.kvGet<FoodEntry[]>('foodLog'),
      db.kvGet<string[]>('foodFavs'),
    ])
    setPlan(p ?? defaultPlan())
    setSettings(s ?? defaultSettings())
    setCustom(c ?? [])
    setSessions(ss.sort((a, b) => b.date.localeCompare(a.date)))
    setBodyWeights(bw.sort((a, b) => a.date.localeCompare(b.date)))
    setSupplements(sup ?? defaultSupplements())
    // Einmal speichern, damit auch der Service Worker (Erinnerungen) die Liste lesen kann
    if (!sup) db.kvSet('supplements', defaultSupplements())
    setSupplementLogs(sl)
    let log = fl ?? []
    // Alte Tageswerte (Import aus Apple Health) einmalig ins Tagebuch übernehmen
    if (nu?.length) {
      log = [...log, ...nu.map(dayToEntry)]
      await db.kvSet('foodLog', log)
      await db.kvSet('nutrition', [])
    }
    setFoodLog(log)
    setSavedFoods(fd ?? [])
    setFoodFavs(ff ?? [])
    setReady(true)
  }, [])

  useEffect(() => {
    load()
    db.requestPersistence()
  }, [load])

  const foods = useMemo(() => [...savedFoods, ...BASE_FOODS], [savedFoods])
  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const nutrition = useMemo(() => {
    const m = new Map<string, NutritionDay>()
    for (const e of foodLog) {
      const d = m.get(e.date) ?? { date: e.date, kcal: 0, protein: 0, fat: 0, carbs: 0 }
      d.kcal += e.kcal
      d.protein += e.protein
      d.fat += e.fat
      d.carbs += e.carbs
      m.set(e.date, d)
    }
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [foodLog])

  const exercises = useMemo(() => [...EXERCISES, ...custom], [custom])
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const exById = useCallback(
    (id: string): Exercise => exMap.get(id) ?? { id, name: 'Unbekannte Übung', kind: 'dumbbell' },
    [exMap],
  )

  const value: Store = {
    ready,
    plan,
    settings,
    sessions,
    bodyWeights,
    exercises,
    exById,
    supplements,
    supplementLogs,
    saveSupplements: (list) => {
      setSupplements(list)
      db.kvSet('supplements', list)
    },
    toggleSupplement: (date, id) => {
      const cur = supplementLogs.find((l) => l.date === date) ?? { date, taken: [] }
      const next = { date, taken: cur.taken.includes(id) ? cur.taken.filter((x) => x !== id) : [...cur.taken, id] }
      setSupplementLogs((prev) => [...prev.filter((l) => l.date !== date), next])
      db.putSupplementLog(next)
    },
    savePlan: (p) => {
      setPlan(p)
      db.kvSet('plan', p)
    },
    saveSettings: (s) => {
      setSettings(s)
      db.kvSet('settings', s)
    },
    addCustomExercise: (e) => {
      const next = [...custom, e]
      setCustom(next)
      db.kvSet('customExercises', next)
    },
    saveSession: (s) => {
      setSessions((prev) => [s, ...prev.filter((x) => x.id !== s.id)].sort((a, b) => b.date.localeCompare(a.date)))
      db.putSession(s)
    },
    removeSession: (id) => {
      setSessions((prev) => prev.filter((x) => x.id !== id))
      db.deleteSession(id)
    },
    saveBodyWeight: (b) => {
      setBodyWeights((prev) => [...prev.filter((x) => x.date !== b.date), b].sort((a, c) => a.date.localeCompare(c.date)))
      db.putBodyWeight(b)
    },
    removeBodyWeight: (date) => {
      setBodyWeights((prev) => prev.filter((x) => x.date !== date))
      db.deleteBodyWeight(date)
    },
    nutrition,
    foods,
    foodById: (id) => foodMap.get(id),
    saveFood: (f) => {
      const next = [f, ...savedFoods.filter((x) => x.id !== f.id)]
      setSavedFoods(next)
      db.kvSet('foods', next)
    },
    removeFood: (id) => {
      const next = savedFoods.filter((x) => x.id !== id)
      setSavedFoods(next)
      db.kvSet('foods', next)
    },
    foodLog,
    saveFoodEntries: (list) => {
      const ids = new Set(list.map((e) => e.id))
      const next = [...foodLog.filter((e) => !ids.has(e.id)), ...list]
      setFoodLog(next)
      db.kvSet('foodLog', next)
    },
    removeFoodEntry: (id) => {
      const next = foodLog.filter((e) => e.id !== id)
      setFoodLog(next)
      db.kvSet('foodLog', next)
    },
    foodFavs,
    toggleFoodFav: (id) => {
      const next = foodFavs.includes(id) ? foodFavs.filter((x) => x !== id) : [id, ...foodFavs]
      setFoodFavs(next)
      db.kvSet('foodFavs', next)
    },
    exportBackup: () => ({
      app: 'trainingsapp',
      version: 1,
      exportedAt: new Date().toISOString(),
      plan,
      settings,
      customExercises: custom,
      sessions,
      bodyWeights,
      supplements,
      supplementLogs,
      foods: savedFoods,
      foodLog,
      foodFavs,
    }),
    importBackup: async (b) => {
      if (b?.app !== 'trainingsapp' || !b.plan || !Array.isArray(b.sessions)) throw new Error('Keine gültige Backup-Datei')
      await db.clearAll()
      await db.kvSet('plan', b.plan)
      await db.kvSet('settings', b.settings ?? defaultSettings())
      await db.kvSet('customExercises', b.customExercises ?? [])
      for (const s of b.sessions) await db.putSession(s)
      for (const w of b.bodyWeights ?? []) await db.putBodyWeight(w)
      if (b.supplements) await db.kvSet('supplements', b.supplements)
      for (const l of b.supplementLogs ?? []) await db.putSupplementLog(l)
      if (b.nutrition) await db.kvSet('nutrition', b.nutrition)
      if (b.foods) await db.kvSet('foods', b.foods)
      if (b.foodLog) await db.kvSet('foodLog', b.foodLog)
      if (b.foodFavs) await db.kvSet('foodFavs', b.foodFavs)
      await load()
    },
    resetAll: async () => {
      await db.clearAll()
      await load()
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider fehlt')
  return s
}
