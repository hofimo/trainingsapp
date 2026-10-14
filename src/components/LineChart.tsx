import { useMemo, useRef, useState } from 'react'
import { fmtNum, fmtShort } from '../util'

export interface Point {
  date: string
  y: number
  label?: string
}

interface Props {
  points: Point[]
  unit: string
  /** Optionale Trendlinie (z. B. gleitender Durchschnitt) */
  trend?: Point[]
  trendName?: string
  seriesName?: string
  height?: number
}

const W = 340
const PAD = { l: 36, r: 12, t: 12, b: 24 }

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6))
  return ticks
}

export default function LineChart({ points, unit, trend, trendName = 'Trend', seriesName, height = 200 }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const H = height

  const geo = useMemo(() => {
    const times = points.map((p) => new Date(p.date).getTime())
    const t0 = Math.min(...times)
    const t1 = Math.max(...times)
    const ys = [...points.map((p) => p.y), ...(trend ?? []).map((p) => p.y)]
    const ticks = niceTicks(Math.min(...ys), Math.max(...ys))
    const y0 = ticks[0]
    const y1 = ticks[ticks.length - 1]
    const x = (iso: string) =>
      t1 === t0 ? (PAD.l + W - PAD.r) / 2 : PAD.l + ((new Date(iso).getTime() - t0) / (t1 - t0)) * (W - PAD.l - PAD.r)
    const y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b)
    return { x, y, ticks }
  }, [points, trend, H])

  if (!points.length) return <p className="muted">Noch keine Daten.</p>

  const path = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${geo.x(p.date).toFixed(1)},${geo.y(p.y).toFixed(1)}`).join(' ')

  const xLabels = points.length <= 1 ? points : [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]]

  function onMove(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    let bestD = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(geo.x(p.date) - px)
      if (d < bestD) [best, bestD] = [i, d]
    })
    setActive(best)
  }

  const a = active != null ? points[active] : null
  const ax = a ? geo.x(a.date) : 0
  const showLegend = !!trend?.length

  return (
    <div className="chart">
      {showLegend && (
        <div className="legend">
          <span>
            <i className="dot" /> {seriesName ?? 'Werte'}
          </span>
          <span>
            <i className="line" /> {trendName}
          </span>
        </div>
      )}
      <div className="chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Verlauf in ${unit}`}
          onPointerDown={onMove}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        >
          {geo.ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={geo.y(t)} y2={geo.y(t)} />
              <text className="axis" x={PAD.l - 6} y={geo.y(t) + 4} textAnchor="end">
                {fmtNum(t)}
              </text>
            </g>
          ))}
          {xLabels.map((p, i) => (
            <text
              key={i}
              className="axis"
              x={geo.x(p.date)}
              y={H - 6}
              textAnchor={i === 0 && xLabels.length > 1 ? 'start' : i === xLabels.length - 1 && xLabels.length > 1 ? 'end' : 'middle'}
            >
              {fmtShort(p.date)}
            </text>
          ))}
          {trend && trend.length > 1 && <path className="trend" d={path(trend)} />}
          {!trend && points.length > 1 && <path className="series" d={path(points)} />}
          {points.map((p, i) => (
            <circle key={i} className={trend ? 'pt pt-soft' : 'pt'} cx={geo.x(p.date)} cy={geo.y(p.y)} r={active === i ? 5 : 3.5} />
          ))}
          {a && <line className="cross" x1={ax} x2={ax} y1={PAD.t} y2={H - PAD.b} />}
        </svg>
        {a && (
          <div className="tip" style={{ left: `${(ax / W) * 100}%` }}>
            <b>
              {fmtNum(a.y)} {unit}
            </b>
            <span>{a.label ?? fmtShort(a.date)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
