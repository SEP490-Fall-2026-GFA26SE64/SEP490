import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Button } from '../../../shared/components/ui/Button'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Text } from '../../../shared/components/typography/Text'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { readMyMastery } from '../target-roles/currentRoleFlowApi'
import { attemptPath, employeeBaselineEnabled } from './baselineApi'
import { MasterySkills } from './MasterySkills'
import { MasteryHelp } from './MasteryHelp'

export function MyMasteryPage() {
  const { t, language } = useTranslation(), tr = (key: string) => t(`baselineUi.${key}`)
  const profiles = useQuery({ queryKey: ['my-mastery'], queryFn: ({ signal }) => readMyMastery(signal), enabled: employeeBaselineEnabled, retry: false })
  return <WorkspaceLayout><div className="space-y-6 min-w-0">
    <PageHeader title={tr('myMastery')} description={tr('profileIntro')} actions={<Link className="text-primary underline" to="/employee/baseline-assessment">{tr('history')}</Link>} />
    {!employeeBaselineEnabled ? <Text>{t('employeeBaseline.unavailable')}</Text> : profiles.isPending ? <LoadingCard label={t('employeeBaseline.loading')} /> : profiles.isError ? <div role="alert" className="space-y-3"><Text>{t('employeeBaseline.requestError')}</Text><Button variant="outline" onClick={() => void profiles.refetch()}>{t('employeeBaseline.retry')}</Button></div>
      : profiles.data.length === 0 ? <EmptyState title={tr('empty')} description={tr('emptyHint')} action={<Link className="text-primary underline" to="/employee/target-roles">{t('nav.targetRoles')}</Link>} />
        : profiles.data.map(profile => <Card key={profile.occupationId}>
          <CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="break-words">{profile.occupationName}</CardTitle><MasteryHelp /></div><Text variant="body-sm">{tr('source')}: {t('employeeBaseline.title')} · {t('roleFlow.baselineVersion')}: {profile.baselineVersion}</Text>
            <Text variant="caption">{tr('updated')}: <time dateTime={profile.initializedAt}>{new Date(profile.initializedAt).toLocaleString(language)}</time></Text></CardHeader>
          <CardContent className="space-y-4"><Text variant="body-sm">{tr('confidenceHint')}</Text><MasterySkills skills={profile.skills} />
            <Link className="inline-block text-primary underline" to={attemptPath(profile.attemptId)}>{tr('viewResult')}</Link></CardContent>
        </Card>)}
  </div></WorkspaceLayout>
}
