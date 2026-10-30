import { Layers, Target } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardFooter } from '../../../shared/components/ui/Card'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentRole } from './currentRoleFlowApi'

export function CurrentRoleCard({ role, active, disabled, onDetails, onChoose, onGaps, gapDisabled = disabled }: {
  role: CurrentRole; active: boolean; disabled: boolean
  onDetails: () => void; onChoose: () => void; onGaps?: () => void; gapDisabled?: boolean
}) {
  const { t } = useTranslation()
  const skills = new Set(role.levels.flatMap(level => level.skills.map(skill => skill.id))).size
  return <Card className={`flex min-w-0 flex-col transition-all duration-150 hover:shadow-md ${active ? 'border-primary ring-1 ring-primary/15' : 'hover:border-primary/40'}`}>
    <CardContent className="flex-1 space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary" className="max-w-full whitespace-normal break-words">{role.occupationName}</Badge>
        {active && <Badge variant="secondary" className="border-primary/20 text-primary">{t('roleFlow.selected')}</Badge>}
      </div>
      <Heading level={3} size="card" className="break-words">{role.name}</Heading>
      <Text variant="body-sm" className="line-clamp-3 whitespace-pre-wrap break-words">{role.scope}</Text>
    </CardContent>
    <CardFooter className="flex-wrap justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
      <div className="flex flex-wrap gap-3 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Target size={14} aria-hidden="true" />{skills} {t('upskillingUi.skillCount')}</span>
        <span className="inline-flex items-center gap-1.5"><Layers size={14} aria-hidden="true" />{role.levels.length} {t('upskillingUi.levels')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {onGaps && <Button size="sm" variant="primary" disabled={gapDisabled} onClick={onGaps}>{t('initialPathway.gaps')}</Button>}
        <Button size="sm" variant="outline" aria-label={t('roleFlow.details')} onClick={onDetails}>{t('upskillingUi.showDetails')}</Button>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onChoose}>{t(active ? 'initialPathway.chooseLevel' : 'roleFlow.choose')}</Button>
      </div>
    </CardFooter>
  </Card>
}
