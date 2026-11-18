import { graphToken } from '../../shared/components/ui/ontologyGraphStyle'
import type { CatalogNodeLabel } from './platformCatalogApi'

export type GraphPalette = ReturnType<typeof readPalette>
export type NodeState = { inCatalog: boolean; dimmed: boolean; focused: boolean; hover: boolean; badge?: boolean }
type Spec = { maxWidth: number; size: number; weight: number; lines: number; glyph: number; pill: boolean }
type Metrics = { width: number; height: number; lines: string[]; font: string; spec: Spec }

const FONT = '"IBM Plex Sans", system-ui, sans-serif'
const PAD_X = 10
const PAD_Y = 8
const LINE_GAP = 3

export const NODE_SPECS: Record<CatalogNodeLabel, Spec> = {
  Organization: { maxWidth: 240, size: 14.5, weight: 700, lines: 2, glyph: 28, pill: true },
  Department: { maxWidth: 240, size: 14, weight: 700, lines: 2, glyph: 26, pill: false },
  JobPosition: { maxWidth: 230, size: 13.5, weight: 600, lines: 2, glyph: 24, pill: false },
  TargetRole: { maxWidth: 210, size: 13, weight: 600, lines: 2, glyph: 22, pill: true },
  Level: { maxWidth: 140, size: 12.5, weight: 500, lines: 1, glyph: 18, pill: true },
  Competency: { maxWidth: 210, size: 13, weight: 500, lines: 2, glyph: 20, pill: false },
  MicroSkill: { maxWidth: 190, size: 12.5, weight: 400, lines: 2, glyph: 16, pill: true },
  LearningModule: { maxWidth: 210, size: 12.5, weight: 500, lines: 2, glyph: 18, pill: false },
  Certificate: { maxWidth: 200, size: 12.5, weight: 500, lines: 2, glyph: 18, pill: false },
}

export function readPalette() {
  return {
    card: graphToken('card'), border: graphToken('border'), foreground: graphToken('foreground'),
    muted: graphToken('muted-foreground'), primary: graphToken('primary'), primaryHover: graphToken('primary-hover'),
    secondary: graphToken('secondary'), shadow: graphToken('foreground', 0.07), hoverShadow: graphToken('foreground', 0.18),
    halo: graphToken('primary', 0.2), onPrimary: graphToken('primary-foreground'),
    accent: {
      Organization: graphToken('primary'), Department: graphToken('foreground'),
      JobPosition: graphToken('primary'), TargetRole: graphToken('primary'), Level: graphToken('muted-foreground'),
      Competency: graphToken('primary'), MicroSkill: graphToken('success'),
      LearningModule: graphToken('warning'), Certificate: graphToken('destructive'),
    } as Record<CatalogNodeLabel, string>,
    tint: {
      Organization: graphToken('primary', 0.16), Department: graphToken('foreground', 0.08),
      JobPosition: graphToken('primary', 0.14), TargetRole: graphToken('primary', 0.1), Level: graphToken('muted-foreground', 0.12),
      Competency: graphToken('primary', 0.1), MicroSkill: graphToken('success', 0.16),
      LearningModule: graphToken('warning', 0.18), Certificate: graphToken('destructive', 0.12),
    } as Record<CatalogNodeLabel, string>,
    skillBorder: graphToken('success', 0.55),
  }
}

/** Pure visual decision for a node, kept separate from canvas drawing so it can be reasoned about and tested. */
export function nodeLook(label: CatalogNodeLabel, state: NodeState, palette: GraphPalette) {
  const emphasis = state.focused || state.hover
  return {
    alpha: state.dimmed && !emphasis ? 0.18 : 1,
    fill: state.inCatalog ? palette.secondary : palette.card,
    stroke: emphasis ? palette.primaryHover : state.inCatalog ? palette.primary : label === 'MicroSkill' ? palette.skillBorder : palette.border,
    lineWidth: state.inCatalog || emphasis ? 2 : 1.25,
    halo: state.focused,
    check: state.inCatalog && state.badge !== false,
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.trim().split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= width || !current) current = next
    else { lines.push(current); current = word }
  }
  if (current) lines.push(current)
  const visible = lines.slice(0, maxLines)
  const last = visible.length - 1
  if (lines.length > maxLines || ctx.measureText(visible[last]).width > width) {
    let clipped = visible[last]
    while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > width) clipped = clipped.slice(0, -1)
    visible[last] = `${clipped.trimEnd()}…`
  }
  return visible
}

