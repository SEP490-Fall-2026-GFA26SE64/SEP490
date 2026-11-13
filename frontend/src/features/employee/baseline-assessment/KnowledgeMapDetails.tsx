import { statusLabels } from '../overview/roleOverviewData'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { badgeVariants } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath } from './baselineApi'
import type { KnowledgeEntry } from './knowledgeProfileApi'
import type { KnowledgeNode } from './knowledgeMap'

function useCopy() {
  const { language } = useTranslation()
  return (en: string, vi: string) => language === 'vi' ? vi : en
}

export function RecognitionStatus({ recognized, incomplete }: { recognized: boolean; incomplete: boolean }) {
  const copy = useCopy()
  return <span className={badgeVariants({ variant: recognized ? 'success' : 'outline', className: 'knowledge-map-badge whitespace-normal' })}>
    {recognized ? copy('Recognized', 'Công nhận') : incomplete ? copy('Unknown', 'Chưa rõ') : copy('No record', 'Chưa có')}
  </span>
}

export function AssessmentStatus({ entry, unknown = false }: { entry?: KnowledgeEntry; unknown?: boolean }) {
  const copy = useCopy()
  const passed = entry?.passed === true && !entry.vetoTriggered
  // Show the server outcome; a score or passed assessment never establishes recognition.
  return <span className={badgeVariants({ variant: unknown || !entry ? 'outline' : passed ? 'success' : 'warning', className: 'knowledge-map-badge whitespace-normal' })}>
    {unknown ? copy('Unknown', 'Chưa rõ') : !entry ? copy('No assessment', 'Chưa có') : passed ? copy('Passed', 'Đạt') : copy('Not passed', 'Chưa đạt')}
  </span>
}

function AssessmentRecord({ entry }: { entry: KnowledgeEntry }) {
  const copy = useCopy()
  return <div className="space-y-2">
    <AssessmentStatus entry={entry} />
    <Text variant="body-sm">{copy('Assessment type', 'Loại đánh giá')}: {entry.purpose === 'BASELINE' ? copy('Baseline', 'Đánh giá đầu vào') : copy('Skill Assessment', 'Đánh giá kỹ năng')}</Text>
    <Text variant="body-sm">{copy('Correct answers', 'Số câu đúng')}: <strong className="text-foreground">{entry.correctCount}/{entry.totalCount}</strong></Text>
    {entry.reasons.includes('CORRECT_COUNT_BELOW_RULE') && <Text variant="body-sm">{copy('The number of correct answers was below the required minimum.', 'Số câu trả lời đúng chưa đạt mức tối thiểu của bài đánh giá.')}</Text>}
    {entry.reasons.includes('MANDATORY_NOT_SATISFIED') && <Text variant="body-sm">{copy('At least one required question was answered incorrectly or left blank.', 'Có câu hỏi bắt buộc bị trả lời sai hoặc bỏ trống.')}</Text>}
    {entry.vetoTriggered && <Text variant="body-sm" tone="destructive">{copy('No prerequisite questions were answered correctly. The assessment rules require you to retake the full attempt.', 'Bạn chưa trả lời đúng câu hỏi tiên quyết nào. Theo quy tắc của bài đánh giá, bạn cần làm lại toàn bộ bài.')}</Text>}
    {entry.attemptId && <Link className={buttonVariants({ variant: 'link', className: 'max-w-full whitespace-normal text-left' })} to={attemptPath(entry.attemptId)}>{copy('View results', 'Xem kết quả')}<ArrowUpRight size={14} className="shrink-0" aria-hidden="true" /></Link>}
  </div>
}

