import type { Edge, Node } from 'vis-network'

export type OntologyNodeType = 'jobPosition' | 'targetRole' | 'level' | 'competency' | 'skill'

export function graphToken(name: string, alpha = 1): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  return `hsl(${value} / ${alpha})`
}

export function ontologyNodeStyle(type: OntologyNodeType, code: string, name: string, compact = false): Omit<Node, 'id'> {
  const accent = { jobPosition: 'primary', targetRole: 'primary', level: 'muted-foreground', competency: 'primary', skill: 'success' }[type]
  return {
    shape: 'box',
    shapeProperties: { borderRadius: type === 'skill' ? 14 : 8 },
    label: compact || code === name ? code : `${code}\n${name}`,
    margin: compact ? { top: 6, right: 10, bottom: 6, left: 10 } : { top: 10, right: 14, bottom: 10, left: 14 },
    widthConstraint: { maximum: compact ? 130 : 210 },
    color: {
      background: graphToken(type === 'targetRole' || type === 'jobPosition' ? 'secondary' : 'card'),
      border: graphToken(accent),
      highlight: { background: graphToken('secondary'), border: graphToken('primary') },
      hover: { background: graphToken('muted'), border: graphToken(accent) },
    },
    font: { color: graphToken('foreground'), size: compact ? 10 : 13, face: 'IBM Plex Sans', multi: false },
    borderWidth: type === 'targetRole' || type === 'jobPosition' ? 2 : 1.5,
  }
}

export function ontologyEdgeStyle(type: string): Edge {
  const prerequisite = type === 'HAS_SKILL_PREREQUISITE'
  return {
    arrows: { to: { enabled: true, scaleFactor: prerequisite ? 0.7 : 0.5 } },
    color: { color: graphToken(prerequisite ? 'destructive' : 'muted-foreground', 0.65),
      highlight: graphToken('primary'), hover: graphToken('primary') },
    font: { color: graphToken('muted-foreground'), size: 10, strokeWidth: 0 },
    width: prerequisite ? 2 : 1.2,
    dashes: prerequisite || type === 'REQUIRES_SKILL',
    smooth: { enabled: true, type: 'continuous', roundness: 0.15 },
  }
}
