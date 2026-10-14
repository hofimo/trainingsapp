import type { Exercise, Plan, PlanItem, Settings } from './types'

export const EXERCISES: Exercise[] = [
  // Beine & Po
  { id: 'goblet_squat', name: 'Goblet Squat', kind: 'dumbbell', start: 12.5, cue: 'Hantel vor der Brust, Brust raus, tief in die Hocke, Knie folgen den Zehen.', harder: 'Langsam ablassen (3 s), Pause unten, oder auf Bulgarian Split Squat wechseln.' },
  { id: 'split_squat', name: 'Bulgarian Split Squat', kind: 'dumbbell', perSide: true, start: 7.5, cue: 'Hinterer Fuß auf der Bank, Oberkörper leicht vor, vorderes Knie stabil.', harder: 'Langsam ablassen, Pause unten, 1,5er-Wiederholungen.' },
  { id: 'reverse_lunge', name: 'Ausfallschritte rückwärts', kind: 'dumbbell', perSide: true, start: 7.5, cue: 'Großer Schritt nach hinten, hinteres Knie fast zum Boden.', harder: 'Langsam ablassen oder auf Bulgarian Split Squat wechseln.' },
  { id: 'hip_thrust', name: 'Hip Thrust auf der Bank', kind: 'dumbbell', start: 12.5, cue: 'Schultern auf der Bank, Hantel auf der Hüfte, oben Po fest anspannen, kein Hohlkreuz.', harder: 'Einbeinig ausführen oder 2 s oben halten.' },
  { id: 'rdl', name: 'Rumänisches Kreuzheben', kind: 'dumbbell', start: 10, cue: 'Rücken gerade, Hüfte nach hinten schieben, nur so tief wie der Rücken gerade bleibt. Bei Rückenschmerz weglassen.', harder: 'Einbeinig ausführen.' },
  { id: 'step_up', name: 'Step-ups auf die Bank', kind: 'dumbbell', perSide: true, start: 7.5, cue: 'Ganzen Fuß auf die Bank, mit dem oberen Bein hochdrücken.' },
  { id: 'calf_raise', name: 'Wadenheben', kind: 'dumbbell', start: 12.5, cue: 'Volle Bewegung, oben kurz halten.' },
  // Brust
  { id: 'db_bench', name: 'Kurzhantel-Bankdrücken', kind: 'dumbbell', start: 12.5, cue: 'Schulterblätter zusammen, Ellbogen ca. 45° vom Körper.', harder: 'Langsam ablassen (3 s), Pause unten, mehr Wiederholungen.' },
  { id: 'incline_press', name: 'Schrägbankdrücken Kurzhantel', kind: 'dumbbell', start: 10, cue: 'Bank auf ca. 30°, kontrolliert ablassen.', harder: 'Langsam ablassen, Pause unten.' },
  { id: 'pushup', name: 'Liegestütze', kind: 'bodyweight', cue: 'Körper gerade wie ein Brett.' },
  { id: 'close_pushup', name: 'Enge Liegestütze', kind: 'bodyweight', cue: 'Hände schulterbreit oder enger, Ellbogen eng am Körper. Zu schwer? Hände auf die Bank.' },
  { id: 'db_fly', name: 'Kurzhantel-Fliegende', kind: 'dumbbell', start: 7.5, cue: 'Leicht gebeugte Arme, Dehnung spüren.' },
  // Rücken
  { id: 'pullup', name: 'Klimmzüge', kind: 'bodyweight', cue: 'Obergriff, ganz runter, Brust zur Stange. Bei Bedarf Band als Hilfe.', harder: 'Zusatzgewicht (Hantel zwischen den Füßen) oder langsam ablassen.' },
  { id: 'chinup', name: 'Chin-ups (Untergriff)', kind: 'bodyweight', cue: 'Untergriff schulterbreit, trainiert den Bizeps mit.', harder: 'Zusatzgewicht oder langsam ablassen.' },
  { id: 'row', name: 'Einarmiges Kurzhantel-Rudern', kind: 'dumbbell', perSide: true, start: 12.5, cue: 'Hand und Knie auf der Bank, Ellbogen zur Hüfte ziehen.', harder: 'Oben 2 s halten, langsam ablassen.' },
  { id: 'face_pull', name: 'Face Pulls mit Band', kind: 'band', cue: 'Band auf Kopfhöhe, zum Gesicht ziehen, Ellbogen hoch.' },
  { id: 'band_pull_apart', name: 'Band Pull-Aparts', kind: 'band', cue: 'Arme gestreckt, Band vor der Brust auseinanderziehen.' },
  { id: 'reverse_fly', name: 'Reverse Flys', kind: 'dumbbell', start: 5, cue: 'Brust auf schräger Bank, Arme seitlich heben.' },
  // Schultern
  { id: 'shoulder_press', name: 'Schulterdrücken sitzend', kind: 'dumbbell', start: 10, cue: 'Bank aufrecht, kein Hohlkreuz, Bauch fest.', harder: 'Langsam ablassen, Pause unten.' },
  { id: 'lateral_raise', name: 'Seitheben', kind: 'dumbbell', start: 5, cue: 'Leicht gebeugte Arme, bis Schulterhöhe, ohne Schwung.', harder: 'Langsamer, oben 1 s halten, Teilwiederholungen am Ende.' },
  // Bizeps
  { id: 'curl', name: 'Bizeps-Curls stehend', kind: 'dumbbell', start: 10, cue: 'Ellbogen am Körper, unten ganz strecken, ohne Schwung.', harder: 'Langsam ablassen (3 s), oben anspannen.' },
  { id: 'hammer_curl', name: 'Hammer-Curls', kind: 'dumbbell', start: 10, cue: 'Daumen zeigt nach oben, Ellbogen bleiben ruhig.', harder: 'Langsam ablassen.' },
  { id: 'incline_curl', name: 'Schrägbank-Curls', kind: 'dumbbell', start: 7.5, cue: 'Bank ca. 45°, Arme hängen nach hinten, starke Dehnung.', harder: 'Langsam ablassen, oben 1 s halten.' },
  { id: 'concentration_curl', name: 'Konzentrations-Curls', kind: 'dumbbell', perSide: true, start: 7.5, cue: 'Ellbogen am Oberschenkel abstützen.' },
  { id: 'band_curl', name: 'Bizeps-Curls mit Band', kind: 'band', cue: 'Auf dem Band stehen, bis zum Brennen.' },
  // Trizeps
  { id: 'french_press', name: 'French Press liegend', kind: 'dumbbell', start: 7.5, cue: 'Auf der Bank liegend, Oberarme bleiben senkrecht, Hanteln neben den Kopf.', harder: 'Langsam ablassen, Pause unten.' },
  { id: 'kickback', name: 'Trizeps-Kickbacks', kind: 'dumbbell', start: 5, cue: 'Oberarm parallel zum Boden, nur Unterarm bewegen, oben strecken.', harder: 'Oben 1 s halten.' },
  { id: 'overhead_ext', name: 'Trizeps über Kopf (eine Hantel)', kind: 'dumbbell', start: 12.5, cue: 'Hantel mit beiden Händen hinter dem Kopf, Ellbogen zeigen nach vorne.', harder: 'Langsam ablassen, einarmig mit zwei Hanteln.' },
  { id: 'band_pushdown', name: 'Trizeps-Pushdown mit Band', kind: 'band', cue: 'Band an der Klimmzugstange, Ellbogen am Körper, unten ganz strecken.' },
  { id: 'bench_dip', name: 'Dips an der Bank', kind: 'bodyweight', cue: 'Schultern tief halten, nur so weit runter wie es angenehm ist.' },
  // Rumpf
  { id: 'dead_bug', name: 'Dead Bug', kind: 'bodyweight', perSide: true, cue: 'Unterer Rücken bleibt am Boden, langsam.' },
  { id: 'bird_dog', name: 'Bird Dog', kind: 'bodyweight', perSide: true, cue: 'Gegengleich Arm und Bein strecken, 2 s halten, Rücken ruhig.' },
  { id: 'side_plank', name: 'Seitstütz', kind: 'time', perSide: true, cue: 'Körper in einer Linie, Hüfte hoch.', harder: 'Oberes Bein anheben.' },
  { id: 'plank', name: 'Unterarmstütz', kind: 'time', cue: 'Po anspannen, kein Hohlkreuz.' },
]

