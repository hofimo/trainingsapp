import { useEffect, useState } from 'react'
import { parseNum } from '../util'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  decimal?: boolean
  className?: string
  ariaLabel?: string
}

/** Zahlenfeld, das Komma und Punkt akzeptiert und auf dem iPhone die Zifferntastatur öffnet. */
export default function NumInput({ value, onChange, placeholder, decimal, className, ariaLabel }: Props) {
  const fmt = (v: number | null) => (v == null ? '' : String(v).replace('.', ','))
  const [text, setText] = useState(fmt(value))

  useEffect(() => {
    if (parseNum(text) !== value) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      className={className ?? 'num'}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '')
        setText(t)
        onChange(t === '' ? null : parseNum(t))
      }}
    />
  )
}
