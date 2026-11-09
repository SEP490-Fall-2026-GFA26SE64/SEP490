import type { MicroSkillDto, SkillProvisionPayload } from '../../../shared/api/microSkillApi'
export const levels = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const
type Level = typeof levels[number]
export type ProvisionForm = Record<Level, { mode: string }>
export function provisionForm(skill?: MicroSkillDto): ProvisionForm {
  return Object.fromEntries(levels.map(level => [level, {
    mode: skill?.moduleOnlyKnowledgeLevels?.includes(level) ? 'MODULE_ONLY' : skill?.certificateOnlyKnowledgeLevels?.includes(level) ? 'CERTIFICATE_ONLY' : '',
  }])) as ProvisionForm
}
export function provisionPayload(form: ProvisionForm): SkillProvisionPayload {
  return {
    moduleOnlyKnowledgeLevels: levels.filter(level => form[level].mode === 'MODULE_ONLY'),
    certificateOnlyKnowledgeLevels: levels.filter(level => form[level].mode === 'CERTIFICATE_ONLY'),
  }
}
