const knowledgeOrder = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const
type Translate = (key: string) => string

/** Presentation only: never reorder the catalog payload or a frozen historical value. */
export function formatRequiredKnowledge(
  levels: readonly string[] | undefined,
  t: Translate,
  levelName?: string
): string {
  let effectiveLevels = levels && levels.length > 0 ? levels : undefined
  if (!effectiveLevels && levelName) {
    const norm = levelName.toLowerCase()
    if (norm.includes('senior')) effectiveLevels = ['INTERMEDIATE', 'ADVANCED']
    else if (norm.includes('middle')) effectiveLevels = ['INTERMEDIATE']
    else effectiveLevels = ['FOUNDATION']
  }
  const rank = (level: string) => {
    const index = knowledgeOrder.findIndex(value => value === level)
    return index < 0 ? knowledgeOrder.length : index
  }
  return [...(effectiveLevels ?? [])]
    .sort((a, b) => rank(a) - rank(b))
    .map(level => rank(level) < knowledgeOrder.length ? t(`knowledgeLevel.${level}`) : level)
    .join(' · ') || t('roleKnowledge.unclassified')
}
