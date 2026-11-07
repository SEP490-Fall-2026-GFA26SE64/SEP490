const knowledgeOrder = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const
type Translate = (key: string) => string

/** Presentation only: never reorder the catalog payload or a frozen historical value. */
export function formatRequiredKnowledge(levels: readonly string[] | undefined, t: Translate): string {
  const rank = (level: string) => {
    const index = knowledgeOrder.findIndex(value => value === level)
    return index < 0 ? knowledgeOrder.length : index
  }
  return [...(levels ?? [])]
    .sort((a, b) => rank(a) - rank(b))
    .map(level => rank(level) < knowledgeOrder.length ? t(`knowledgeLevel.${level}`) : level)
    .join(' · ') || t('roleKnowledge.unclassified')
}
