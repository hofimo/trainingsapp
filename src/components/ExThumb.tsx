import { primaryMuscle } from '../muscles'
import type { Exercise } from '../types'

/** Kleines Übungsbild (Endposition), ohne Bild ein farbiges Kürzel in der Muskelfarbe. */
export default function ExThumb({ ex }: { ex: Exercise }) {
  const m = primaryMuscle(ex.id)
  const style = { '--mus': m?.color ?? 'var(--text-2)' } as React.CSSProperties
  return ex.img ? (
    <img className="thumb" style={style} src={`./exercises/${ex.id}-1.jpg`} alt="" loading="lazy" />
  ) : (
    <span className="thumb thumb-empty" style={style}>
      {ex.name.slice(0, 2)}
    </span>
  )
}

export function MuscleTag({ id }: { id: string }) {
  const m = primaryMuscle(id)
  if (!m) return null
  return (
    <span className="mtag" style={{ '--mus': m.color } as React.CSSProperties}>
      {m.name}
    </span>
  )
}
