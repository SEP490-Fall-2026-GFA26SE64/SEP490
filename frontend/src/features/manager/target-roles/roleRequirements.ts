import type { SkillTargetConfig } from '../data/ldManagerMockData'

export function validRequiredKnowledge(levels: string[] | undefined): boolean {
  return !!levels?.length && new Set(levels).size === levels.length && levels.every(level => ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(level))
}
export function missingRoleLevelRequirements(levels: string[] | undefined, targets: SkillTargetConfig[]): string[] {
  return (levels ?? []).filter(level => !targets.some(target => target.level === level && !!target.skillId && validRequiredKnowledge(target.requiredKnowledgeLevels)))
}
/** No conversion from historical percentages, no implicit member-level or knowledge-level inheritance. */
export function roleRequirements(targets: SkillTargetConfig[]) {
  return targets.map(target => {
    if (!target.skillId || !target.level || !validRequiredKnowledge(target.requiredKnowledgeLevels)) throw new Error('Select explicit knowledge levels for every skill and Role level before saving.')
    return { skillId: target.skillId, skillCode: target.skillCode, skillName: target.skillName, level: target.level,
      macroCompetencyCode: target.macroCompetencyCode, requiredKnowledgeLevels: [...target.requiredKnowledgeLevels!].sort() }
  })
}