export function KnowledgeMapDetails({ node, incomplete, onClose, contextLabel, unavailable = false, modules = [] }: { node?: KnowledgeNode; incomplete: boolean; onClose: () => void; contextLabel?: string; unavailable?: boolean; modules?: {id:string;title:string}[] }) {
  const { t, language } = useTranslation(), copy = useCopy()
  const recognized = node?.targetStatus ? node.targetStatus==='achieved' : Boolean(node?.evidence.length)
  const baselineMet = node?.targetStatus === 'baseline'
  const passed = node?.latestAssessment?.passed === true && !node.latestAssessment.vetoTriggered
  const unknown = incomplete || unavailable || node?.skillVersion === null
  const evidence = node?.evidence[0]
  const date = (entry: KnowledgeEntry) => new Date(entry.observedAt).toLocaleString(language)
  return <Dialog open={Boolean(node)} onOpenChange={open => { if (!open) onClose() }} size="wide" className="max-w-3xl" ariaLabel={node?.skillName} closeLabel={copy('Close skill details', 'Đóng chi tiết kỹ năng')}>
    {node && <>
      <DialogHeader><DialogTitle className="break-words">{node.skillName}</DialogTitle><Text variant="body-sm">{t('knowledgeLevel.' + node.knowledgeLevel)}{contextLabel ? ' · ' + contextLabel : ''}</Text></DialogHeader>
      <DialogBody className="space-y-5">
        <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-4" aria-labelledby="skill-current-status">
          <Heading id="skill-current-status" level={3} size="card">{copy('Current status', 'Trạng thái hiện tại')}</Heading>
          <span className={badgeVariants({variant:recognized || baselineMet ? 'success' : 'outline'})}>{node.targetStatus ? statusLabels[node.targetStatus][language==='vi'?1:0] : recognized ? copy('Recognized', 'Đã công nhận') : passed ? copy('Assessment passed', 'Đánh giá đạt') : unknown ? copy('Not enough data', 'Chưa đủ dữ liệu') : node.latestAssessment ? copy('Assessment not passed', 'Đánh giá chưa đạt') : copy('Not assessed', 'Chưa đánh giá')}</span>
          <Text variant="body-sm">{baselineMet ? copy('This level meets the requirements through the entry assessment.', '\u0110\u00e3 \u0111\u00e1p \u1ee9ng y\u00eau c\u1ea7u qua \u0111\u00e1nh gi\u00e1 \u0111\u1ea7u v\u00e0o.') : node.targetStatus ? copy('Current status from your bound pathway target. Assessment history is shown separately below.', 'Tr\u1ea1ng th\u00e1i hi\u1ec7n t\u1ea1i theo y\u00eau c\u1ea7u m\u1ee5c ti\u00eau v\u00e0 l\u1ed9 tr\u00ecnh. L\u1ecbch s\u1eed \u0111\u00e1nh gi\u00e1 hi\u1ec3n th\u1ecb ri\u00eang b\u00ean d\u01b0\u1edbi.') : recognized ? evidence?.sourceKind === 'CERTIFICATE' ? copy('An approved certificate confirms this skill level.', 'Chứng chỉ đã duyệt xác nhận cấp độ kỹ năng này.') : copy('Module completion and a qualifying assessment confirm this skill level.', 'Hoàn thành module và đánh giá đủ điều kiện đã xác nhận cấp độ kỹ năng này.') : passed ? copy('Your latest assessment passed. Official recognition has not been confirmed in the loaded records.', 'Lần đánh giá gần nhất đã đạt. Các bản ghi đã tải chưa xác nhận công nhận chính thức.') : unknown ? copy('Some records are unavailable. This is not a failed result.', 'Chưa có đủ bản ghi để kết luận trạng thái.') : node.latestAssessment ? copy('Your latest assessment did not meet the requirements.', 'Lần đánh giá gần nhất chưa đáp ứng điều kiện.') : copy('No assessment result is recorded for this level.', 'Chưa ghi nhận kết quả đánh giá cho cấp độ này.')}</Text>
          {node.needsReview && <Text variant="body-sm" className="font-semibold text-primary">{copy('Needs review', 'Cần ôn lại')}{node.baselinePassed ? copy(' · Previously met through Baseline', ' · Đã đạt qua Baseline trước đây') : ''}</Text>}
          {node.origin && <Text variant="caption">{node.origin==='prerequisite' ? copy('Added prerequisite', 'Tiên quyết bổ sung') : copy('Original target level', 'Cấp độ mục tiêu ban đầu')}</Text>}
          {recognized && evidence && <Text variant="caption">{copy('Recognized', 'Công nhận')}: {date(evidence)}</Text>}
        </section>
        <section className="space-y-3" aria-labelledby="skill-content">
          <Heading id="skill-content" level={3} size="card">{copy('Skill content', 'Nội dung kỹ năng')}</Heading>
          <Text variant="body-sm">{copy('Open the linked module to view the learning content for this skill level.', 'Mở module liên quan để xem nội dung học của kỹ năng ở cấp độ này.')}</Text>
          {modules.length ? modules.map(module => <Link key={module.id} className={buttonVariants({variant:'outline',className:'h-auto w-full justify-start whitespace-normal py-3 text-left'})} to={'/employee/modules/'+encodeURIComponent(module.id)}>{module.title}<ArrowUpRight size={14} className="ml-2 shrink-0" /></Link>) : <Text variant="caption">{copy('No learning module is linked in this view.', 'Chưa có module học được liên kết trong cửa sổ này.')}</Text>}
        </section>
        {node.latestAssessment && <section className="space-y-2 border-t border-border pt-4" aria-labelledby="skill-latest-assessment">
          <Heading id="skill-latest-assessment" level={3} size="card">{copy('Latest assessment', 'Đánh giá gần nhất')}</Heading>
          <Text variant="caption">{date(node.latestAssessment)}</Text><AssessmentRecord entry={node.latestAssessment} />
          {recognized && !passed && <Text variant="caption">{copy('This later result does not remove your existing recognition.', 'Kết quả này không xóa công nhận đã có của bạn.')}</Text>}
        </section>}
        <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-semibold">{copy('Assessment history', 'Lịch sử đánh giá')}</summary>
          <Text variant="caption" className="mt-3">{copy('These are past attempts, not your current recognition status.', 'Đây là các lần làm trước, không phải trạng thái công nhận hiện tại.')}</Text>
          {incomplete && <Text variant="caption">{copy('Older records may not be loaded yet.', 'Có thể còn bản ghi cũ chưa tải.')}</Text>}
          <ol className="mt-3 space-y-3">{node.entries.filter(entry => entry.kind === 'DIAGNOSTIC').map(entry => <li key={entry.id} className="space-y-2 border-t border-border pt-3"><Text variant="caption">{date(entry)}</Text><AssessmentRecord entry={entry} /></li>)}</ol>
          {!node.entries.some(entry => entry.kind === 'DIAGNOSTIC') && <Text variant="caption">{copy('No assessment history is loaded.', 'Chưa tải được lịch sử đánh giá.')}</Text>}
          <Link className={buttonVariants({variant:'link',className:'mt-3'})} to="/employee/baseline-assessment">{copy('All assessments', 'Tất cả bài đánh giá')}</Link>
        </details>
      </DialogBody>
      <DialogFooter><Button variant="outline" onClick={onClose}>{copy('Close', 'Đóng')}</Button></DialogFooter>
    </>}
  </Dialog>
}
