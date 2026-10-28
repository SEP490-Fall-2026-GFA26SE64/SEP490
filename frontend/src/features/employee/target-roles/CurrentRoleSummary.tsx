import { useId, useState } from 'react'
import { ChevronDown, Target } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card } from '../../../shared/components/ui/Card'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { RoleBaselineGate } from './RoleBaselineGate'
import type { RoleFlowView } from './currentRoleFlowApi'

export function CurrentRoleSummary({ view }: { view: RoleFlowView }) {
  const { t, language } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const selection = view.selection
  if (view.progress.state === 'LEGACY_SELECTION_REQUIRES_RESELECTION') {
    return <Card className="p-5"><Text role="status">{t('roleFlow.legacySelection')}</Text></Card>
  }
  if (!selection && view.progress.state !== 'RESUME') return null
  return <Card className="min-w-0 overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Target size={16} aria-hidden="true" /></span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level={2} size="card">{t(selection ? selection.available ? 'upskillingUi.activeRole' : 'roleFlow.previousUnavailable' : 'employeeBaseline.title')}</Heading>
            {selection && <Badge variant={selection.available ? 'success' : 'warning'} className="max-w-full whitespace-normal break-words">{selection.role.name}</Badge>}
          </div>
          {selection && <Text variant="caption">{selection.role.occupationName}</Text>}
        </div>
      </div>
      {selection && <Button variant="ghost" size="sm" className="shrink-0" aria-label={t('upskillingUi.showDetails')} aria-expanded={expanded} aria-controls={id}
        onClick={() => setExpanded(value => !value)}><ChevronDown size={16} aria-hidden="true" className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} /></Button>}
    </div>
    {selection && <div id={id} hidden={!expanded} className="space-y-2 border-t border-border px-5 py-4">
      {!selection.available && <Text variant="body-sm" role="status">{t('roleFlow.previousUnavailable')}</Text>}
      <Text variant="body-sm" className="whitespace-pre-wrap break-words">{selection.role.scope}</Text>
      <Text variant="caption">{t('roleFlow.selectedAt')}: <time dateTime={selection.selectedAt}>{new Date(selection.selectedAt).toLocaleString(language)}</time></Text>
    </div>}
    {/* Keep the command hook mounted when summary details collapse. */}
    <RoleBaselineGate view={view} />
  </Card>
}