export function measureNode(ctx: CanvasRenderingContext2D, label: CatalogNodeLabel, name: string): Metrics {
  const spec = NODE_SPECS[label]
  const font = `${spec.weight} ${spec.size}px ${FONT}`
  ctx.save()
  ctx.font = font
  const textWidth = spec.maxWidth - PAD_X * 2 - spec.glyph - 8
  const lines = wrap(ctx, name || '—', textWidth, spec.lines)
  const widest = Math.max(...lines.map(line => ctx.measureText(line).width))
  ctx.restore()
  const lineHeight = spec.size * 1.25
  const height = Math.max(spec.glyph + PAD_Y * 2, lines.length * lineHeight + (lines.length - 1) * LINE_GAP + PAD_Y * 2)
  return { width: Math.ceil(widest + PAD_X * 2 + spec.glyph + 8), height: Math.ceil(height), lines, font, spec }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function polygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number, rotation: number) {
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * 2 * Math.PI) / sides
    ctx[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(angle), cy + r * Math.sin(angle))
  }
  ctx.closePath()
}

function drawGlyph(ctx: CanvasRenderingContext2D, label: CatalogNodeLabel, cx: number, cy: number, size: number, palette: GraphPalette) {
  ctx.fillStyle = palette.tint[label]
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.fill()
  const r = size * 0.24
  ctx.fillStyle = palette.accent[label]
  ctx.strokeStyle = palette.accent[label]
  ctx.lineWidth = 1.75
  if (label === 'Organization') { ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill() }
  else if (label === 'Department') { polygon(ctx, cx, cy + r * 0.1, r * 1.25, 5, -Math.PI / 2); ctx.stroke() }
  else if (label === 'JobPosition') { roundedRect(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.45); ctx.fill() }
  else if (label === 'TargetRole') { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke() }
  else if (label === 'Level') { polygon(ctx, cx, cy, r * 1.25, 4, 0); ctx.fill() }
  else if (label === 'Competency') { polygon(ctx, cx, cy, r * 1.15, 6, Math.PI / 6); ctx.stroke() }
  else if (label === 'LearningModule') { roundedRect(ctx, cx - r * 1.1, cy - r * 0.85, r * 2.2, r * 1.7, r * 0.3); ctx.stroke() }
  else if (label === 'Certificate') { polygon(ctx, cx, cy + r * 0.15, r * 1.2, 3, -Math.PI / 2); ctx.fill() }
  else { ctx.beginPath(); ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2); ctx.fill() }
}

function drawCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number, palette: GraphPalette) {
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fillStyle = palette.primary
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = palette.card
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 3.5, cy + 0.2)
  ctx.lineTo(cx - 1, cy + 2.7)
  ctx.lineTo(cx + 3.8, cy - 2.4)
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = palette.onPrimary
  ctx.stroke()
}

export function drawNode(ctx: CanvasRenderingContext2D, x: number, y: number, label: CatalogNodeLabel, metrics: Metrics,
  state: NodeState, palette: GraphPalette) {
  const look = nodeLook(label, state, palette)
  const { width, height, spec } = metrics
  const left = x - width / 2
  const top = y - height / 2
  const radius = spec.pill && metrics.lines.length === 1 ? height / 2 : 10
  // Zoomed far out, text is unreadable: draw simplified shapes to keep panning smooth.
  const detailed = ctx.getTransform().a * spec.size >= 5
  ctx.globalAlpha = look.alpha
  if (look.halo) {
    roundedRect(ctx, left - 5, top - 5, width + 10, height + 10, radius + 5)
    ctx.fillStyle = palette.halo
    ctx.fill()
  }
  if (state.hover) {
    ctx.shadowColor = palette.hoverShadow
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 4
  } else if (detailed) {
    roundedRect(ctx, left, top + 2, width, height, radius)
    ctx.fillStyle = palette.shadow
    ctx.fill()
  }
  roundedRect(ctx, left, top, width, height, radius)
  ctx.fillStyle = look.fill
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.lineWidth = look.lineWidth
  ctx.strokeStyle = look.stroke
  ctx.stroke()
  drawGlyph(ctx, label, left + PAD_X + spec.glyph / 2, y, spec.glyph, palette)
  if (detailed) {
    ctx.font = metrics.font
    ctx.fillStyle = palette.foreground
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const lineHeight = spec.size * 1.25 + LINE_GAP
    const firstY = y - ((metrics.lines.length - 1) * lineHeight) / 2
    metrics.lines.forEach((line, index) => ctx.fillText(line, left + PAD_X + spec.glyph + 8, firstY + index * lineHeight))
  }
  if (look.check) drawCheck(ctx, left + width - 4, top + 2, palette)
  ctx.globalAlpha = 1
}
