import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'

/** Place discovered prerequisites before their dependents, retaining the existing order elsewhere. */
export function orderByDependencies(steps: RuleStep[], dependencies: RulePathway['dependencies']): RuleStep[] {
  const byId = new Map(steps.map(step => [step.id, step]))
  const position = new Map(steps.map((step, index) => [step.id, index]))
  const prerequisites = new Map<string, Set<string>>()
  for (const edge of dependencies) {
    if (!byId.has(edge.prerequisiteStepId) || !byId.has(edge.dependentStepId)) continue
    const required = prerequisites.get(edge.dependentStepId) ?? new Set<string>()
    required.add(edge.prerequisiteStepId)
    prerequisites.set(edge.dependentStepId, required)
  }
  const ordered: RuleStep[] = [], visited = new Set<string>()
  // The server-owned Plan rejects cycles; visited also prevents duplicate shared prerequisites.
  function visit(step: RuleStep) {
    if (visited.has(step.id)) return
    visited.add(step.id)
    const required = [...(prerequisites.get(step.id) ?? [])]
      .sort((a, b) => position.get(a)! - position.get(b)!)
    required.forEach(id => visit(byId.get(id)!))
    ordered.push(step)
  }
  steps.forEach(visit)
  return ordered
}

