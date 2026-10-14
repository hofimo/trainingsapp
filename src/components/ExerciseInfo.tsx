import { useEffect, useState } from 'react'
import type { Exercise } from '../types'

/** Technik-Ansicht: Start- und Endposition im Wechsel (wie ein GIF) plus Hinweise. */
export default function ExerciseInfo({ ex }: { ex: Exercise }) {
  const [frame, setFrame] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!ex.img || paused) return
    const t = setInterval(() => setFrame((f) => 1 - f), 1000)
    return () => clearInterval(t)
  }, [ex.img, paused])

  return (
    <div className="ex-info">
      {ex.img && (
        <figure className="ex-img" onClick={() => setPaused(!paused)}>
          <img src={`./exercises/${ex.id}-0.jpg`} alt={`${ex.name}: Startposition`} className={frame === 0 ? 'on' : ''} />
          <img src={`./exercises/${ex.id}-1.jpg`} alt={`${ex.name}: Endposition`} className={frame === 1 ? 'on' : ''} />
          <figcaption>
            {frame === 0 ? 'Start' : 'Ende'}
            {paused ? ' · angehalten' : ''}
          </figcaption>
        </figure>
      )}
      {ex.imgNote && <p className="small muted">{ex.imgNote}</p>}
      {ex.cue && <p className="cue">{ex.cue}</p>}
      {ex.img && <p className="credit">Bilder: free-exercise-db (gemeinfrei) · Tippen zum Anhalten</p>}
    </div>
  )
}
