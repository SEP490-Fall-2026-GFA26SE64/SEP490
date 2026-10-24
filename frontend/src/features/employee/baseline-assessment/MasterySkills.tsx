import { Badge } from '../../../shared/components/ui/Badge'
import { Progress } from '../../../shared/components/ui/Progress'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

export function MasterySkills({ skills }: { skills: { id: string; name: string; mastery: number; confidence: string }[] }) {
  const { t } = useTranslation()
  return <ul className="grid gap-3 lg:grid-cols-2">{skills.map(skill => <li key={skill.id} className="min-w-0 space-y-4 rounded-lg border border-primary/20 bg-card p-4 shadow-2xs">
    <div className="flex flex-wrap justify-between gap-2"><Text variant="body-sm" tone="foreground" className="min-w-0 flex-1 basis-48 break-words font-semibold">{skill.name}</Text><Badge variant="secondary" className="font-bold tabular-nums">{t('baselineUi.mastery')}: {(skill.mastery * 100).toFixed(1)}%</Badge></div>
    <Progress value={skill.mastery * 100} role="progressbar" aria-label={`${t('baselineUi.mastery')}: ${skill.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={skill.mastery * 100} />
    <div className="flex flex-wrap items-center gap-2"><Text variant="caption">{t('baselineUi.confidence')}</Text><Badge variant="outline" className="bg-muted/50">{t('employeeBaseline.' + skill.confidence)}</Badge></div>
  </li>)}</ul>
}
