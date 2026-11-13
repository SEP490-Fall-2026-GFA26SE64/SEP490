import type { KnowledgeEntry } from './knowledgeProfileApi'

export interface KnowledgeNode {
  origin?: 'target' | 'prerequisite'
  baselinePassed?: boolean
  needsReview?: boolean
  targetStatus?: import('../overview/roleOverviewData').RequirementStatus
  key: string
  skillId: string
  skillName: string
  skillVersion: string | null
  knowledgeLevel: string
  entries: KnowledgeEntry[]
  evidence: KnowledgeEntry[]
  latestAssessment?: KnowledgeEntry
}

export function groupKnowledgeEntries(entries: KnowledgeEntry[]): KnowledgeNode[] {
  const groups = new Map<string, KnowledgeNode>()
  const seen = new Set<string>()
  // Server pages are newest-first; sort also makes the grouping independent of page boundaries.
  for (const entry of [...entries].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))) {
    const source = JSON.stringify([entry.kind, entry.id])
    if (seen.has(source)) continue
    seen.add(source)
    const key = JSON.stringify([entry.skillId, entry.skillVersion, entry.knowledgeLevel])
    let node = groups.get(key)
    if (!node) {
      node = { key, skillId: entry.skillId, skillName: entry.skillName, skillVersion: entry.skillVersion,
        knowledgeLevel: entry.knowledgeLevel, entries: [], evidence: [] }
      groups.set(key, node)
    }
    node.entries.push(entry)
    if (entry.kind === 'EVIDENCE') node.evidence.push(entry)
    if (entry.kind === 'DIAGNOSTIC' && !node.latestAssessment) node.latestAssessment = entry
  }
  return [...groups.values()]
}
