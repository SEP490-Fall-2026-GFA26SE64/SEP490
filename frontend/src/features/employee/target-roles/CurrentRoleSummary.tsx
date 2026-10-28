import { Target } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card } from '../../../shared/components/ui/Card'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { RoleBaselineGate } from './RoleBaselineGate'
import type { RoleFlowView } from './currentRoleFlowApi'

export function CurrentRoleSummary({ view, onReviewGaps, disabled = false }: { view: RoleFlowView; onReviewGaps: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  const selection = view.selection
  if (!selection && view.progress.state !== 'RESUME') return null
  return <Card className="min-w-0 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Target size={16} aria-hidden="true" /></span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level={2} size="card">{t(selection ? selection.available ? 'upskillingUi.activeRole' : 'roleFlow.previousUnavailable' : 'employeeBaseline.title')}</Heading>
            {selection && <Badge variant={selection.available ? 'secondary' : 'warning'} className={`max-w-full whitespace-normal break-words ${selection.available ? 'border-primary/20 text-primary' : ''}`}>{selection.role.name}{selection.levelId ? ` · ${selection.role.levels.find(level => level.id === selection.levelId)?.name ?? t('initialPathway.state.UNAVAILABLE')}` : ''}</Badge>}
          </div>
          {selection && <Text variant="caption">{selection.role.occupationName}</Text>}
        </div>
      </div>
      {selection && <Button variant="primary" className="h-auto min-h-10 whitespace-normal [&>span]:whitespace-normal" disabled={disabled || !selection.available} onClick={onReviewGaps}>{t('initialPathway.gaps')}</Button>}
    </div>
    <RoleBaselineGate view={view} />
  </Card>
}
