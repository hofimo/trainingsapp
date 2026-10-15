// Tägliche Erinnerungen per Web Push. Läuft in GitHub Actions (.github/workflows/reminders.yml).
//
//   node reminder.mjs decide  → schreibt "kind=morning|evening|" (für $GITHUB_OUTPUT)
//   node reminder.mjs send    → schickt die Erinnerung ans iPhone
//
// Der Text der Benachrichtigung entsteht erst auf dem Handy (public/sw.js), weil nur dort
// steht, was heute schon erledigt ist. Hier wird nur „morning“ oder „evening“ verschickt.

const TZ = 'Europe/Berlin'
// Uhrzeit in Deutschland, zu der der jeweilige Zeitplan gehört (Stunde)
const SLOTS = { morning: 7, evening: 17 }

/** Stunde in Berlin, wenn es in UTC `utcHour` Uhr ist (heute, also mit aktueller Sommer-/Winterzeit). */
function berlinHour(utcHour) {
  const d = new Date()
  d.setUTCHours(utcHour, 0, 0, 0)
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(d))
}

function decide() {
  const event = process.env.EVENT
  if (event === 'workflow_dispatch') return process.env.INPUT_KIND === 'evening' ? 'evening' : 'morning'
  // GitHub plant in UTC. Es gibt je zwei Zeitpläne (Sommer- und Winterzeit), gesendet wird nur
  // bei dem, der heute auf die deutsche Uhrzeit passt. Verspätet GitHub den Lauf, zählt trotzdem
  // die geplante Zeit, es kommt also immer genau eine Erinnerung.
  const schedule = process.env.SCHEDULE ?? ''
  const utcHour = Number(schedule.trim().split(/\s+/)[1])
  if (!Number.isInteger(utcHour)) return ''
  const h = berlinHour(utcHour)
  return Object.keys(SLOTS).find((k) => SLOTS[k] === h) ?? ''
}

async function send(kind) {
  const raw = process.env.PUSH_CONFIG
  if (!raw) {
    console.error('Das Geheimnis PUSH_CONFIG fehlt. In der App unter Einstellungen → Erinnerungen den Code kopieren und als Repository-Secret PUSH_CONFIG speichern.')
    process.exit(1)
  }
  let cfg
  try {
    cfg = JSON.parse(raw)
  } catch {
    console.error('PUSH_CONFIG ist kein gültiger Code. Bitte in der App neu kopieren und das Secret ersetzen.')
    process.exit(1)
  }
  const { default: webpush } = await import('web-push')
  webpush.setVapidDetails(process.env.SUBJECT || 'https://github.com/', cfg.publicKey, cfg.privateKey)
  try {
    const res = await webpush.sendNotification(cfg.subscription, JSON.stringify({ kind }), { TTL: 4 * 3600, urgency: 'high' })
    console.log(`Erinnerung „${kind}“ verschickt (Status ${res.statusCode}).`)
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410)
      console.error('Das iPhone nimmt keine Erinnerungen mehr an (Abo abgelaufen). In der App unter Einstellungen → Erinnerungen neu einrichten und PUSH_CONFIG ersetzen.')
    else console.error(`Senden fehlgeschlagen: ${e.statusCode ?? ''} ${e.body ?? e.message}`)
    process.exit(1)
  }
}

const cmd = process.argv[2]
if (cmd === 'decide') {
  const kind = decide()
  console.log(`kind=${kind}`)
  console.error(kind ? `Sende: ${kind}` : 'Dieser Zeitplan passt heute nicht zur deutschen Uhrzeit, nichts zu tun.')
} else if (cmd === 'send') {
  await send(process.env.KIND || 'morning')
} else {
  console.error('Aufruf: node reminder.mjs decide|send')
  process.exit(1)
}
