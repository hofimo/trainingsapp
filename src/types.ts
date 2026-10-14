export type Kind = 'dumbbell' | 'bodyweight' | 'band' | 'time'

export interface Exercise {
  id: string
  name: string
  kind: Kind
  /** Wiederholungen gelten pro Seite / pro Bein */
  perSide?: boolean
  /** Startgewicht pro Hand in kg, wenn noch keine Daten da sind */
  start?: number
  /** Kurzer Technik-Hinweis */
  cue?: string
  /** Was tun, wenn das schwerste Gewicht zu leicht wird */
  harder?: string
  custom?: boolean
}

export interface PlanItem {
  id: string
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  /** Übungen mit gleicher Gruppe werden als Supersatz gemacht */
  group?: string
}

export interface PlanDay {
  id: string
  name: string
  items: PlanItem[]
}

export interface Plan {
  days: PlanDay[]
}

export interface SetLog {
  reps: number | null
  weight: number | null
  done: boolean
}

export interface EntryLog {
  planItemId: string
  exerciseId: string
  sets: SetLog[]
  note?: string
}

export interface Session {
  id: string
  /** Startzeitpunkt als ISO-String */
  date: string
  dayId: string
  dayName: string
  entries: EntryLog[]
  note?: string
  finished: boolean
  finishedAt?: string
}

export interface BodyWeight {
  /** YYYY-MM-DD */
  date: string
  kg: number
}

export interface Settings {
  /** Verfügbare Kurzhantelgewichte pro Hand in kg */
  weights: number[]
}

export interface Backup {
  app: 'trainingsapp'
  version: 1
  exportedAt: string
  plan: Plan
  settings: Settings
  customExercises: Exercise[]
  sessions: Session[]
  bodyWeights: BodyWeight[]
}
