import type { KnowledgeLevel } from './rq1BenchmarkEngine'

export function knowledgeLevelVariant(level: KnowledgeLevel): 'success' | 'primary' | 'warning' {
  if (level === 'FOUNDATION') return 'success'
  if (level === 'INTERMEDIATE') return 'primary'
  return 'warning'
}
