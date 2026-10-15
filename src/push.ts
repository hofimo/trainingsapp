// Erinnerungen per Web Push. Auf dem iPhone kann eine Web-App keine Uhrzeit selbst planen,
// deshalb schickt ein geplanter GitHub-Actions-Lauf (.github/workflows/reminders.yml) morgens und
// abends einen Push. Den Text baut der Service Worker (public/sw.js) aus den Daten auf dem Handy.
//
// Die Schlüssel entstehen hier auf dem Gerät. Zusammen mit dem Abo ergeben sie einen „Code“,
// den Timo einmal als GitHub-Secret PUSH_CONFIG hinterlegt. Sonst verlässt nichts das Handy.
import { kvGet, kvSet } from './db'

interface PushKeys {
  /** Öffentlicher Schlüssel (P-256, unkomprimiert), base64url */
  publicKey: string
  /** Privater Schlüssel (d), base64url */
  privateKey: string
}

const b64u = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

function fromB64u(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function makeKeys(): Promise<PushKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const pub = await crypto.subtle.exportKey('raw', pair.publicKey)
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  return { publicKey: b64u(pub), privateKey: jwk.d! }
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** Läuft die App vom Home-Bildschirm? Nur dann gibt es auf dem iPhone Benachrichtigungen. */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

const codeOf = (sub: PushSubscription, keys: PushKeys) => JSON.stringify({ subscription: sub.toJSON(), ...keys })

/** Code für das GitHub-Secret, wenn Erinnerungen schon eingerichtet sind. */
export async function currentPushCode(): Promise<string | null> {
  if (!pushSupported() || Notification.permission !== 'granted') return null
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  const keys = await kvGet<PushKeys>('pushKeys')
  return sub && keys ? codeOf(sub, keys) : null
}

/** Fragt nach der Erlaubnis, meldet das Gerät an und gibt den Code für GitHub zurück. */
export async function enablePush(): Promise<string> {
  // Muss direkt im Tipp auf den Knopf passieren, sonst fragt iOS nicht
  const perm = await Notification.requestPermission()
  if (perm !== 'granted')
    throw new Error('Benachrichtigungen sind nicht erlaubt. Ändern kannst du das in den iPhone-Einstellungen unter Mitteilungen → Training.')
  const reg = await navigator.serviceWorker.ready
  let keys = await kvGet<PushKeys>('pushKeys')
  if (!keys) {
    keys = await makeKeys()
    await kvSet('pushKeys', keys)
  }
  let sub = await reg.pushManager.getSubscription()
  const subKey = sub?.options.applicationServerKey
  if (sub && (!subKey || b64u(subKey) !== keys.publicKey)) {
    await sub.unsubscribe()
    sub = null
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(keys.publicKey) })
  return codeOf(sub, keys)
}

/** Zeigt die Erinnerung sofort an, so wie sie gerade aussehen würde (nur auf dem Gerät). */
export async function previewReminder(kind: 'morning' | 'evening') {
  const reg = await navigator.serviceWorker.ready
  reg.active?.postMessage({ type: 'preview', kind })
}
