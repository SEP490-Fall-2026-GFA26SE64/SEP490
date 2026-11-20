import { adaptiveHttp } from './adaptiveBaselineApi'
export interface SharedRule { totalCount: number; requiredCorrectCount: number; mandatoryCount: number; allWrongVeto: boolean }
export interface SharedConfiguration { name: string; levels: Record<string, SharedRule>; prerequisite: SharedRule; secondsPerQuestion: number; maxAttempts: number; retakeWaitSeconds: number }
export interface SharedCapacity { level: string; maxQuestions: number; mandatoryQuestions: number; skillCount: number; skippedSkills: number; limitingSkills: string[] }
export interface SharedVersion { id: string; version: number; configuration: SharedConfiguration; createdAt: string }
export interface SharedWorkspace { draft: { id: string; revision: number; configuration: SharedConfiguration; updatedAt: string } | null; active: SharedVersion | null; versions: SharedVersion[]; totalVersions: number; activationRevision: number; capacities: SharedCapacity[]; capacityHash: string; defaults: SharedConfiguration; legacyActiveScopes: number }
export interface SharedCommand { commandKey: string; action: 'SAVE_DRAFT' | 'SAVE_ACTIVATE' | 'ACTIVATE' | 'ABANDON'; draftId: string | null; expectedRevision: number; expectedActivationRevision: number; capacityHash: string; configuration: SharedConfiguration | null }
const base = '/api/v1/assessment-policies/SKILL_ASSESSMENT/shared'
export const readSharedSkill = (page = 0, signal?: AbortSignal, search = '', sort = 'latest') => adaptiveHttp(base + '?page=' + page + '&search=' + encodeURIComponent(search) + '&sort=' + encodeURIComponent(sort), { signal }, value => value as SharedWorkspace)
export const sendSharedSkill = (command: SharedCommand) => adaptiveHttp(base + '/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) }, value => value as SharedWorkspace)
