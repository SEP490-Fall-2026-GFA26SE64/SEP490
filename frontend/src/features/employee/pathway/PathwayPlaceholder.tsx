import { Flag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import '../components/EmployeeRequirementGraph.css'

/** The same graph/timeline shell, without inventing requirement or progress data. */
export function PathwayPlaceholder({ target, children }: { target?: { roleName: string; levelName: string | null } | null; children: ReactNode }) {
  const { t } = useTranslation()
  return <div className="employee-requirement-graph"><div className="employee-pathway-layout">
    <div className="employee-pathway-graph-pane"><div className="employee-graph-viewport p-6" role="region" aria-label={t('pathway.interactiveRoadmap')} tabIndex={0}>
      {target && <div className="employee-graph-role"><Text variant="eyebrow" className="employee-graph-type justify-center"><Flag className="size-5" aria-hidden="true" />{t('initialPathway.targetRole')}</Text><Heading level={2} size="subsection">{target.roleName}</Heading>{target.levelName && <Text variant="body-sm">{target.levelName}</Text>}</div>}
    </div></div>
    <aside className="employee-pathway-timeline" aria-label={t('pathway.adaptiveTimeline')}><section className="space-y-3 rounded-xl border border-border bg-card p-4"><Heading level={2} size="card">{t('pathway.adaptiveTimeline')}</Heading>{children}</section></aside>
  </div></div>
}
