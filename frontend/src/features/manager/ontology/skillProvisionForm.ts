import type { MicroSkillDto, SkillProvisionPayload } from '../../../shared/api/microSkillApi'
export const levels = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const
type Level = typeof levels[number]
export type ProvisionForm = Record<Level, { mode: string; outcomes: string }>
export function provisionForm(skill?: MicroSkillDto): ProvisionForm {
  return Object.fromEntries(levels.map((level, index) => [level, {
    mode: skill?.moduleOnlyKnowledgeLevels?.includes(level) ? 'MODULE_ONLY' : skill?.certificateOnlyKnowledgeLevels?.includes(level) ? 'CERTIFICATE_ONLY' : '',
    outcomes: [skill?.foundationOutcomeCodes, skill?.intermediateOutcomeCodes, skill?.advancedOutcomeCodes][index]?.join(', ') ?? '',
  }])) as ProvisionForm
}
export function provisionPayload(form: ProvisionForm): SkillProvisionPayload {
  const codes = (level: Level) => form[level].outcomes.split(',').map(code => code.trim()).filter(Boolean)
  return {
    moduleOnlyKnowledgeLevels: levels.filter(level => form[level].mode === 'MODULE_ONLY'),
    certificateOnlyKnowledgeLevels: levels.filter(level => form[level].mode === 'CERTIFICATE_ONLY'),
    foundationOutcomeCodes: codes('FOUNDATION'), intermediateOutcomeCodes: codes('INTERMEDIATE'), advancedOutcomeCodes: codes('ADVANCED'),
  }
}
