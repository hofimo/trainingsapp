import { useEffect, useRef, useState } from 'react'

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

/** Nimmt den eingebauten Scanner (Chrome/Android) oder sonst die mitgelieferte ZXing-Variante (iPhone). */
async function makeDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: { new (o: unknown): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  if (Native) {
    try {
      const supported = (await Native.getSupportedFormats?.()) ?? []
      if (FORMATS.some((f) => supported.includes(f))) return new Native({ formats: FORMATS })
    } catch {
      // weiter mit ZXing
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  // .wasm aus der eigenen App laden (offline-fähig), nicht vom CDN
  prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
  })
  return new BarcodeDetector({ formats: FORMATS as never })
}

/** Kamera-Ansicht, die EAN/UPC-Barcodes erkennt. Ohne Kamera kann man die Nummer eintippen. */
export default function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [ready, setReady] = useState(false)
  const cb = useRef(onCode)
  cb.current = onCode

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer = 0
    const hits = new Map<string, number>()

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocam')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (stopped) return
        const v = video.current!
        v.srcObject = stream
        await v.play()
        const detector = await makeDetector()
        setReady(true)
        const tick = async () => {
          if (stopped) return
          try {
            if (v.readyState >= 2) {
              const found = await detector.detect(v)
              for (const b of found) {
                const code = b.rawValue?.replace(/\D/g, '')
                if (!code || code.length < 8) continue
                // Zweimal gleich gelesen = sicher erkannt
                const n = (hits.get(code) ?? 0) + 1
                hits.set(code, n)
                if (n >= 2) {
                  stopped = true
                  navigator.vibrate?.(60)
                  cb.current(code)
                  return
                }
              }
            }
          } catch {
            // einzelnes Bild nicht lesbar
          }
          timer = window.setTimeout(tick, 120)
        }
        tick()
      } catch (e) {
        const name = (e as Error)?.name
        setError(
          name === 'NotAllowedError'
            ? 'Kein Zugriff auf die Kamera. Erlaube ihn in den iPhone-Einstellungen (Safari → Kamera) oder tippe die Nummer unter dem Barcode ein.'
            : 'Die Kamera lässt sich hier nicht starten. Tippe die Nummer unter dem Barcode ein.',
        )
      }
    }
    start()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const digits = typed.replace(/\D/g, '')

  return (
    <div className="scanner">
      <div className="scanner-view">
        <video ref={video} playsInline muted autoPlay />
        {!error && <div className="scanner-frame" />}
        {!error && <p className="scanner-hint">{ready ? 'Barcode in den Rahmen halten' : 'Kamera startet …'}</p>}
        {error && <p className="scanner-error">{error}</p>}
      </div>
      <div className="form-row">
        <input
          className="text"
          inputMode="numeric"
          placeholder="Barcode-Nummer eintippen"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && digits.length >= 8 && onCode(digits)}
        />
        <button className="btn" disabled={digits.length < 8} onClick={() => onCode(digits)}>
          Suchen
        </button>
      </div>
      <button className="btn ghost" onClick={onClose}>
        Abbrechen
      </button>
    </div>
  )
}
