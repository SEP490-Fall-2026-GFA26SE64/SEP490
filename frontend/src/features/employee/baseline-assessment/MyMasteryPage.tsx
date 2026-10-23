import { EmployeeAccessNotice } from '../components/EmployeeAccessNotice'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heading } from '../../../shared/components/typography/Heading'
import { History } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { buttonVariants } from '../../../shared/components/ui/Button'
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
  return <WorkspaceLayout><div className="min-w-0 space-y-5 pb-8">
    <Heading level={1} className="sr-only">{tr('myMastery')}</Heading>
    <div className="flex flex-wrap items-center justify-end gap-2"><Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/baseline-assessment"><History size={14} className="mr-2" aria-hidden="true" />{tr('history')}</Link></div>
    {!employeeBaselineEnabled ? <Text variant="body-sm">{t('employeeBaseline.unavailable')}</Text> : profiles.isPending ? <LoadingCard label={t('employeeBaseline.loading')} /> : profiles.isError ? <EmployeeAccessNotice error={profiles.error} message={t('employeeBaseline.requestError')} retrying={profiles.isFetching} onRetry={() => void profiles.refetch()} />
      : profiles.data.length === 0 ? <EmptyState title={tr('empty')} description={tr('emptyHint')} action={<Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} to="/employee/upskilling?tab=roles">{t('upskillingUi.roles')}</Link>} />
        : profiles.data.map(profile => <Card key={profile.occupationId} className="overflow-hidden">
          <CardHeader className="border-b border-border bg-secondary/30 p-5"><div className="flex items-start justify-between gap-3"><Heading level={2} size="subsection" className="break-words">{profile.occupationName}</Heading><MasteryHelp /></div><Text variant="body-sm" tone="foreground">{tr('source')}: {t('employeeBaseline.title')} · {t('roleFlow.baselineVersion')}: {profile.baselineVersion}</Text>
            <Text variant="caption">{tr('updated')}: <time dateTime={profile.initializedAt}>{new Date(profile.initializedAt).toLocaleString(language)}</time></Text></CardHeader>
          <CardContent className="space-y-4 p-5"><Text variant="body-sm">{tr('confidenceHint')}</Text><MasterySkills skills={profile.skills} />
            <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to={attemptPath(profile.attemptId)}>{tr('viewResult')}</Link></CardContent>
        </Card>)}
  </div></WorkspaceLayout>
}
