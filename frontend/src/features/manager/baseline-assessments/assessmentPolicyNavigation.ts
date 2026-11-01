const base = '/ld-manager/baseline-assessments'
const bounded = (value: string | null): value is string => value !== null && value.length > 0 && value.length <= 200 && value === value.trim() && Array.from(value).every(char => char.charCodeAt(0) >= 32)

/** Fixed local destinations and known view fields only; never an arbitrary return URL or actor/org. */
export function assessmentPolicyPath(occupationId?: string, context = new URLSearchParams()) {
  const query = new URLSearchParams({ tab: 'policy' })
  if (occupationId && bounded(occupationId)) {
    query.set('occupationId', occupationId)
    for (const key of context.has('draft') ? ['draft'] : ['blueprint', 'version']) {
      const value = context.get(key)
      if (bounded(value)) query.set(key, value)
    }
  }
  return `${base}?${query}`
}

export function baselineReturnPath(context: URLSearchParams): string | undefined {
  const occupation = context.get('occupationId')
  if (!bounded(occupation) || occupation === '.' || occupation === '..') return undefined
  const query = new URLSearchParams()
  for (const key of context.has('draft') ? ['draft'] : ['blueprint', 'version']) {
    const value = context.get(key)
    if (bounded(value)) query.set(key, value)
  }
  return `${base}/${encodeURIComponent(occupation)}${query.size ? `?${query}` : ''}`
}
