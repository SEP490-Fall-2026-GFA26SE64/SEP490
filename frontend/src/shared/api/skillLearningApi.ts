import { moduleRequest } from './moduleAuthoringApi'
export interface SkillCompletion { skillId: string; moduleId: string; revision: number; contentVersion: string; completedAt: string; knowledgeLevel: string | null; skillVersion: string | null; outcomeCodes: string[]; skillName: string | null }
export interface SkillEligibility { skillId: string; eligible: boolean; reason: string; qualifyingCompletion: SkillCompletion | null }
export interface OptionalSkillModule { moduleId: string; title: string; contentVersion: string; started: boolean; completed: boolean }
const skillPath = (skillId: string) => `/skills/${encodeURIComponent(skillId)}`
export const readSkillEligibility = (skillId: string, signal?: AbortSignal) => moduleRequest<SkillEligibility>(`${skillPath(skillId)}/assessment-eligibility`, 'GET', undefined, signal)
export const readSkillModules = (skillId: string, signal?: AbortSignal) => moduleRequest<OptionalSkillModule[]>(`${skillPath(skillId)}/modules`, 'GET', undefined, signal)
export const startSkillModule = (skillId: string, moduleId: string) => moduleRequest<void>(`${skillPath(skillId)}/modules/${encodeURIComponent(moduleId)}/learning`, 'POST', {})
