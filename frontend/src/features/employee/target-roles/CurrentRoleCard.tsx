import { Layers, Target } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Heading } from '../../../shared/components/typography/Heading'
import { UpskillingCatalogCard } from './UpskillingCatalogCard'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentRole } from './currentRoleFlowApi'

export function CurrentRoleCard({ role, active, disabled, onDetails, onChoose, layout = 'card' }: {
  role: CurrentRole; active: boolean; disabled: boolean
  onDetails: () => void; onChoose: () => void; layout?: 'card' | 'row'
}) {
  const { t } = useTranslation()
  const skills = new Set(role.levels.flatMap(level => level.skills.map(skill => skill.id))).size
  const actions = <><Button size="sm" variant="primary" disabled={disabled} onClick={onChoose}>{t(active ? 'initialPathway.chooseLevel' : 'roleFlow.choose')}</Button><Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-secondary" aria-label={layout === 'row' ? `${t('roleFlow.details')}: ${role.name}` : t('roleFlow.details')} onClick={onDetails}>{t('upskillingUi.showDetails')}</Button></>
  if (layout === 'row') return <tr className={`bg-card transition-colors hover:bg-muted/20 ${active ? 'ring-1 ring-inset ring-primary/30' : ''}`}>
    <th scope="row" className="break-words px-4 py-4 text-left font-normal"><div className="space-y-2"><Heading level={3} size="card">{role.name}</Heading>{active && <Badge variant="secondary" className="border-primary/20 text-primary">{t('roleFlow.selected')}</Badge>}</div></th>
    <td className="px-4 py-4"><Badge variant="secondary" className="max-w-full whitespace-normal break-words">{role.jobPositionName}</Badge></td>
    <td className="px-4 py-4 text-muted-foreground"><span className="inline-flex items-center gap-1.5 tabular-nums"><Target size={14} aria-hidden="true" />{skills}</span></td>
    <td className="px-4 py-4 text-muted-foreground"><span className="inline-flex items-center gap-1.5 tabular-nums"><Layers size={14} aria-hidden="true" />{role.levels.length}</span></td>
    <td className="px-4 py-4"><div className="flex flex-wrap justify-end gap-2">{actions}</div></td>
  </tr>
  return <UpskillingCatalogCard title={role.name} description={role.scope} active={active}
    badges={<><Badge variant="secondary" className="max-w-full whitespace-normal break-words">{role.jobPositionName}</Badge>{active && <Badge variant="secondary" className="border-primary/20 text-primary">{t('roleFlow.selected')}</Badge>}</>}
    metadata={<><span className="inline-flex items-center gap-1.5"><Target size={14} aria-hidden="true" />{skills} {t('upskillingUi.skillCount')}</span><span className="inline-flex items-center gap-1.5"><Layers size={14} aria-hidden="true" />{role.levels.length} {t('upskillingUi.levels')}</span></>}
    actions={actions} />
}
