export interface AssessmentBankIssue { roleLevelId: string; roleLevelName: string; skillId: string; skillName: string; knowledgeLevel: 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED' }
export function parseAssessmentBankIssues(value: unknown): AssessmentBankIssue[] {
  if (!Array.isArray(value) || value.length > 10000) return []
  return value.filter((item): item is AssessmentBankIssue => Boolean(item && typeof item === 'object'
    && ['roleLevelId', 'roleLevelName', 'skillId', 'skillName'].every(key => typeof item[key] === 'string' && item[key].trim())
    && ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(item.knowledgeLevel)))
}
