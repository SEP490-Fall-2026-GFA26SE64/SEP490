import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, RefreshCw, ArrowUpRight, ArrowLeft } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath, readHistory, readModuleHistory, startCommand, type BaselineAttempt, type BaselineCommand, type BaselineResult, type BaselineError } from './baselineApi'
import { RolePathwayRequest } from '../target-roles/RolePathwayRequest'

export function BaselineResultPanel({ result, locked, run, error }: { result: BaselineResult; error?: BaselineError | null; locked: boolean; run: (command: BaselineCommand) => Promise<void> }) {
  const { t, language } = useTranslation(), vi = language === 'vi', copy = (en: string, vn: string) => vi ? vn : en
  const skills = [...new Set(result.groups.map(group => group.requirement.skillId))].map(id => {
    const groups = result.groups.filter(group => group.requirement.skillId === id).map(group => ({ group, score: result.results.find(score => score.groupId === group.id) }))
    return { id, name: groups[0].group.skillName, groups, passed: groups.every(({ score }) => score?.passed && !score.vetoTriggered) }
  })
  const passedSkills = skills.filter(skill => skill.passed).length
  const passedGroups = result.groups.filter(group => result.results.some(score => score.groupId === group.id && score.passed && !score.vetoTriggered)).length
  const sufficient = skills.length > 0 && passedSkills === skills.length
  const mainGroup = result.groups.find(group => group.role === 'MAIN'), mainScore = result.results.find(score => score.groupId === mainGroup?.id)
  const outcome = result.purpose === 'BASELINE' ? null : mainScore && !mainScore.passed ? copy('MAIN group not passed', 'Nhóm MAIN chưa đạt')
    : result.results.some(score => score.vetoTriggered) ? copy('Prerequisite veto · retake required', 'Veto từ nhóm tiên quyết · cần thi lại')
    : !sufficient ? copy('MAIN passed · foundation requirements not met', 'MAIN đạt · chưa đủ yêu cầu nền tảng') : copy('Assessment passed · achievement conditions are checked separately', 'Đánh giá đạt · xét riêng điều kiện công nhận')
  return <Card className={sufficient ? 'overflow-hidden border-success/40' : 'overflow-hidden border-warning/50'}>
    <CardHeader className={sufficient ? 'border-b border-success/20 bg-success/5 p-5' : 'border-b border-warning/30 bg-warning/5 p-5'}>
      <Text variant="eyebrow">{copy('Assessment result', 'Kết quả đánh giá')}</Text>
      <Heading level={2} size="subsection" className="break-words">{result.target.selectionId ? `${result.roleName} · ${result.levelName}` : result.groups.find(g => g.role === 'MAIN')?.skillName}</Heading>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{result.purpose === 'BASELINE' ? copy('Baseline', 'Đánh giá đầu vào') : copy('Skill Assessment', 'Đánh giá kỹ năng')}</Badge><Badge variant={sufficient ? 'success' : 'warning'}>{sufficient ? copy('All skills passed', 'Đạt tất cả kỹ năng') : copy('Not all skills passed', 'Chưa đạt tất cả kỹ năng')}</Badge></div>
    </CardHeader>
    <CardContent className="space-y-4 p-4 sm:p-5">
      {result.purpose === 'BASELINE' && <Text role="status" className="font-semibold">{copy(`Baseline: passed ${passedGroups}/${result.groups.length} · ${result.groups.length - passedGroups} groups not passed`, `Baseline: đạt ${passedGroups}/${result.groups.length} · ${result.groups.length - passedGroups} nhóm chưa đạt`)}</Text>}
      {outcome && <div role="status" className="space-y-2 rounded-lg border border-border bg-muted/20 p-3"><Text tone="foreground" className="font-semibold">{outcome}</Text>{!sufficient && <Text variant="body-sm">{copy('Group scores and content completion are retained. Missing foundations require accepted evidence before a new assessment; this result does not award MAIN achievement.', 'Điểm từng nhóm và tiến độ học được giữ nguyên. Hoàn thành phần bổ sung rồi thi lại phần chính; điểm cũ không tự được công nhận.')}</Text>}</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard className="[&>div]:p-3 sm:[&>div]:p-4" variant="gradient" title={copy('Skills passed', 'Kỹ năng đạt')} value={`${passedSkills} / ${skills.length}`} />
        <StatCard title={copy('Skills not passed', 'Kỹ năng chưa đạt')} value={skills.length - passedSkills} />
        <StatCard className="col-span-2 [&>div]:p-3 sm:col-span-1 sm:[&>div]:p-4" title={copy('Knowledge groups passed', 'Nhóm kiến thức đạt')} value={`${passedGroups} / ${result.groups.length}`} />
      </div>
      <div role="region" aria-label={copy('Results by skill', 'Kết quả từng kỹ năng')} tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full table-fixed text-left text-body-sm sm:table-auto"><caption className="sr-only">{copy('Results by skill and required knowledge level', 'Kết quả theo kỹ năng và mức kiến thức yêu cầu')}</caption>
          <thead className="border-b border-border bg-muted/40"><tr>{[copy('Skill', 'Kỹ năng'), copy('Required levels', 'Mức kiến thức yêu cầu')].map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold sm:px-4">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{skills.map(skill => <tr key={skill.id}>
            <th scope="row" className="max-w-sm break-words px-3 py-3 align-top font-normal sm:px-4"><span className="font-semibold">{skill.name}</span><div className="mt-1"><Badge variant={skill.passed ? 'success' : 'warning'}>{skill.passed ? copy('Passed', 'Đạt') : copy('Not passed', 'Chưa đạt')}</Badge></div>
              <details className="mt-2"><summary className="cursor-pointer text-caption text-primary">{copy('Score details', 'Chi tiết điểm')}</summary><div className="mt-2 space-y-3">{skill.groups.map(({ group, score }) => <div key={group.id} className="space-y-1 text-caption">
                <Text variant="caption" className="font-semibold text-foreground">{t('knowledgeLevel.' + group.requirement.knowledgeLevel)}{group.role === 'PREREQUISITE' ? group.requirement.skillId === mainGroup?.requirement.skillId ? copy(' · Lower level of the same skill', ' · Mức thấp hơn cùng kỹ năng') : copy(' · Prerequisite skill', ' · Kỹ năng tiên quyết khác') : group.role === 'MAIN' ? ' · MAIN' : ''}</Text>
                <Text variant="caption">{copy('Correct', 'Đúng')}: {score?.correctCount ?? '—'} / {score?.totalCount ?? group.totalCount} · {copy('Required', 'Cần đạt')}: {group.requiredCorrectCount} / {score?.totalCount ?? group.totalCount}</Text>
                {group.mandatoryRequired && <Text variant="caption">{score?.mandatorySatisfied ? copy('All mandatory questions passed.', 'Đạt tất cả câu điểm liệt.') : copy('Mandatory questions not satisfied.', 'Chưa đạt điều kiện câu điểm liệt.')}</Text>}
                {score?.vetoTriggered && <Text variant="caption" tone="destructive">{copy('Prerequisite veto: retake required.', 'Điều kiện chặn từ nhóm tiên quyết: cần làm lại bài.')}</Text>}
              </div>)}</div></details>
            </th>
            <td className="px-3 py-3 align-top sm:px-4"><div className="flex flex-col items-start gap-2">{skill.groups.map(({ group, score }) => <Badge className="max-w-full whitespace-normal" key={group.id} variant={score?.passed && !score.vetoTriggered ? 'success' : 'warning'}>{t('knowledgeLevel.' + group.requirement.knowledgeLevel)} · {score?.passed && !score.vetoTriggered ? copy('Passed', 'Đạt') : copy('Not passed', 'Chưa đạt')}</Badge>)}</div></td>
          </tr>)}</tbody>
        </table>
      </div>
      <details className="rounded-lg bg-muted/20 px-3 py-2 text-caption"><summary className="cursor-pointer text-muted-foreground">{copy('Attempt details', 'Thông tin lượt làm')} · {new Date(result.finishedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</summary><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt>{copy('Started', 'Bắt đầu')}</dt><dd><time dateTime={result.startedAt}>{new Date(result.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></dd></div><div><dt>{copy('Finished', 'Kết thúc')}</dt><dd><time dateTime={result.finishedAt}>{new Date(result.finishedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></dd></div></dl><Text variant="caption" className="mt-2">{result.finishReason === 'DEADLINE' ? copy('Time expired. Unanswered questions received no points.', 'Hết giờ. Câu chưa trả lời không được tính điểm.') : copy('Submitted by you.', 'Bạn đã nộp bài.')}</Text></details>
      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <Heading level={3} size="card">{copy('What this result means', 'Ý nghĩa kết quả')}</Heading>
      <Text variant="body-sm">{result.purpose === 'BASELINE'
        ? copy('The total includes assessed groups only. Certificate requirements are separate and are not included.', 'Tổng số chỉ gồm các nhóm được thi. Yêu cầu chứng chỉ được xét riêng, không nằm trong tổng này.')
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
        {result.purpose === 'BASELINE' && result.target.selectionId && <RolePathwayRequest key={result.target.selectionId} selectionId={result.target.selectionId} disabled={locked} />}
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
        <Link className="break-words font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline" to={attemptPath(item.id)}>{item.target.selectionId ? `${item.roleName} · ${item.levelName}` : item.groups.find(g => g.role === 'MAIN')?.skillName}</Link>
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{item.purpose === 'BASELINE' ? (vi ? 'Đánh giá đầu vào' : 'Baseline') : (vi ? 'Đánh giá kỹ năng' : 'Skill Assessment')}</Badge><Badge variant={item.state === 'IN_PROGRESS' ? 'warning' : 'success'}>{item.state === 'IN_PROGRESS' ? (vi ? 'Đang làm' : 'In progress') : (vi ? 'Đã kết thúc' : 'Finished')}</Badge></div>
        <Text variant="caption" className="text-muted-foreground"><time dateTime={item.finishedAt ?? item.startedAt}>{new Date(item.finishedAt ?? item.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></Text>
      </div><Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2 font-semibold' })} to={attemptPath(item.id)}>{t('baselineUi.viewResult')}<ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}</ul>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" disabled={loading || page === 0} onClick={() => { setLoading(true); setError(false); setPage(value => value - 1) }}>{vi ? 'Mới hơn' : 'Newer'}</Button>
      <Button variant="outline" disabled={loading || items.length < 20} onClick={() => { setLoading(true); setError(false); setPage(value => value + 1) }}>{vi ? 'Cũ hơn' : 'Older'}</Button></div>
  </CardContent></Card>
}
