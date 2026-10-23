import { Progress } from '../../../shared/components/ui/Progress'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

export function MasterySkills({ skills }: { skills: { id: string; name: string; mastery: number; confidence: string }[] }) {
  const { t } = useTranslation()
  return <ul className="grid gap-3 lg:grid-cols-2">{skills.map(skill => <li key={skill.id} className="space-y-3 rounded-lg border border-border p-4">
    <div className="flex flex-wrap justify-between gap-2"><Text className="min-w-0 break-words font-semibold">{skill.name}</Text><Text>{t('baselineUi.mastery')}: {(skill.mastery * 100).toFixed(1)}%</Text></div>
    <Progress value={skill.mastery * 100} role="progressbar" aria-label={`${t('baselineUi.mastery')}: ${skill.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={skill.mastery * 100} />
    <Text variant="caption" className="text-muted-foreground">{t('baselineUi.confidence')}: {t(`employeeBaseline.${skill.confidence}`)}</Text>
  </li>)}</ul>
}
