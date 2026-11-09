import { useContext } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { RuleModuleOption, RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readContextAttempt } from './baselineApi'

export type AssessmentState = 'loading' | 'unavailable' | 'notStarted' | 'inProgress' | 'failed' | 'passed' | 'achieved'
const optionKey = (step: RuleStep, option: RuleModuleOption) => `${step.id}:${option.moduleId}:${option.moduleRevision}`
export const targetFor = (pathway: RulePathway, step: RuleStep, option: RuleModuleOption) => ({ selectionId: pathway.selectionId, selectionRevision: pathway.selectionRevision, stepId: step.id, moduleId: option.moduleId, moduleRevision: option.moduleRevision })

/** Read exact assessment contexts only for completed, current learning options. */
export function usePathwayAssessmentStates(pathway: RulePathway, preview: boolean) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const options = pathway.steps.flatMap(step => step.options.filter(option => option.completedAt && step.state !== 'FULFILLED' && step.state !== 'BYPASSED').map(option => ({ step, option })))
  const queries = useQueries({ queries: options.map(({ step, option }) => ({
    queryKey: ['skillAssessmentState', identity?.organizationId, identity?.accountId, targetFor(pathway, step, option)],
    queryFn: ({ signal }: { signal: AbortSignal }) => readContextAttempt(targetFor(pathway, step, option), 'SKILL_ASSESSMENT', signal),
    enabled: !preview && !pathway.archived && Boolean(identity?.accountId), retry: false, staleTime: 0, gcTime: 0,
  })) })
  const states = new Map<string, AssessmentState>()
  options.forEach(({ step, option }, index) => {
    const query = queries[index], attempt = query.data
    states.set(optionKey(step, option), query.isError ? 'unavailable' : query.isPending ? 'loading' : !attempt ? 'notStarted' : attempt.state === 'IN_PROGRESS' ? 'inProgress'
      : attempt.results.length > 0 && attempt.results.every(result => result.passed && !result.vetoTriggered) ? 'passed' : 'failed')
  })
  return (step: RuleStep, option?: RuleModuleOption): AssessmentState | null => {
    if (preview || pathway.archived || step.requirement.provision !== 'MODULE_ONLY') return null
    if (option && !option.completedAt) return null
    if (step.state === 'FULFILLED') return 'achieved'
    if (step.state === 'BYPASSED') return null
    if (option) return option.completedAt ? states.get(optionKey(step, option)) ?? 'loading' : null
    const available = step.options.filter(item => item.completedAt).map(item => states.get(optionKey(step, item)) ?? 'loading')
    const priority: AssessmentState[] = ['passed', 'inProgress', 'failed', 'unavailable', 'loading', 'notStarted']
    return priority.find(state => available.includes(state)) ?? null
  }
}
