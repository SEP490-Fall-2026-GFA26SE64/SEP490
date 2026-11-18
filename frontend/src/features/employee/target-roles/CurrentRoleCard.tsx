import { Layers, Target } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { UpskillingCatalogCard } from './UpskillingCatalogCard'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentRole } from './currentRoleFlowApi'

export function CurrentRoleCard({ role, active, disabled, onDetails, onChoose }: {
  role: CurrentRole; active: boolean; disabled: boolean
  onDetails: () => void; onChoose: () => void
}) {
  const { t } = useTranslation()
  const skills = new Set(role.levels.flatMap(level => level.skills.map(skill => skill.id))).size
  return <UpskillingCatalogCard title={role.name} description={role.scope} active={active}
    badges={<><Badge variant="secondary" className="max-w-full whitespace-normal break-words">{role.jobPositionName}</Badge>{active && <Badge variant="secondary" className="border-primary/20 text-primary">{t('roleFlow.selected')}</Badge>}</>}
    metadata={<><span className="inline-flex items-center gap-1.5"><Target size={14} aria-hidden="true" />{skills} {t('upskillingUi.skillCount')}</span><span className="inline-flex items-center gap-1.5"><Layers size={14} aria-hidden="true" />{role.levels.length} {t('upskillingUi.levels')}</span></>}
    actions={<><Button size="sm" variant="primary" disabled={disabled} onClick={onChoose}>{t(active ? 'initialPathway.chooseLevel' : 'roleFlow.choose')}</Button><Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-secondary" aria-label={t('roleFlow.details')} onClick={onDetails}>{t('upskillingUi.showDetails')}</Button></>} />
}
