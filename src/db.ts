// Lokale Datenbank im Browser (IndexedDB). Alle Daten bleiben auf dem Gerät.
import type { BodyWeight, Session, SupplementLog } from './types'

const DB_NAME = 'trainingsapp'
const DB_VERSION = 2

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('bodyWeights')) db.createObjectStore('bodyWeights', { keyPath: 'date' })
        if (!db.objectStoreNames.contains('supplementLog')) db.createObjectStore('supplementLog', { keyPath: 'date' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const req = fn(tx.objectStore(store))
        tx.oncomplete = () => resolve(req ? (req.result as T) : (undefined as T))
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

export const kvGet = <T>(key: string) => run<T | undefined>('kv', 'readonly', (s) => s.get(key))
export const kvSet = (key: string, value: unknown) => run<void>('kv', 'readwrite', (s) => void s.put(value, key))

export const getSessions = () => run<Session[]>('sessions', 'readonly', (s) => s.getAll())
export const putSession = (v: Session) => run<void>('sessions', 'readwrite', (s) => void s.put(v))
export const deleteSession = (id: string) => run<void>('sessions', 'readwrite', (s) => void s.delete(id))

export const getBodyWeights = () => run<BodyWeight[]>('bodyWeights', 'readonly', (s) => s.getAll())
export const putBodyWeight = (v: BodyWeight) => run<void>('bodyWeights', 'readwrite', (s) => void s.put(v))
export const deleteBodyWeight = (date: string) => run<void>('bodyWeights', 'readwrite', (s) => void s.delete(date))

export const getSupplementLogs = () => run<SupplementLog[]>('supplementLog', 'readonly', (s) => s.getAll())
export const putSupplementLog = (v: SupplementLog) => run<void>('supplementLog', 'readwrite', (s) => void s.put(v))

export async function clearAll() {
  await run<void>('kv', 'readwrite', (s) => void s.clear())
  await run<void>('sessions', 'readwrite', (s) => void s.clear())
  await run<void>('bodyWeights', 'readwrite', (s) => void s.clear())
  await run<void>('supplementLog', 'readwrite', (s) => void s.clear())
}

/** Bittet den Browser, die Daten nicht automatisch zu löschen (wichtig auf dem iPhone). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // nicht unterstützt
  }
}
