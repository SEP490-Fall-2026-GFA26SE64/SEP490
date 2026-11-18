import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../../../shared/lib/utils'

export interface ChartSegment { key: string; label: string; value: number; tone: string; onSelect?: () => void }
const ease = [0.22, 1, 0.36, 1] as const

/** Animated ring; tones are token names such as `--success` so colors stay inside the design system. */
export function DonutChart({ segments, total, centerLabel, centerValue, ariaLabel, size = 168 }: {
  segments: ChartSegment[]; total?: number; centerLabel: ReactNode; centerValue: ReactNode; ariaLabel: string; size?: number
}) {
  const reduced = useReducedMotion()
  const sum = total ?? segments.reduce((value, segment) => value + segment.value, 0)
  let offset = 0
  return <div className="ld-donut" style={{ width: size, height: size }}>
    <svg viewBox="0 0 120 120" role="img" aria-label={ariaLabel}>
      <circle cx="60" cy="60" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
      {sum > 0 && segments.filter(segment => segment.value > 0).map((segment, index) => {
        const amount = segment.value / sum * 100, start = offset
        offset += amount
        return <motion.circle key={segment.key} cx="60" cy="60" r="48" fill="none" stroke={`hsl(var(${segment.tone}))`} strokeWidth="14" pathLength={100}
          strokeLinecap="butt" transform="rotate(-90 60 60)" strokeDashoffset={-start}
          initial={reduced ? false : { strokeDasharray: `0 100` }} animate={{ strokeDasharray: `${Math.max(amount - 0.6, 0.4)} ${100 - Math.max(amount - 0.6, 0.4)}` }}
          transition={{ duration: 0.9, delay: 0.08 * index, ease }}
          className={cn(segment.onSelect && 'ld-donut-segment')} onClick={segment.onSelect}>
          <title>{`${segment.label}: ${segment.value}`}</title>
        </motion.circle>
      })}
    </svg>
    <div className="ld-donut-center"><strong>{centerValue}</strong><span>{centerLabel}</span></div>
  </div>
}

export function ChartLegend({ segments, total }: { segments: ChartSegment[]; total: number }) {
  return <ul className="ld-legend">{segments.map(segment => {
    const content = <><i style={{ backgroundColor: `hsl(var(${segment.tone}))` }} aria-hidden="true" /><span>{segment.label}</span>
      <strong>{segment.value}</strong><em>{total ? Math.round(100 * segment.value / total) : 0}%</em></>
    return <li key={segment.key}>{segment.onSelect ? <button type="button" onClick={segment.onSelect}>{content}</button> : <div>{content}</div>}</li>
  })}</ul>
}

export interface BarDatum { key: string; label: ReactNode; value: number | null; display?: ReactNode; hint?: ReactNode; tone?: string; onSelect?: () => void }
/** Horizontal bars grow from zero; `max` defaults to 100 for percentages. Unknown values render an explicit dash. */
export function BarList({ data, max = 100, emptyLabel }: { data: BarDatum[]; max?: number; emptyLabel: ReactNode }) {
  const reduced = useReducedMotion()
  if (!data.length) return <p className="ld-chart-empty">{emptyLabel}</p>
  return <ul className="ld-bars">{data.map((datum, index) => {
    const width = datum.value === null || max <= 0 ? 0 : Math.max(0, Math.min(100, datum.value / max * 100))
    const body = <>
      <div className="ld-bar-head"><span className="ld-bar-label">{datum.label}</span><span className="ld-bar-value">{datum.value === null ? '—' : datum.display ?? datum.value}</span></div>
      <div className="ld-bar-track"><motion.div className="ld-bar-fill" style={{ backgroundColor: `hsl(var(${datum.tone ?? '--primary'}))` }}
        initial={reduced ? false : { width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.8, delay: 0.05 * index, ease }} /></div>
      {datum.hint && <span className="ld-bar-hint">{datum.hint}</span>}
    </>
    return <li key={datum.key}>{datum.onSelect ? <button type="button" className="ld-bar-button" onClick={datum.onSelect}>{body}</button> : <div className="ld-bar-static">{body}</div>}</li>
  })}</ul>
}

/** One stacked bar for mutually exclusive counts (for example status mix of a department). */
export function StackedBar({ segments, ariaLabel }: { segments: ChartSegment[]; ariaLabel: string }) {
  const reduced = useReducedMotion()
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return <div className="ld-stacked" role="img" aria-label={ariaLabel}>
    {total > 0 && segments.filter(segment => segment.value > 0).map((segment, index) => <motion.span key={segment.key} title={`${segment.label}: ${segment.value}`}
      style={{ backgroundColor: `hsl(var(${segment.tone}))` }} initial={reduced ? false : { flexGrow: 0 }} animate={{ flexGrow: segment.value }}
      transition={{ duration: 0.8, delay: 0.06 * index, ease }} />)}
  </div>
}

/** Small progress ring used inside tables and headers. */
export function ProgressRing({ value, size = 44, tone = '--success', label }: { value: number | null; size?: number; tone?: string; label: string }) {
  const reduced = useReducedMotion()
  const amount = value === null ? 0 : Math.max(0, Math.min(100, value))
  return <span className="ld-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <motion.circle cx="20" cy="20" r="16" fill="none" stroke={`hsl(var(${tone}))`} strokeWidth="4" strokeLinecap="round" pathLength={100} transform="rotate(-90 20 20)"
        initial={reduced ? false : { strokeDasharray: '0 100' }} animate={{ strokeDasharray: `${amount} ${100 - amount}` }} transition={{ duration: 0.9, ease }} /></svg>
    <span>{value === null ? '—' : `${value}%`}</span>
  </span>
}
