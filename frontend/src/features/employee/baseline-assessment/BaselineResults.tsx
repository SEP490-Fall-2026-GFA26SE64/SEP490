import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, RefreshCw, ArrowUpRight, ArrowLeft } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath, readHistory, readModuleHistory, startCommand, type BaselineAttempt, type BaselineCommand, type BaselineResult, type BaselineError } from './baselineApi'
import { RolePathwayRequest } from '../target-roles/RolePathwayRequest'

export function BaselineResultPanel({ result, locked, run, error }: { result: BaselineResult; error?: BaselineError | null; locked: boolean; run: (command: BaselineCommand) => Promise<void> }) {
  const { t, language } = useTranslation(), vi = language === 'vi', copy = (en: string, vn: string) => vi ? vn : en
  const sufficient = result.results.every(g => g.passed && !g.vetoTriggered)
  return <Card className={sufficient ? 'overflow-hidden border-success/40' : 'overflow-hidden border-warning/50'}>
    <CardHeader className={sufficient ? 'border-b border-success/20 bg-success/5 p-5' : 'border-b border-warning/30 bg-warning/5 p-5'}>
      <Text variant="eyebrow">{copy('Assessment result', 'Kết quả đánh giá')}</Text>
      <Heading level={2} size="subsection" className="break-words">{result.roleName} · {result.levelName}</Heading>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{result.purpose === 'BASELINE' ? copy('Baseline', 'Đánh giá đầu vào') : copy('Skill Assessment', 'Đánh giá kỹ năng')}</Badge><Badge variant={sufficient ? 'success' : 'warning'}>{sufficient ? copy('All skills passed', 'Đạt tất cả kỹ năng') : copy('Not all skills passed', 'Chưa đạt tất cả kỹ năng')}</Badge></div>
    </CardHeader>
    <CardContent className="space-y-6 p-5">
      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <Heading level={3} size="card">{copy('Attempt details', 'Thông tin lượt làm')}</Heading>
      <dl className="grid gap-4 text-body-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">{copy('Started', 'Bắt đầu')}</dt><dd className="mt-1 font-semibold"><time dateTime={result.startedAt}>{new Date(result.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></dd></div>
        <div><dt className="text-muted-foreground">{copy('Finished', 'Kết thúc')}</dt><dd className="mt-1 font-semibold"><time dateTime={result.finishedAt}>{new Date(result.finishedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></dd></div>
      </dl>
      <Text variant="body-sm" className="border-t border-border pt-3">{result.finishReason === 'DEADLINE' ? copy('Time expired. Unanswered questions received no points.', 'Hết giờ. Câu chưa trả lời không được tính điểm.') : copy('Submitted by you.', 'Bạn đã nộp bài.')}</Text>
      </section>
      <section className="space-y-3">
      <Heading level={3} size="card">{copy('Results by skill', 'Kết quả từng kỹ năng')}</Heading>
      {result.groups.map(group => {
        const score = result.results.find(r => r.groupId === group.id)!
        const passed = score.passed && !score.vetoTriggered
        return <section key={group.id} className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1">
            <Text variant="eyebrow">{group.role === 'PREREQUISITE' ? copy('Prerequisite skill', 'Kỹ năng tiên quyết') : copy('Assessed skill', 'Kỹ năng được đánh giá')}</Text>
            <Heading level={4} size="card">{group.skillName}</Heading>
            <Text variant="caption">{copy('Knowledge level: ', 'Mức kiến thức: ')}{t('knowledgeLevel.' + group.requirement.knowledgeLevel)}</Text>
          </div><Badge variant={passed ? 'success' : 'warning'}>{passed ? copy('Passed', 'Đạt') : copy('Not passed', 'Chưa đạt')}</Badge></div>
          <dl className="grid gap-4 rounded-lg bg-muted/30 p-3 text-body-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">{copy('Correct answers', 'Số câu trả lời đúng')}</dt><dd className="mt-1 font-semibold">{score.correctCount} / {score.totalCount}</dd></div>
            <div><dt className="text-muted-foreground">{copy('Minimum correct answers', 'Số câu đúng tối thiểu')}</dt><dd className="mt-1 font-semibold">{group.requiredCorrectCount} / {score.totalCount}</dd></div>
          </dl>
          {(group.mandatoryRequired || !passed) && <div className="space-y-2 border-t border-border pt-3">
            <Text variant="caption" className="font-semibold text-foreground">{copy('Passing conditions', 'Điều kiện đạt')}</Text>
            {score.correctCount < group.requiredCorrectCount && <Text variant="body-sm">{copy('The number of correct answers is below the minimum.', 'Số câu trả lời đúng chưa đủ mức tối thiểu.')}</Text>}
            {group.mandatoryRequired && <Text variant="body-sm">{score.mandatorySatisfied ? copy('Mandatory questions: all answered correctly.', 'Câu điểm liệt: đã trả lời đúng tất cả.') : copy('Mandatory questions: at least one was incorrect or unanswered. All must be correct, even if you meet the minimum score.', 'Câu điểm liệt: có ít nhất một câu sai hoặc chưa trả lời. Phải đúng tất cả câu điểm liệt, kể cả khi đã đủ số câu đúng tối thiểu.')}</Text>}
            {score.vetoTriggered && <Text variant="body-sm" tone="destructive">{copy('No prerequisite answers were correct. This blocks the main skill result; retake the full assessment.', 'Không trả lời đúng câu tiên quyết nào. Điều này chặn kết quả kỹ năng chính; cần làm lại toàn bộ bài.')}</Text>}
          </div>}
        </section>
      })}
      </section>
      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <Heading level={3} size="card">{copy('What this result means', 'Ý nghĩa kết quả')}</Heading>
      <Text variant="body-sm">{result.purpose === 'BASELINE'
        ? copy('This baseline shows your results for the skill levels assessed. It does not mark pathway requirements as met.', 'Đánh giá đầu vào cho biết kết quả ở các mức kỹ năng được hỏi; chưa công nhận hoàn thành yêu cầu lộ trình.')
        : copy('Passing the assessment is one condition. To meet the pathway requirement, you must also complete the matching learning content and prerequisite requirements.', 'Đạt bài đánh giá là một điều kiện. Để hoàn thành yêu cầu lộ trình, bạn còn cần học xong nội dung phù hợp và đáp ứng các yêu cầu tiên quyết.')}</Text>
      {result.purpose === 'SKILL_ASSESSMENT' && <Text variant="body-sm">{copy('Prerequisite learning already added to your pathway remains required after a retake. You can continue learning a requirement you have already started.', 'Phần học tiên quyết đã được thêm vào lộ trình vẫn cần hoàn thành sau khi làm lại bài. Bạn có thể tiếp tục yêu cầu đã bắt đầu học.')}</Text>}
      </section>
      <section className="space-y-3">
      <Heading level={3} size="card">{copy('Next steps', 'Bước tiếp theo')}</Heading>
      <Text variant="body-sm" className="text-muted-foreground">{copy('Retake timing and limits follow your organization policy. Each retake includes a new complete paper.', 'Thời điểm và số lượt làm lại theo cấu hình của tổ chức. Mỗi lượt dùng một đề mới đầy đủ nhóm.')}</Text>
      {result.previousAttemptId && <Link className="block text-primary underline" to={attemptPath(result.previousAttemptId)}>{copy('Previous attempt', 'Lượt làm trước')}</Link>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" disabled={locked} onClick={() => void run(startCommand(result.target, result.purpose, result.id))}>{copy('Retake assessment', 'Làm lại bài đánh giá')}</Button>
        {result.purpose === 'SKILL_ASSESSMENT' && <Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2' })} to="/employee/pathway?view=role"><ArrowLeft size={15} aria-hidden="true" />{copy('Back to pathway', 'Trở về lộ trình')}</Link>}
        {result.purpose === 'BASELINE' && <RolePathwayRequest key={result.target.selectionId} selectionId={result.target.selectionId} disabled={locked} />}
      </div>
      {error && <Text role="alert" variant="body-sm" tone="destructive" className="rounded-md border border-destructive/30 bg-destructive/5 p-3">{t('employeeBaseline.errors.' + error.code, t('employeeBaseline.requestError'))}</Text>}
      </section>
    </CardContent>
  </Card>
}
export interface ModuleHistoryScope { moduleId: string; moduleRevision: number; title: string }
export function BaselineHistory({ module }: { module?: ModuleHistoryScope } = {}) {
  const session = useContext(WorkspaceSessionContext), identity = session?.identity
  return <OwnedBaselineHistory key={(identity?.organizationId ?? '') + ':' + (identity?.accountId ?? '') + ':' + (module?.moduleId ?? '') + ':' + (module?.moduleRevision ?? '')} module={module} />
}
function OwnedBaselineHistory({ module }: { module?: ModuleHistoryScope }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('employeeBaseline.' + key), vi = language === 'vi'
  const moduleId = module?.moduleId, moduleRevision = module?.moduleRevision
  const [items, setItems] = useState<BaselineAttempt[]>([]), [error, setError] = useState(false), [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  const [page, setPage] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void (moduleId && moduleRevision !== undefined ? readModuleHistory(moduleId, moduleRevision, controller.signal, page) : readHistory(controller.signal, page)).then(value => { if (!controller.signal.aborted) setItems(value) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload, page, moduleId, moduleRevision])
  return <Card className="overflow-hidden border-primary/20"><CardHeader className="border-b border-primary/20 bg-secondary/40 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Heading level={2} size="card" className="flex items-center gap-2"><History size={17} className="text-primary" aria-hidden="true" />{module ? (vi ? 'Lịch sử đánh giá: ' : 'Assessment history: ') + module.title : tr('history')}</Heading>
    <Button variant="primary" size="sm" className="font-semibold" disabled={loading} leftIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => { setLoading(true); setError(false); setItems([]); setReload(value => value + 1) }}>{tr('refresh')}</Button></div></CardHeader><CardContent className="space-y-3 p-5">
    {loading ? <LoadingCard label={tr('loading')} /> : error ? <Text variant="body-sm" tone="destructive" role="alert">{tr('historyError')}</Text> : items.length === 0 ? <EmptyState bordered={false} title={module ? (vi ? 'Chưa có lượt đánh giá cho module này' : 'No assessments for this module yet') : tr('emptyHistory')} description={module ? undefined : tr('historyEmptyHint')}
      action={<Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/upskilling?tab=roles">{tr('backToStart')}</Link>} />
      : <ul className="space-y-3">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background/60 p-4"><div className="min-w-0 space-y-2">
        <Link className="break-words font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline" to={attemptPath(item.id)}>{item.roleName} · {item.levelName}</Link>
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{item.purpose === 'BASELINE' ? (vi ? 'Đánh giá đầu vào' : 'Baseline') : (vi ? 'Đánh giá kỹ năng' : 'Skill Assessment')}</Badge><Badge variant={item.state === 'IN_PROGRESS' ? 'warning' : 'success'}>{item.state === 'IN_PROGRESS' ? (vi ? 'Đang làm' : 'In progress') : (vi ? 'Đã kết thúc' : 'Finished')}</Badge></div>
        <Text variant="caption" className="text-muted-foreground"><time dateTime={item.finishedAt ?? item.startedAt}>{new Date(item.finishedAt ?? item.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></Text>
      </div><Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2 font-semibold' })} to={attemptPath(item.id)}>{t('baselineUi.viewResult')}<ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}</ul>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" disabled={loading || page === 0} onClick={() => { setLoading(true); setError(false); setPage(value => value - 1) }}>{vi ? 'Mới hơn' : 'Newer'}</Button>
      <Button variant="outline" disabled={loading || items.length < 20} onClick={() => { setLoading(true); setError(false); setPage(value => value + 1) }}>{vi ? 'Cũ hơn' : 'Older'}</Button></div>
  </CardContent></Card>
}