let n = 0
const item = (exerciseId: string, sets: number, repMin: number, repMax: number, group?: string): PlanItem => ({
  id: `p${++n}`,
  exerciseId,
  sets,
  repMin,
  repMax,
  group,
})

export function defaultPlan(): Plan {
  n = 0
  return {
    days: [
      {
        id: 'A',
        name: 'Tag A',
        items: [
          item('goblet_squat', 3, 10, 15),
          item('db_bench', 3, 8, 12),
          item('pullup', 3, 5, 10),
          item('hip_thrust', 3, 12, 15),
          item('lateral_raise', 3, 12, 15),
          item('curl', 3, 10, 12, 'S1'),
          item('french_press', 3, 10, 12, 'S1'),
          item('dead_bug', 3, 8, 8),
        ],
      },
      {
        id: 'B',
        name: 'Tag B',
        items: [
          item('split_squat', 3, 8, 12),
          item('incline_press', 3, 8, 12),
          item('row', 3, 10, 12),
          item('rdl', 3, 12, 15),
          item('face_pull', 3, 15, 20),
          item('hammer_curl', 3, 10, 12, 'S1'),
          item('kickback', 3, 10, 12, 'S1'),
          item('bird_dog', 3, 8, 8),
        ],
      },
      {
        id: 'C',
        name: 'Tag C',
        items: [
          item('reverse_lunge', 3, 10, 12),
          item('shoulder_press', 3, 8, 12),
          item('chinup', 3, 5, 10),
          item('close_pushup', 3, 8, 20),
          item('lateral_raise', 3, 12, 15, 'S1'),
          item('face_pull', 3, 12, 15, 'S1'),
          item('incline_curl', 3, 10, 12, 'S2'),
          item('overhead_ext', 3, 10, 12, 'S2'),
          item('band_curl', 2, 15, 20, 'S3'),
          item('band_pushdown', 2, 15, 20, 'S3'),
          item('side_plank', 3, 20, 40),
        ],
      },
    ],
  }
}

export const defaultSettings = (): Settings => ({ weights: [2.5, 5, 7.5, 10, 12.5] })
