// Einfacher Service Worker: macht die App offline nutzbar.
// Seitenaufrufe: erst Netz, bei Fehler Cache. Dateien (JS, CSS, Bilder): erst Cache, sonst Netz.
const CACHE = 'training-v3'
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
