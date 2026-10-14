/** Fortschrittsring, z. B. Trainings dieser Woche. */
export default function Ring({ value, max, size = 92, children }: { value: number; max: number; size?: number; children?: React.ReactNode }) {
  const r = 40
  const c = 2 * Math.PI * r
  const f = Math.min(value / max, 1)
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}
