import { useState } from 'react'
import { Target, Layers3 } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentRole } from './currentRoleFlowApi'
import { RoleLevelPicker } from './RoleLevelPicker'

export function CurrentRoleDetailsDialog({ role, selectedLevelId, onClose }: { role: CurrentRole; selectedLevelId?: string; onClose: () => void }) {
  const { t } = useTranslation()
  const levels = [...role.levels].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
  const [previewLevelId, setPreviewLevelId] = useState(levels[0]?.id ?? '')
  // A selected target is pinned by identity, never by its label or the first catalog level.
  const level = levels.find(item => item.id === (selectedLevelId ?? previewLevelId))
  return <Dialog open size="wide" className="max-w-3xl border-primary/20" onOpenChange={open => { if (!open) onClose() }} ariaLabel={t('roleFlow.details')} closeLabel={t('common.close')}>
    <DialogHeader className="-mx-6 -mt-6 border-b border-primary/20 bg-secondary/50 px-6 py-5 pr-14 sm:-mx-7 sm:-mt-7 sm:px-7 sm:pr-14">
      <DialogTitle><Target size={20} className="shrink-0 text-primary" aria-hidden="true" />{role.name}</DialogTitle>
      <DialogDescription className="text-body-sm">{t('roleFlow.details')} · {role.jobPositionName}</DialogDescription>
    </DialogHeader>
    <DialogBody className="space-y-4">
      {!selectedLevelId && levels.length > 1 && <RoleLevelPicker compact levels={levels} value={previewLevelId} onChange={setPreviewLevelId} />}
      {level ? <section className="overflow-hidden rounded-xl border border-border">
        <div className="space-y-2 border-b border-primary/20 bg-secondary/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading level={3} size="card" className="flex items-center gap-2"><Layers3 size={17} className="text-primary" aria-hidden="true" />{level.name}</Heading>
            <div className="flex flex-wrap gap-2">{selectedLevelId && <Badge variant="secondary">{t('roleFlow.selected')}</Badge>}<Badge variant="outline" className="bg-card">{level.skills.length} {t('baselineWizard.skills')}</Badge></div>
          </div>
          {level.context && <Text variant="body-sm">{level.context}</Text>}
        </div>
        <div className="overflow-x-auto scrollbar-hidden"><table className="w-full text-left text-body-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground"><tr><th scope="col" className="px-4 py-2.5 font-semibold">{t('initialPathway.skill')}</th><th scope="col" className="px-4 py-2.5 font-semibold">{t('baselineWizard.knowledgeLevel')}</th></tr></thead>
          <tbody className="divide-y divide-border">{level.skills.map(skill => <tr key={skill.id} className="even:bg-background/60">
            <th scope="row" className="px-4 py-3 font-medium"><span className="break-words">{skill.name}</span>{skill.mandatory && <Text as="span" variant="caption" className="ml-2">· {t('roleFlow.mandatory')}</Text>}</th>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{skill.requiredKnowledgeLevels.map(value => <Badge key={value} variant="secondary" className="border border-primary/20">{t('knowledgeLevel.' + value)}</Badge>)}</div></td>
          </tr>)}</tbody>
        </table></div>
      </section> : <Text role="status">{t('initialPathway.state.UNAVAILABLE')}</Text>}
    </DialogBody>
    <DialogFooter className="border-primary/20"><Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-secondary" onClick={onClose}>{t('common.close')}</Button></DialogFooter>
  </Dialog>
}
