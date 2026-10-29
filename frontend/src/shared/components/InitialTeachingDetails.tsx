import type { TeachingTarget } from '../api/initialPathway'
import { pathwayAttention } from '../api/initialPathwayMessages'
import { useTranslation } from '../i18n/LanguageContext'
import { Text } from './typography/Text'
import { Badge } from './ui/Badge'

/** Shared explanation for the existing Expert and Employee initial-pathway surfaces. */
export function InitialTeachingDetails({ targets, skillNames }: { targets: TeachingTarget[]; skillNames?: ReadonlyMap<string, string> }) {
  const { t } = useTranslation(), tr = (key: string) => t('initialPathway.' + key)
  return <ul className="space-y-2">
    {targets.map(target => <li key={target.skillId} className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Text as="span" variant="body-sm">{skillNames?.get(target.skillId) ?? target.skillId}</Text>
        {target.teachingFocus ? <><Badge variant="outline">{tr('focus.' + target.teachingFocus)}</Badge><Badge variant="secondary">{tr('difficulty.' + target.difficultyLevel)}</Badge></> : <Text as="span" variant="caption">{tr('historicalTeaching')}</Text>}
        {target.coverageRole === 'COVERAGE' && <Text as="span" variant="caption">{tr('coversNeed')}</Text>}
      </div>
      {target.expertAttention && <div className="space-y-1" role="note"><Badge variant="warning">{tr('expertAttention')}</Badge><Text variant="caption">{pathwayAttention(target.attentionReason, t)}</Text></div>}
    </li>)}
  </ul>
}
