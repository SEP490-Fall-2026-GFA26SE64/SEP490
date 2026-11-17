import type { KnowledgeEntry } from './knowledgeProfileApi'
import { groupKnowledgeEntries, type KnowledgeNode } from './knowledgeMap'

export interface AchievedSkill {
  key: string; skillId: string; skillName: string; skillVersion: string; levels: KnowledgeNode[]
}
const levels = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED']

/** Official evidence is shared by pathway and independent learning; diagnostics never confer achievement. */
export function achievedSkills(entries: KnowledgeEntry[]): AchievedSkill[] {
  const skills = new Map<string, AchievedSkill>()
  for (const node of groupKnowledgeEntries(entries.filter(e => e.kind !== 'DIAGNOSTIC'))) {
    if (!node.evidence.length || !node.skillVersion) continue
    node.needsReview = node.entries.some(e => e.kind === 'REVIEW' && e.reviewState === 'NEED_REVIEW')
    const key = JSON.stringify([node.skillId, node.skillVersion])
    const skill = skills.get(key) ?? { key, skillId: node.skillId, skillName: node.skillName, skillVersion: node.skillVersion, levels: [] }
    skill.levels.push(node)
    skills.set(key, skill)
  }
  return [...skills.values()].map(skill => ({ ...skill, levels: skill.levels.sort((a, b) => levels.indexOf(a.knowledgeLevel) - levels.indexOf(b.knowledgeLevel)) }))
    .sort((a, b) => a.skillName.localeCompare(b.skillName) || a.skillVersion.localeCompare(b.skillVersion) || a.skillId.localeCompare(b.skillId))
}
