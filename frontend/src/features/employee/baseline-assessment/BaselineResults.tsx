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
      <Heading level={2} size="subsection" className="break-words">{copy('Result: ', 'Kết quả: ')}{result.roleName} · {result.levelName}</Heading>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{result.purpose === 'BASELINE' ? copy('Baseline', 'Đánh giá đầu vào') : copy('Skill Assessment', 'Đánh giá kỹ năng')}</Badge><Badge variant={sufficient ? 'success' : 'warning'}>{sufficient ? copy('Group rules met', 'Đáp ứng quy tắc các nhóm') : copy('Needs improvement', 'Cần bổ sung')}</Badge></div>
    </CardHeader>
    <CardContent className="space-y-4 p-5">
      <Text variant="body-sm" className="text-muted-foreground">{result.purpose === 'BASELINE'
        ? copy('These diagnostics cover only the skill levels assessed. A baseline result does not award official achievement.', 'Kết quả chẩn đoán chỉ gồm các kỹ năng–mức đã được hỏi. Đánh giá đầu vào không ghi nhận đạt chính thức.')
        : copy('Official achievement also requires compatible learning completion and all prerequisite conditions. A passing group alone does not award achievement.', 'Đạt chính thức còn cần hoàn thành phần học phù hợp và đủ điều kiện tiền đề. Đạt một nhóm câu hỏi chưa tự động ghi nhận thành tích.')}</Text>
      {result.purpose === 'SKILL_ASSESSMENT' && <Text variant="body-sm">{t('rulePathway.supplementHelp')}</Text>}
      <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3"><dt className="text-muted-foreground">{copy('Started', 'Bắt đầu')}</dt><dd className="mt-1 font-semibold"><time dateTime={result.startedAt}>{new Date(result.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></dd></div>
        <div className="rounded-lg border border-border bg-muted/30 p-3"><dt className="text-muted-foreground">{copy('Finished', 'Kết thúc')}</dt><dd className="mt-1 font-semibold"><time dateTime={result.finishedAt}>{new Date(result.finishedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></dd></div>
      </dl>
      <Text variant="body-sm">{result.finishReason === 'DEADLINE' ? copy('The time limit ended. Unanswered questions scored zero.', 'Đã hết giờ làm bài. Câu bỏ trống được tính 0 điểm.') : copy('Your answers were submitted.', 'Câu trả lời đã được nộp.')}</Text>
      <div className="space-y-3">{result.groups.map(group => {
        const score = result.results.find(r => r.groupId === group.id)!
        return <section key={group.id} className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><Heading level={3} size="card">{group.skillName} · {t('knowledgeLevel.' + group.requirement.knowledgeLevel)}</Heading><Badge variant={score.passed && !score.vetoTriggered ? 'success' : 'warning'}>{score.passed && !score.vetoTriggered ? copy('Group rule met', 'Đáp ứng quy tắc nhóm') : copy('Needs improvement', 'Cần bổ sung')}</Badge></div>
          <Text variant="body-sm">{copy('Correct: ', 'Số câu đúng: ')}{score.correctCount}/{score.totalCount} · {copy('Required: ', 'Yêu cầu: ')}{group.requiredCorrectCount}</Text>
          {group.mandatoryRequired && <Text variant="body-sm">{score.mandatorySatisfied ? copy('All mandatory questions were correct.', 'Đã đúng tất cả câu bắt buộc.') : copy('Mandatory questions need supplementation.', 'Cần bổ sung phần câu hỏi bắt buộc.')}</Text>}
          {score.vetoTriggered && <Text variant="body-sm" tone="destructive">{copy('All prerequisite answers were wrong. The configured rule blocks the main result; a full retake is required.', 'Sai toàn bộ câu tiền đề. Quy tắc đã cấu hình chặn kết quả chính; cần làm lại toàn bộ bài.')}</Text>}
        </section>
      })}</div>
      <Text variant="body-sm" className="text-muted-foreground">{copy('Retake timing and limits follow your organization policy. Each retake includes a new complete paper.', 'Thời điểm và số lượt làm lại theo cấu hình của tổ chức. Mỗi lượt dùng một đề mới đầy đủ nhóm.')}</Text>
      {result.previousAttemptId && <Link className="block text-primary underline" to={attemptPath(result.previousAttemptId)}>{copy('Previous attempt', 'Lượt làm trước')}</Link>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" disabled={locked} onClick={() => void run(startCommand(result.target, result.purpose, result.id))}>{copy('Retake assessment', 'Làm lại bài đánh giá')}</Button>
        {result.purpose === 'SKILL_ASSESSMENT' && <Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2' })} to="/employee/pathway?view=role"><ArrowLeft size={15} aria-hidden="true" />{copy('Back to pathway', 'Trở về lộ trình')}</Link>}
        {result.purpose === 'BASELINE' && <RolePathwayRequest key={result.target.selectionId} selectionId={result.target.selectionId} disabled={locked} />}
      </div>
      {error && <Text role="alert" variant="body-sm" tone="destructive" className="rounded-md border border-destructive/30 bg-destructive/5 p-3">{t('employeeBaseline.errors.' + error.code, t('employeeBaseline.requestError'))}</Text>}
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
