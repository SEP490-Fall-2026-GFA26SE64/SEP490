import { useState } from 'react'
import type { PathwayView } from '../../../shared/api/initialPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { InitialTeachingDetails } from '../../../shared/components/InitialTeachingDetails'
import { pathwayAttention, pathwayMessage } from '../../../shared/api/initialPathwayMessages'
import { PathwayError } from '../../../shared/api/initialPathway'

/** Both existing timeline/roadmap surfaces consume the same server order and gates. */
export function InitialPathwayModules({ pathway, roadmap = false }: { pathway: PathwayView; roadmap?: boolean }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key)
  const [expanded, setExpanded] = useState<string | null>(null)
  const safeEntry = (entry: string | null) => entry?.startsWith('/') && !entry.startsWith('//') && !entry.includes('\\') ? entry : null
  return <ol className={roadmap ? 'grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3' : 'min-w-0 space-y-4'}>
    {pathway.modules.map(({ module, accessState, entry, reasonCode }) => {
      const gates = pathway.dependencies.filter(g => g.moduleId === module.id)
      return <li key={module.id}><Card className="h-full"><CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3"><Heading level={2} size="card">{module.ordinal}. {module.title}</Heading><Badge variant={accessState === 'AVAILABLE' ? 'success' : 'warning'}>{tr('state.' + accessState)}</Badge></div>
        <Text variant="body-sm">{module.durationMinutes.toLocaleString(language)} {tr('duration')} · {module.priceVnd.toLocaleString(language)} {tr('price')}</Text>
        {module.targets.some(target => target.expertAttention) && <div className="space-y-1" role="note"><Badge variant="warning">{tr('expertAttention')}</Badge>{[...new Set(module.targets.filter(target => target.expertAttention).map(target => pathwayAttention(target.attentionReason, t)))].map(note => <Text key={note} variant="caption">{note}</Text>)}</div>}
        {reasonCode && accessState === 'UNAVAILABLE' && <Text variant="caption">{pathwayMessage(new PathwayError(reasonCode, 503), t)}</Text>}
        {gates.length > 0 && <Text variant="body-sm">{tr('prerequisites')}: {gates.map(g => pathway.modules.find(m => m.module.id === g.providerModuleId)?.module.title ?? g.prerequisiteSkillId).join(', ')}</Text>}
        <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" aria-expanded={expanded === module.id} onClick={() => setExpanded(value => value === module.id ? null : module.id)}>{t('upskillingUi.showDetails')}</Button>
          {accessState === 'AVAILABLE' && !pathway.archived && safeEntry(entry) && <a href={safeEntry(entry)!} className="self-center font-semibold text-primary underline underline-offset-4">{tr('learn')}</a>}</div>
        {expanded === module.id && <InitialTeachingDetails targets={module.targets} />}
      </CardContent></Card></li>
    })}
  </ol>
}
