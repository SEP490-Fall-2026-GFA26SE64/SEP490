import { EmployeeAccessNotice } from '../components/EmployeeAccessNotice'
import { useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heading } from '../../../shared/components/typography/Heading'
import { History, BookOpenCheck, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Text } from '../../../shared/components/typography/Text'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readKnowledgeProfile } from './knowledgeProfileApi'
import { attemptPath, employeeBaselineEnabled } from './baselineApi'

export function MyMasteryPage() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <OwnedKnowledgeProfile key={`${identity?.organizationId ?? ''}:${identity?.accountId ?? ''}:${identity?.roles?.join(',') ?? ''}`} />
}
function OwnedKnowledgeProfile() {
  const { t, language } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const identity = useContext(WorkspaceSessionContext)?.identity
  const [page, setPage] = useState(0)
  const profiles = useQuery({ queryKey: ['knowledge-profile', identity?.organizationId, identity?.accountId, page],
    queryFn: ({ signal }) => readKnowledgeProfile(page, signal), enabled: employeeBaselineEnabled, retry: false })
  return <WorkspaceLayout><div className="min-w-0 space-y-5 pb-8">
    <Heading level={1} className="sr-only">{t('baselineUi.myMastery')}</Heading>
    <Card className="overflow-hidden border-primary/20"><CardHeader className="space-y-2 bg-secondary/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Heading level={2} size="subsection" className="flex items-center gap-2"><BookOpenCheck size={20} className="text-primary" aria-hidden="true" />{t('baselineUi.myMastery')}</Heading><Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2 font-semibold' })} to="/employee/baseline-assessment"><History size={15} aria-hidden="true" />{copy('Assessment history', 'Lịch sử đánh giá')}</Link></div>
    <Text variant="caption">{copy('Diagnostics, official achievements and review needs are recorded separately. A baseline result does not award achievement; a later review need does not revoke an accepted achievement.', 'Kết quả chẩn đoán, thành tích chính thức và yêu cầu ôn tập được ghi riêng. Đánh giá đầu vào không ghi nhận đạt chính thức; yêu cầu ôn tập về sau không thu hồi thành tích đã được chấp nhận.')}</Text>
    </CardHeader></Card>
    {!employeeBaselineEnabled ? <Text variant="body-sm">{t('employeeBaseline.unavailable')}</Text> : profiles.isPending ? <LoadingCard label={t('employeeBaseline.loading')} /> : profiles.isError ? <EmployeeAccessNotice error={profiles.error} message={t('employeeBaseline.requestError')} retrying={profiles.isFetching} onRetry={() => void profiles.refetch()} />
      : profiles.data.items.length === 0 ? <EmptyState title={copy('No knowledge records', 'Chưa có bản ghi kiến thức')} description={copy('Completed assessments and accepted evidence appear here.', 'Kết quả đánh giá hoàn tất và bằng chứng được chấp nhận sẽ xuất hiện tại đây.')} />
        : <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{profiles.data.items.map(item => {
          const positive = item.kind === 'EVIDENCE' || item.kind === 'DIAGNOSTIC' && item.passed === true && !item.vetoTriggered
          const attention = item.kind === 'DIAGNOSTIC' && !positive || item.kind === 'REVIEW' && item.reviewState !== 'RESOLVED'
          return <Card key={`${item.kind}:${item.id}`} className={`flex min-w-0 flex-col overflow-hidden ${positive ? 'border-success/40' : attention ? 'border-warning/50' : 'border-primary/20'}`}>
          <CardHeader className={`space-y-2 border-b p-4 ${positive ? 'border-success/20 bg-success/5' : attention ? 'border-warning/30 bg-warning/5' : 'border-primary/20 bg-secondary/40'}`}>
            <div className="space-y-2"><Heading level={2} size="card" className="break-words">{item.skillName}</Heading><Text variant="caption">{t('knowledgeLevel.' + item.knowledgeLevel)}</Text>
              <div className="flex flex-wrap gap-2"><Badge variant={item.kind === 'EVIDENCE' ? 'success' : item.kind === 'REVIEW' ? item.reviewState === 'RESOLVED' ? 'secondary' : 'warning' : 'outline'}>
                {item.kind === 'EVIDENCE' ? copy('Officially achieved', 'Đạt chính thức') : item.kind === 'REVIEW' ? item.reviewState === 'RESOLVED' ? copy('Review resolved', 'Đã đáp ứng yêu cầu ôn tập') : copy('Needs review', 'Cần ôn tập') : copy('Diagnostic result', 'Kết quả chẩn đoán')}
              </Badge>{item.kind === 'DIAGNOSTIC' && <Badge variant={positive ? 'success' : 'warning'}>{positive ? copy('Group rule met', 'Đáp ứng quy tắc nhóm') : copy('Needs improvement', 'Cần bổ sung')}</Badge>}</div></div>
            <Text variant="caption"><time dateTime={item.observedAt}>{new Date(item.observedAt).toLocaleString(language)}</time></Text>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            {item.kind === 'DIAGNOSTIC' && <>
              <Text variant="body-sm">{item.purpose === 'BASELINE' ? copy('Baseline', 'Đánh giá đầu vào') : copy('Skill Assessment', 'Đánh giá kỹ năng')} · {copy('Correct', 'Số câu đúng')}: {item.correctCount}/{item.totalCount}</Text>
              {item.vetoTriggered && <Text variant="body-sm" tone="destructive">{copy('The configured prerequisite veto requires a full retake.', 'Quy tắc veto tiền đề đã cấu hình yêu cầu làm lại toàn bộ bài.')}</Text>}
            </>}
            {item.kind === 'EVIDENCE' && <Text variant="body-sm">{item.sourceKind === 'CERTIFICATE' ? copy('Source: approved certificate.', 'Nguồn: chứng chỉ đã được duyệt.') : copy('Source: qualifying module completion and skill assessment.', 'Nguồn: hoàn thành module và đánh giá kỹ năng đủ điều kiện.')}</Text>}
            {item.kind === 'REVIEW' && <Text variant="body-sm">{copy('A later prerequisite assessment identified a review need. Your accepted achievement remains recorded.', 'Một lượt đánh giá tiền đề về sau xác định nhu cầu ôn tập. Thành tích đã được chấp nhận vẫn được giữ.')}</Text>}
            <details className="text-body-sm text-muted-foreground"><summary className="cursor-pointer font-medium">{copy('Outcomes', 'Đầu ra')} ({item.outcomeCodes.length})</summary><Text variant="caption" className="mt-2 break-words">{item.outcomeCodes.join(', ')}</Text></details>
            {item.attemptId && <div className="mt-auto flex justify-end border-t border-border pt-3"><Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2 font-semibold' })} to={attemptPath(item.attemptId)}>{copy('View assessment result', 'Xem kết quả đánh giá')}<ArrowUpRight size={14} aria-hidden="true" /></Link></div>}
          </CardContent>
        </Card>})}</div>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" disabled={page === 0 || profiles.isFetching} onClick={() => setPage(value => value - 1)}>{copy('Newer', 'Mới hơn')}</Button>
      <Button variant="outline" size="sm" disabled={!profiles.data?.hasMore || profiles.isFetching || page >= 250} onClick={() => setPage(value => value + 1)}>{copy('Older', 'Cũ hơn')}</Button>
    </div>
    {page === 250 && profiles.data?.hasMore && <Text variant="caption">{copy('This view shows the most recent 5,020 records.', 'Trang này hiển thị tối đa 5.020 bản ghi gần nhất.')}</Text>}
  </div></WorkspaceLayout>
}
