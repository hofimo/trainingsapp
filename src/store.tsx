import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from './db'
import { EXERCISES, defaultPlan, defaultSettings, defaultSupplements } from './defaults'
import type { Backup, BodyWeight, Exercise, Plan, Session, Settings, Supplement, SupplementLog } from './types'

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
  exportBackup: () => Backup
  importBackup: (b: Backup) => Promise<void>
  resetAll: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [plan, setPlan] = useState<Plan>(defaultPlan)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [custom, setCustom] = useState<Exercise[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [bodyWeights, setBodyWeights] = useState<BodyWeight[]>([])
  const [supplements, setSupplements] = useState<Supplement[]>(defaultSupplements)
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([])

  const load = useCallback(async () => {
    const [p, s, c, ss, bw, sup, sl] = await Promise.all([
      db.kvGet<Plan>('plan'),
      db.kvGet<Settings>('settings'),
      db.kvGet<Exercise[]>('customExercises'),
      db.getSessions(),
      db.getBodyWeights(),
      db.kvGet<Supplement[]>('supplements'),
      db.getSupplementLogs(),
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
    setReady(true)
  }, [])

  useEffect(() => {
    load()
    db.requestPersistence()
  }, [load])

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
