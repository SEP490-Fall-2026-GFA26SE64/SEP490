import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { dimensions, type Scores, type Dimension } from './riasecApi'
import { interestCopy } from './riasecContent'
export function RiasecScoreRadar({ scores, comparison }: { scores: Scores; comparison?: { name: string; scores: Scores } }) {
  const { language } = useTranslation(), vi = language === 'vi', id = useId()
  const [selected, select] = useState<Dimension | null>(null), reduced = useReducedMotion()
  const transition = { duration: reduced ? 0 : 0.3 }
  const point = (i: number, value: number) => [240 + Math.sin(i * Math.PI / 3) * value * 3.5, 205 - Math.cos(i * Math.PI / 3) * value * 3.5]
  const polygon = (values: number[]) => values.map((v, i) => point(i, v).join(',')).join(' ')
  const selfPoints = polygon(dimensions.map(d => scores[d]))
  const describe = (d: Dimension) => `${interestCopy[d][vi ? 1 : 0]}: ${vi ? 'Bạn' : 'You'} ${scores[d]}/40${comparison ? ` · ${comparison.name}: ${comparison.scores[d]}/40` : ''}`
  return <div className="mx-auto w-full max-w-[420px]" data-comparison={comparison?.name ?? ''}>
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-caption" aria-live="polite">
      <span className="inline-flex items-center gap-2"><span className="w-6 border-t-2 border-primary/70" />{vi ? 'Bạn' : 'You'}</span>
      {comparison && <span className="inline-flex min-w-0 items-center gap-2 break-words"><span className="w-6 shrink-0 border-t-2 border-dashed border-success" />{comparison.name}</span>}
    </div>
    <svg viewBox="0 0 480 410" role="img" aria-labelledby={id} className="w-full overflow-visible">
      <title id={id}>{vi ? 'Sáu nhóm sở thích RIASEC, thang 0–40.' : 'Six RIASEC interests, scale 0–40.'}</title>
      {[10, 20, 30, 40].map(v => <polygon key={v} points={polygon(dimensions.map(() => v))} className="fill-none stroke-border/70" />)}
      {dimensions.map((d, i) => { const [x, y] = point(i, 40), [lx, ly] = point(i, 49); return <g key={d}>
        <line x1={240} y1={205} x2={x} y2={y} className="stroke-border/70" />
        <text x={lx} y={ly + 5} textAnchor="middle" className="fill-foreground text-[length:var(--text-section)] sm:text-body-sm">{d} · {scores[d]}</text>
      </g> })}
      {[0, 10, 20, 30, 40].map(v => <text key={v} x={250} y={205 - v * 3.5 + 5} className="fill-muted-foreground/70 stroke-card text-[length:var(--text-caption)]" paintOrder="stroke" strokeWidth={1.5}>{v}</text>)}
      <motion.polygon initial={false} animate={{ points: selfPoints }} transition={transition} className="fill-primary/10 stroke-primary/75" strokeWidth={2} />
      {comparison && <motion.polygon initial={{ points: selfPoints, opacity: 0 }} animate={{ points: polygon(dimensions.map(d => comparison.scores[d])), opacity: 1 }} transition={transition} className="fill-success/10 stroke-success" strokeDasharray="6 5" strokeWidth={2} data-testid="riasec-position-layer" />}

      {dimensions.map((d, i) => { const [x, y] = point(i, scores[d]); return <motion.circle key={d} initial={false} animate={{ cx: x, cy: y }} transition={transition} r={selected === d ? 6 : 4} className="fill-primary cursor-pointer" onMouseEnter={() => select(d)} onMouseLeave={() => select(null)} onClick={() => select(d)}><title>{describe(d)}</title></motion.circle> })}
    </svg>
    <div role="group" aria-label="RIASEC" className="mx-auto grid max-w-60 grid-cols-6 gap-1">{dimensions.map(d => <button key={d} type="button" className={`rounded-md border py-1 text-caption focus-visible:ring-2 focus-visible:ring-ring ${selected === d ? 'border-primary bg-secondary' : 'border-border'}`} aria-pressed={selected === d} aria-label={`${d} ${interestCopy[d][language === 'vi' ? 1 : 0]}`} onFocus={() => select(d)} onBlur={() => select(null)} onMouseEnter={() => select(d)} onMouseLeave={() => select(null)} onClick={() => select(d)}>{d}</button>)}</div>
    <p role="status" className="mt-2 min-h-8 text-center text-caption">{selected ? describe(selected) : vi ? 'Chạm, trỏ chuột hoặc dùng bàn phím để xem điểm.' : 'Touch, hover or use the keyboard to inspect a score.'}</p>
  </div>
}
