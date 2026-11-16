import type { KnowledgeEntry } from '../baseline-assessment/knowledgeProfileApi'
import type { KnowledgeLevel } from '../../../shared/api/requirementPathway'

export const INDIVIDUAL_KNOWLEDGE_LEVELS: KnowledgeLevel[] = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED']

/** Current exact official evidence and review work are separate from attempt scores/diagnostics. */
export function individualKnowledgeState(entries: KnowledgeEntry[] | null, skillId: string, skillVersion: string | null | undefined, level: KnowledgeLevel) {
  if (entries === null || !skillVersion) return { status: 'unavailable' as const, achieved: false, needsReview: false }
  const matching = entries.filter(entry => entry.skillId === skillId && entry.skillVersion === skillVersion && entry.knowledgeLevel === level)
  const achieved = matching.some(entry => entry.kind === 'EVIDENCE')
  const needsReview = matching.some(entry => entry.kind === 'REVIEW' && entry.reviewState === 'NEED_REVIEW')
  return { status: needsReview ? 'review' as const : achieved ? 'achieved' as const : 'notAchieved' as const, achieved, needsReview }
}
