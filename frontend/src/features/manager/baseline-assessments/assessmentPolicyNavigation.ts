const base = '/ld-manager/baseline-assessments'
const bounded = (value: string | null): value is string => value !== null && value.length > 0 && value.length <= 200 && value === value.trim() && Array.from(value).every(char => char.charCodeAt(0) >= 32)

/** Fixed local destinations and known view fields only; never an arbitrary return URL or actor/org. */
export function assessmentPolicyPath(jobPositionId?: string, context = new URLSearchParams()) {
  const query = new URLSearchParams({ tab: 'policy' })
  if (jobPositionId && bounded(jobPositionId)) {
    query.set('jobPositionId', jobPositionId)
    for (const key of context.has('draft') ? ['draft'] : ['blueprint', 'version']) {
      const value = context.get(key)
      if (bounded(value)) query.set(key, value)
    }
  }
  return `${base}?${query}`
}

export function baselineReturnPath(context: URLSearchParams): string | undefined {
  const jobPosition = context.get('jobPositionId')
  if (!bounded(jobPosition) || jobPosition === '.' || jobPosition === '..') return undefined
  const query = new URLSearchParams()
  for (const key of context.has('draft') ? ['draft'] : ['blueprint', 'version']) {
    const value = context.get(key)
    if (bounded(value)) query.set(key, value)
  }
  return `${base}/${encodeURIComponent(jobPosition)}${query.size ? `?${query}` : ''}`
}
