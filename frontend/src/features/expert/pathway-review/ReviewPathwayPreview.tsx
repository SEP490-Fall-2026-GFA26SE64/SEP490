import { useState } from 'react'
import type { PathwayView, ReviewDetail } from '../../../shared/api/initialPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InteractiveRoleRoadmap } from '../../employee/components/InteractiveRoleRoadmap'
import { AdaptivePathwayTimeline } from '../../employee/components/AdaptivePathwayTimeline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { Badge } from '../../../shared/components/ui/Badge'
import { Text } from '../../../shared/components/typography/Text'
import { GitFork, ListOrdered } from 'lucide-react'

/** Presentation of the authorized Expert snapshot. No Employee API or learning access is used. */
export function ReviewPathwayPreview({ detail }: { detail: ReviewDetail }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key)
  const [tab, setTab] = useState('roadmap'), { summary, revision } = detail
  const pathway: PathwayView = {
    status: { requestId: summary.id, generationStatus: 'SUCCEEDED', reviewStatus: summary.reviewStatus,
      validationStatus: summary.validationStatus, displayState: 'PREVIEW', reasonCode: null,
      revision: summary.revision, revisionContentHash: summary.contentHash, roleName: summary.roleName, levelName: summary.levelName },
    archived: false, baseline: detail.gaps,
    modules: [...revision.plan.modules].sort((a, b) => a.ordinal - b.ordinal).map(module => ({ module, accessState: 'PREVIEW', reasonCode: null, entry: null })),
    dependencies: revision.plan.dependencies.map(gate => ({ ...gate, internal: Boolean(gate.internalGateId) })),
  }
  const quality = revision.plan.quality
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-secondary/50 p-4">
      <Badge variant="secondary">{tr('reviewFlow.draft')}</Badge><Text className="font-semibold">{summary.roleName} · {summary.levelName}</Text>
      <Text variant="caption">{tr('reviewRevision')}: {summary.revision}</Text>
    </div>
    <Text variant="body-sm">{tr('reviewFlow.previewHelp')}</Text>
    {quality && <div className="flex flex-wrap gap-4"><Text variant="body-sm">{tr('moduleCount')}: {quality.moduleCount}</Text><Text variant="body-sm">{tr('totalDuration')}: {quality.durationMinutes.toLocaleString(language)} {tr('duration')}</Text><Text variant="body-sm">{tr('totalPrice')}: {quality.priceVnd.toLocaleString(language)} {tr('price')}</Text></div>}
    {revision.plan.modules.some(module => module.targets.some(target => target.expertAttention)) && <div className="rounded-lg border border-warning/60 bg-warning/10 p-3" role="note"><Text variant="body-sm">{tr('reviewFlow.warningHelp')}</Text></div>}
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 h-auto max-w-full flex-wrap"><TabsTrigger value="roadmap"><GitFork className="mr-1.5 size-4" />{t('pathway.interactiveRoadmap')}</TabsTrigger><TabsTrigger value="timeline"><ListOrdered className="mr-1.5 size-4" />{t('pathway.adaptiveTimeline')}</TabsTrigger></TabsList>
      <TabsContent value="roadmap"><InteractiveRoleRoadmap pathway={pathway} /></TabsContent>
      <TabsContent value="timeline"><AdaptivePathwayTimeline pathway={pathway} /></TabsContent>
    </Tabs>
  </div>
}
