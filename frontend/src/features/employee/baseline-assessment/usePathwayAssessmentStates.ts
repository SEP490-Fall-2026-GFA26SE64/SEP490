import { useContext } from 'react'
import { useQueries, type Query } from '@tanstack/react-query'
import type { RuleModuleOption, RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readModuleHistory, type BaselineAttempt } from './baselineApi'

export type AssessmentState = 'loading' | 'unavailable' | 'notStarted' | 'inProgress' | 'failed' | 'passed' | 'prerequisites'
const optionKey = (step: RuleStep, option: RuleModuleOption) => `${step.id}:${option.moduleId}:${option.moduleRevision}`
export const targetFor = (pathway: RulePathway, step: RuleStep, option: RuleModuleOption) => ({ selectionId: pathway.selectionId, selectionRevision: pathway.selectionRevision, stepId: step.id, moduleId: option.moduleId, moduleRevision: option.moduleRevision })

/** Read exact assessment contexts only for completed, current learning options. */
export function usePathwayAssessmentStates(pathway: RulePathway, preview: boolean) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const options = pathway.steps.flatMap(step => step.options.filter(option => option.completedAt && step.state !== 'BYPASSED').map(option => ({ step, option })))
  const queries = useQueries({ queries: options.map(({ option }) => ({
    queryKey: ['moduleSkillAttempts', identity?.organizationId, identity?.accountId, option.moduleId, option.moduleRevision],
    queryFn: ({ signal }: { signal: AbortSignal }) => readModuleHistory(option.moduleId, option.moduleRevision, signal),
    enabled: !preview && !pathway.archived && Boolean(identity?.accountId), retry: false, staleTime: 0, gcTime: 0,
    refetchInterval: (query: Query<BaselineAttempt[]>) => query.state.data?.some(attempt => attempt.state === 'IN_PROGRESS') ? 5000 : false,
  })) })
  const states = new Map<string, AssessmentState>()
  options.forEach(({ step, option }, index) => {
    const query = queries[index]
    states.set(optionKey(step, option), query.isError ? 'unavailable' : query.isPending ? 'loading' : moduleAssessmentState(query.data ?? [], pathway, step))
  })
  return (step: RuleStep, option?: RuleModuleOption): AssessmentState | null => {
    if (preview || pathway.archived || step.requirement.provision !== 'MODULE_ONLY') return null
    if (option && !option.completedAt) return null
    if (step.state === 'BYPASSED') return null
    if (option) return option.completedAt ? states.get(optionKey(step, option)) ?? 'loading' : null
    const available = step.options.filter(item => item.completedAt).map(item => states.get(optionKey(step, item)) ?? 'loading')
    const priority: AssessmentState[] = ['passed', 'prerequisites', 'inProgress', 'failed', 'unavailable', 'loading', 'notStarted']
    return priority.find(state => available.includes(state)) ?? null
  }
}

/** Same exact-context outcome classification for Pathway, Overview and Profile. */
export function moduleAssessmentState(attempts: BaselineAttempt[], pathway: RulePathway, step: RuleStep): AssessmentState {
  const attempt = attempts.find(item => item.target.selectionId === pathway.selectionId && item.target.selectionRevision === pathway.selectionRevision && item.target.stepId === step.id)
  return !attempt ? 'notStarted' : attempt.state === 'IN_PROGRESS' ? 'inProgress'
    : attempt.results.length > 0 && attempt.results.every(result => result.passed && !result.vetoTriggered) ? 'passed'
    : attempt.results.some(result => attempt.groups.some(group => group.id === result.groupId && group.role === 'MAIN') && result.passed)
      && !attempt.results.some(result => result.vetoTriggered) ? 'prerequisites' : 'failed'
}
