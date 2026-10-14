import { useRef, useState } from 'react'
import NumInput from '../components/NumInput'
import { TIME_LABEL } from '../components/SupplementCard'
import { defaultSupplements } from '../defaults'
import { uid, useStore } from '../store'
import type { Backup, DayTime, Supplement } from '../types'
import { download, fmtNum, todayISO } from '../util'

export default function Settings({ onClose }: { onClose: () => void }) {
  const { settings, saveSettings, exportBackup, importBackup, resetAll, sessions, bodyWeights, supplements, saveSupplements } = useStore()
  const [w, setW] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const weights = [...settings.weights].sort((a, b) => a - b)

  function addWeight() {
    if (w == null || w <= 0 || weights.includes(w)) return
    saveSettings({ ...settings, weights: [...weights, w].sort((a, b) => a - b) })
    setW(null)
  }

  async function doExport() {
    const name = `training-backup-${todayISO()}.json`
    const text = JSON.stringify(exportBackup(), null, 2)
    const file = new File([text], name, { type: 'application/json' })
    // Auf dem iPhone über das Teilen-Menü („In Dateien sichern“), sonst als Download
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Training Backup' })
        setMsg('Backup geteilt.')
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    download(name, text)
    setMsg('Backup heruntergeladen.')
  }

  async function doImport(f: File) {
    try {
      const data = JSON.parse(await f.text()) as Backup
      if (!confirm(`Backup vom ${data.exportedAt?.slice(0, 10) ?? '?'} laden? Deine aktuellen Daten werden ersetzt.`)) return
      await importBackup(data)
      setMsg('Backup geladen.')
    } catch (e) {
      setMsg(`Fehler: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Einstellungen</h1>
        </div>
        <button className="btn ghost" onClick={onClose}>
          Fertig
        </button>
      </header>

      <section className="card">
        <h2>Meine Kurzhanteln</h2>
        <p className="small muted">Gewicht pro Hand. Die App schlägt beim Steigern nur Gewichte vor, die du hier hast.</p>
        <div className="chips">
          {weights.map((x) => (
            <span key={x} className="chip">
              {fmtNum(x)} kg
              <button aria-label={`${x} kg entfernen`} onClick={() => saveSettings({ ...settings, weights: weights.filter((y) => y !== x) })}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="form-row">
          <NumInput decimal className="num wide" value={w} onChange={setW} placeholder="z. B. 15" ariaLabel="Neues Gewicht" />
          <button className="btn" onClick={addWeight} disabled={w == null}>
            Hinzufügen
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Pausentimer</h2>
        <p className="small muted">Startet automatisch, wenn du einen Satz abhakst. Bei Supersätzen erst nach der zweiten Übung.</p>
        <div className="form-row">
          <label className="grow">Grundübungen (Kniebeugen, Drücken, Klimmzüge …)</label>
          <NumInput className="num short" value={settings.restLong ?? null} placeholder="90" onChange={(v) => saveSettings({ ...settings, restLong: v && v > 0 ? v : undefined })} ariaLabel="Pause Grundübungen in Sekunden" />
          <span className="small muted">s</span>
        </div>
        <div className="form-row">
          <label className="grow">Arme, Schultern, Rumpf</label>
          <NumInput className="num short" value={settings.restShort ?? null} placeholder="60" onChange={(v) => saveSettings({ ...settings, restShort: v && v > 0 ? v : undefined })} ariaLabel="Pause Isolationsübungen in Sekunden" />
          <span className="small muted">s</span>
        </div>
      </section>

      <section className="card">
        <h2>Meine Supplements</h2>
        <p className="small muted">Erscheinen unter „Heute“ zum Abhaken.</p>
        {supplements.map((sp, i) => {
          const set = (patch: Partial<Supplement>) => saveSupplements(supplements.map((x, j) => (j === i ? { ...x, ...patch } : x)))
          return (
            <div key={sp.id} className="supp-edit">
              <input className="text" value={sp.name} aria-label="Name" onChange={(e) => set({ name: e.target.value })} />
              <div className="form-row">
                <input className="text" value={sp.dose} aria-label="Menge" placeholder="Menge" onChange={(e) => set({ dose: e.target.value })} />
                <select className="select" value={sp.time} aria-label="Tageszeit" onChange={(e) => set({ time: e.target.value as DayTime })}>
                  {Object.entries(TIME_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  className="btn tiny ghost danger"
                  aria-label={`${sp.name} entfernen`}
                  onClick={() => confirm(`${sp.name} entfernen?`) && saveSupplements(supplements.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
        <div className="form-row">
          <button className="btn" onClick={() => saveSupplements([...supplements, { id: 's' + uid(), name: 'Neues Supplement', dose: '', time: 'morning' }])}>
            + Supplement
          </button>
          <button className="btn ghost" onClick={() => confirm('Supplements auf den Vorschlag zurücksetzen?') && saveSupplements(defaultSupplements())}>
            Vorschlag wiederherstellen
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="small muted">
          Alle Daten liegen nur auf diesem Gerät ({sessions.filter((s) => s.finished).length} Trainings, {bodyWeights.length} Gewichtseinträge). Sichere ab und
          zu ein Backup, z. B. in iCloud Drive.
        </p>
        <div className="form-row">
          <button className="btn" onClick={doExport}>
            Backup exportieren
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Backup laden
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p className="small">{msg}</p>}
      </section>

      <section className="card">
        <h2>Auf dem iPhone installieren</h2>
        <ol className="small">
          <li>Diese Seite in Safari öffnen.</li>
          <li>Unten auf „Teilen“ tippen (Quadrat mit Pfeil).</li>
          <li>„Zum Home-Bildschirm“ wählen.</li>
        </ol>
        <p className="small muted">Danach startet die App vom Home-Bildschirm und funktioniert auch ohne Internet.</p>
      </section>

      <section className="card">
        <h2>Alles löschen</h2>
        <button
          className="btn danger"
          onClick={() => confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.') && resetAll().then(() => setMsg('Alle Daten gelöscht.'))}
        >
          Alle Daten löschen
        </button>
      </section>
    </div>
  )
}
