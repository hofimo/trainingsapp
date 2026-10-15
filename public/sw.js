// Service Worker: macht die App offline nutzbar und zeigt die täglichen Erinnerungen.
// Seitenaufrufe: erst Netz, bei Fehler Cache. Dateien (JS, CSS, Bilder): erst Cache, sonst Netz.
const CACHE = 'training-v7'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './apple-touch-icon.png']

// Übungsbilder vorab laden, damit „Technik“ auch offline funktioniert
const IMAGES = [
  './exercises/band_curl-0.jpg',
  './exercises/band_curl-1.jpg',
  './exercises/band_pull_apart-0.jpg',
  './exercises/band_pull_apart-1.jpg',
  './exercises/band_pushdown-0.jpg',
  './exercises/band_pushdown-1.jpg',
  './exercises/bench_dip-0.jpg',
  './exercises/bench_dip-1.jpg',
  './exercises/calf_raise-0.jpg',
  './exercises/calf_raise-1.jpg',
  './exercises/chinup-0.jpg',
  './exercises/chinup-1.jpg',
  './exercises/close_pushup-0.jpg',
  './exercises/close_pushup-1.jpg',
  './exercises/concentration_curl-0.jpg',
  './exercises/concentration_curl-1.jpg',
  './exercises/curl-0.jpg',
  './exercises/curl-1.jpg',
  './exercises/db_bench-0.jpg',
  './exercises/db_bench-1.jpg',
  './exercises/db_fly-0.jpg',
  './exercises/db_fly-1.jpg',
  './exercises/dead_bug-0.jpg',
  './exercises/dead_bug-1.jpg',
  './exercises/face_pull-0.jpg',
  './exercises/face_pull-1.jpg',
  './exercises/french_press-0.jpg',
  './exercises/french_press-1.jpg',
  './exercises/goblet_squat-0.jpg',
  './exercises/goblet_squat-1.jpg',
  './exercises/hammer_curl-0.jpg',
  './exercises/hammer_curl-1.jpg',
  './exercises/hip_thrust-0.jpg',
  './exercises/hip_thrust-1.jpg',
  './exercises/incline_curl-0.jpg',
  './exercises/incline_curl-1.jpg',
  './exercises/incline_press-0.jpg',
  './exercises/incline_press-1.jpg',
  './exercises/kickback-0.jpg',
  './exercises/kickback-1.jpg',
  './exercises/lateral_raise-0.jpg',
  './exercises/lateral_raise-1.jpg',
  './exercises/overhead_ext-0.jpg',
  './exercises/overhead_ext-1.jpg',
  './exercises/plank-0.jpg',
  './exercises/plank-1.jpg',
  './exercises/pullup-0.jpg',
  './exercises/pullup-1.jpg',
  './exercises/pushup-0.jpg',
  './exercises/pushup-1.jpg',
  './exercises/rdl-0.jpg',
  './exercises/rdl-1.jpg',
  './exercises/reverse_fly-0.jpg',
  './exercises/reverse_fly-1.jpg',
  './exercises/reverse_lunge-0.jpg',
  './exercises/reverse_lunge-1.jpg',
  './exercises/row-0.jpg',
  './exercises/row-1.jpg',
  './exercises/shoulder_press-0.jpg',
  './exercises/shoulder_press-1.jpg',
  './exercises/side_plank-0.jpg',
  './exercises/side_plank-1.jpg',
  './exercises/split_squat-0.jpg',
  './exercises/split_squat-1.jpg',
  './exercises/step_up-0.jpg',
  './exercises/step_up-1.jpg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).then(() => c.addAll(IMAGES).catch(() => {}))))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

// ---------- Erinnerungen (Web Push) ----------
// Der Push enthält nur { kind: 'morning' | 'evening' }. Den Text bauen wir hier aus den Daten
// auf dem Handy, damit er sagt, was heute wirklich noch fehlt.

function readAll() {
  return new Promise((resolve) => {
    const req = indexedDB.open('trainingsapp')
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      const db = req.result
      const want = ['kv', 'bodyWeights', 'supplementLog', 'sessions'].filter((n) => db.objectStoreNames.contains(n))
      if (want.length < 4) return resolve(null)
      const tx = db.transaction(want, 'readonly')
      const out = {}
      const get = (key, fn) => {
        const r = fn()
        r.onsuccess = () => (out[key] = r.result)
      }
      const today = localDate(new Date())
      get('settings', () => tx.objectStore('kv').get('settings'))
      get('supplements', () => tx.objectStore('kv').get('supplements'))
      get('weight', () => tx.objectStore('bodyWeights').get(today))
      get('log', () => tx.objectStore('supplementLog').get(today))
      get('sessions', () => tx.objectStore('sessions').getAll())
      tx.oncomplete = () => resolve(out)
      tx.onerror = () => resolve(null)
    }
  })
}

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shortName = (n) => n.replace(/\s*\(.*?\)\s*/g, ' ').trim()
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}`)

async function buildReminder(kind) {
  const d = (await readAll()) || {}
  const name = d.settings?.name?.trim()
  const supps = d.supplements || []
  const taken = d.log?.taken || []
  const hasWeight = !!d.weight
  const open = (times) => supps.filter((s) => times.includes(s.time) && !taken.includes(s.id)).map((s) => shortName(s.name))

  if (kind === 'morning') {
    const pills = open(['morning'])
    const parts = []
    if (!hasWeight) parts.push('Ab auf die Waage und Gewicht eintragen.')
    if (pills.length) parts.push(`${hasWeight ? '' : 'Danach '}${list(pills)} nehmen.`)
    return {
      title: `Guten Morgen${name ? ', ' + name : ''} ☀️`,
      body: parts.join(' ') || 'Gewicht und Morgen-Supplements sind schon erledigt. Stark!',
      tab: hasWeight ? 'today' : 'body',
    }
  }

  const pills = open(['morning', 'noon', 'evening'])
  const today = new Date().toDateString()
  const trained = (d.sessions || []).some((s) => s.finished && new Date(s.date).toDateString() === today)
  const todo = []
  if (pills.length) todo.push(`Noch offen: ${list(pills)}`)
  if (!hasWeight) todo.push('Gewicht von heute fehlt')
  if (!todo.length)
    return {
      title: 'Alles erledigt heute ✅',
      body: `Supplements komplett, Gewicht eingetragen${trained ? ', Training gemacht' : ''}. Gut gemacht${name ? ', ' + name : ''}!`,
      tab: 'today',
    }
  return {
    title: `Abend-Check${name ? ', ' + name : ''}`,
    body: `${todo.join('. ')}.${trained ? ' Training heute ✓' : ''}`,
    tab: hasWeight ? 'today' : 'body',
  }
}

async function showReminder(kind) {
  let r
  try {
    r = await buildReminder(kind)
  } catch {
    r = kind === 'morning'
      ? { title: 'Guten Morgen ☀️', body: 'Gewicht eintragen und Morgen-Supplements nehmen.', tab: 'body' }
      : { title: 'Abend-Check', body: 'Alle Supplements genommen? Schau kurz in die App.', tab: 'today' }
  }
  return self.registration.showNotification(r.title, {
    body: r.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'reminder-' + kind,
    data: { tab: r.tab },
  })
}

self.addEventListener('push', (event) => {
  let kind = 'morning'
  try {
    kind = event.data?.json().kind === 'evening' ? 'evening' : 'morning'
  } catch {
    // leerer oder unbekannter Push: Morgen-Erinnerung
  }
  event.waitUntil(showReminder(kind))
})

// Vorschau aus den Einstellungen
self.addEventListener('message', (event) => {
  if (event.data?.type === 'preview') event.waitUntil(showReminder(event.data.kind))
})

// Tippen auf die Benachrichtigung öffnet die App im passenden Bereich
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const tab = event.notification.data?.tab || 'today'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const c = list[0]
      if (c) {
        c.postMessage({ type: 'open-tab', tab })
        return c.focus()
      }
      return self.clients.openWindow('./#' + tab)
    }),
  )
})
