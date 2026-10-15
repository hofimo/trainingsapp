import { speak } from './sound'
import type { Session, Settings } from './types'
import { fmtNum, weekStart } from './util'

export interface Ctx {
  /** „, Timo“ oder leer, für Sätze wie „Super gemacht{n}!“ */
  n: string
  /** Name oder „du“-loses Ersatzwort */
  name: string
  day: string
  sets: number
  mins: number | null
  kg: number
  /** Trainings in dieser Woche inklusive diesem */
  week: number
  /** Trainings insgesamt inklusive diesem */
  total: number
}

type Msg = (c: Ctx) => string

const START: Msg[] = [
  (c) => `Workout gestartet! Los geht’s${c.n}, ${c.day} wartet auf dich.`,
  (c) => `Workout gestartet. Auf geht’s${c.n}, jeder Satz zählt!`,
  (c) => `${c.day} läuft${c.n}. Konzentrier dich auf saubere Wiederholungen.`,
  (c) => `Workout gestartet! Heute holen wir uns die Arme${c.n}.`,
  (c) => `Schön, dass du da bist${c.n}. Training Nummer ${c.total} beginnt jetzt!`,
  (c) => `Workout gestartet. Handy weg vom Kopf, Hanteln in die Hand${c.n}!`,
  (c) => `Los${c.n}! Der schwerste Teil, nämlich anzufangen, ist schon geschafft.`,
  (c) => `${c.day} gestartet. Ruhig atmen, Bauch fest, und los${c.n}!`,
  (c) => `Workout gestartet! Heute wirst du ein bisschen stärker als beim letzten Mal${c.n}.`,
  (c) => `Zeit für ${c.day}${c.n}. Dein zukünftiges Ich sagt jetzt schon danke.`,
  (c) => `Workout gestartet. Eine Wiederholung nach der anderen${c.n}.`,
  (c) => (c.week === 1 ? `Erstes Training der Woche${c.n}. Starker Start, los geht’s!` : `Training ${c.week} diese Woche${c.n}. Bleib dran, los geht’s!`),
]

const PRAISE: Msg[] = [
  (c) => `Super gemacht heute${c.n}! 💪`,
  (c) => `Stark${c.n}! ${c.sets} Sätze sind im Kasten.`,
  (c) => `Klasse Training${c.n}. Deine Arme werden es dir danken.`,
  (c) => `Das war richtig gut${c.n}! ${fmtNum(c.kg, 0)} kg hast du heute bewegt.`,
  (c) => `Geschafft${c.n}! Jedes Training bringt dich deinem Ziel näher.`,
  (c) => `Respekt${c.n}. Du hast heute nicht abgesagt, sondern abgeliefert.`,
  (c) => `Top${c.n}! Training Nummer ${c.total} ist erledigt.`,
  (c) => (c.mins ? `${c.mins} Minuten voller Einsatz${c.n}. Gönn dir jetzt Eiweiß und Wasser!` : `Voller Einsatz${c.n}! Gönn dir jetzt Eiweiß und Wasser.`),
  (c) => (c.week >= 3 ? `Wochenziel erreicht${c.n}! ${c.week} Trainings diese Woche. 🎉` : `Training ${c.week} von 3 diese Woche${c.n}. Weiter so!`),
  (c) => `Sauber durchgezogen${c.n}. Konstanz schlägt Motivation, und du hast beides.`,
  (c) => `Bärenstark${c.n}! Muskeln wachsen jetzt in der Erholung, also gut schlafen heute.`,
  (c) => `Wieder ein Baustein mehr${c.n}. So entstehen dicke Arme.`,
  (c) => `Mega${c.n}! Dranbleiben zahlt sich aus, und du bleibst dran.`,
  (c) => `Das sitzt${c.n}! Disziplin ist, was du tust, wenn keiner zuschaut.`,
  (c) => `Ehrenrunde für dich${c.n}! ${c.sets} Sätze, kein einziger geschenkt.`,
  (c) => `Feierabend für die Muskeln${c.n}. Du hast heute alles gegeben.`,
  (c) => `Starke Leistung${c.n}. Jetzt dehnen, durchatmen und stolz sein.`,
  (c) => `Saubere Arbeit${c.n}! Dein Rücken freut sich über jede gute Wiederholung.`,
  (c) => `Wow${c.n}! Wer so trainiert, sieht die Ergebnisse bald im Spiegel.`,
  (c) => `Gut gemacht${c.n}. Kleine Schritte, großer Fortschritt.`,
]

/** Zufällige Nachricht, die in den letzten Malen nicht dran war. */
function pick(list: Msg[], recent: number[]) {
  const avoid = new Set(recent.slice(0, Math.min(recent.length, list.length - 1)))
  const pool = list.map((_, i) => i).filter((i) => !avoid.has(i))
  return pool[Math.floor(Math.random() * pool.length)]
}

function ctxFor(session: Session, sessions: Session[], settings: Settings, kgOf: (s: Session) => number): Ctx {
  const name = settings.name?.trim() ?? ''
  const others = sessions.filter((s) => s.finished && s.id !== session.id)
  const sets = session.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)
  const end = session.finishedAt ? new Date(session.finishedAt).getTime() : Date.now()
  const mins = Math.round((end - new Date(session.date).getTime()) / 60000)
  return {
    n: name ? `, ${name}` : '',
    name,
    day: session.dayName,
    sets,
    mins: mins > 0 && mins < 300 ? mins : null,
    kg: kgOf(session),
    week: others.filter((s) => weekStart(s.date) === weekStart(session.date)).length + 1,
    total: others.length + 1,
  }
}

const RECENT_START = 'recentStart'

export function startMessage(session: Session, sessions: Session[], settings: Settings) {
  let recent: number[] = []
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_START) ?? '[]')
  } catch {
    // egal, dann ohne Gedächtnis
  }
  const i = pick(START, recent)
  try {
    localStorage.setItem(RECENT_START, JSON.stringify([i, ...recent].slice(0, 6)))
  } catch {
    // s. o.
  }
  return START[i](ctxFor(session, sessions, settings, () => 0))
}

/** Lob fürs Ende: merkt sich über die Trainings, welche Sprüche zuletzt kamen. */
export function pickPraise(session: Session, sessions: Session[], settings: Settings, kgOf: (s: Session) => number) {
  const recent = sessions.filter((s) => s.praiseId != null && s.id !== session.id).map((s) => s.praiseId as number)
  const i = pick(PRAISE, recent.slice(0, 8))
  return { praiseId: i, praise: PRAISE[i](ctxFor(session, sessions, settings, kgOf)) }
}

/** Vorlesen, wenn in den Einstellungen nicht abgeschaltet. */
export const sayIt = (settings: Settings, text: string) => settings.voice !== false && speak(text)
