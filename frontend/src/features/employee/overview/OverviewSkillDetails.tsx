import { Dialog, DialogBody, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Link } from 'react-router-dom'
import { buttonVariants } from '../../../shared/components/ui/Button'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { attemptPath } from '../baseline-assessment/baselineApi'
import { profileStateLabels, type ProfileSkill } from './overviewProfile'

export function OverviewSkillDetails({ skill, targetKnown, levelKey, onClose }: { skill: ProfileSkill; targetKnown: boolean; levelKey: string; onClose: () => void }) {
  const { t, language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const required = skill.levels.filter(level => level.required)
  const recognized = skill.levels.filter(level => level.state === 'recognized')
  const missing = required.filter(level => level.state !== 'recognized')
  const names = (levels: typeof required) => levels.map(level => t('knowledgeLevel.' + level.knowledgeLevel)).join(', ')
  return <Dialog open onOpenChange={open => { if (!open) onClose() }} size="wide" ariaLabel={skill.name} closeLabel={copy('Close knowledge details', 'Đóng chi tiết kiến thức')}>
    <DialogHeader><DialogTitle>{skill.name} · {t('knowledgeLevel.' + skill.levels.find(level => level.key === levelKey)?.knowledgeLevel)}</DialogTitle>
      <Text variant="caption">{copy('Version', 'Phiên bản')}: {skill.version ?? copy('Not available', 'Chưa có')}</Text></DialogHeader>
    <DialogBody className="space-y-4">
      <section className="space-y-1"><Heading level={4} size="card">{copy('Current → target → remaining', 'Hiện tại → mục tiêu → còn thiếu')}</Heading>
        <Text variant="body-sm"><strong>{copy('Recognized', 'Đã công nhận')}:</strong> {recognized.length ? names(recognized) : copy('No confirmed recognition shown', 'Chưa hiển thị công nhận được xác nhận')}</Text>
        <Text variant="body-sm"><strong>{copy('Target Role', 'Vị trí mục tiêu')}:</strong> {required.length ? names(required) : targetKnown ? copy('No requirement for this skill version', 'Không có yêu cầu cho phiên bản kỹ năng này') : copy('No target comparison available', 'Chưa có dữ liệu đối chiếu mục tiêu')}</Text>
        {required.length > 0 && <Text variant="body-sm"><strong>{copy('Remaining', 'Còn thiếu')}:</strong> {missing.length ? names(missing) : copy('All requirements recognized', 'Đã công nhận đủ yêu cầu')}</Text>}
      </section>
      <ul className="space-y-3">{skill.levels.filter(level => level.key === levelKey).map(level => {
        const assessment = level.record?.latestAssessment
        const passed = assessment?.passed === true && !assessment.vetoTriggered
        return <li key={level.key} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex flex-wrap justify-between gap-1"><strong className="text-body-small">{t('knowledgeLevel.' + level.knowledgeLevel)}</strong>
            <span className="text-caption text-muted-foreground">{level.required ? copy('Target requirement', 'Yêu cầu mục tiêu') : targetKnown ? copy('Outside target', 'Ngoài mục tiêu') : copy('No target comparison', 'Chưa đối chiếu mục tiêu')}</span></div>
          <Text variant="caption" className="overview-state-label" data-state={level.state}>{profileStateLabels[level.state][vi ? 1 : 0]}</Text>
          {assessment && <Text variant="caption">{copy('Latest assessment', 'Đánh giá gần nhất')}: {passed ? copy('Passed', 'Đạt') : copy('Not passed', 'Chưa đạt')} · {assessment.correctCount}/{assessment.totalCount} · <time dateTime={assessment.observedAt}>{new Date(assessment.observedAt).toLocaleDateString(vi ? 'vi-VN' : 'en-GB')}</time></Text>}
          {level.pair?.status === 'waiting' && <Text variant="caption">{copy('Prerequisites in the pathway remain unfulfilled.', 'Tiên quyết trong lộ trình chưa được đáp ứng.')}</Text>}
          {level.state === 'waiting' && level.pair?.status !== 'waiting' && <Text variant="caption">{copy('A positive assessment is recorded; official recognition has not been granted.', 'Đã ghi nhận đánh giá tích cực; chưa có công nhận chính thức.')}</Text>}
          {level.state === 'unassessed' && <Text variant="caption">{copy('No matching assessment is recorded. This does not imply weak competency.', 'Chưa có đánh giá phù hợp. Điều này không đồng nghĩa năng lực yếu.')}</Text>}
          {level.state === 'unknown' && <Text variant="caption">{copy('History or the saved skill version is unavailable. No conclusion about assessment or competency can be made.', 'Thiếu lịch sử hoặc phiên bản kỹ năng đã lưu. Chưa thể kết luận về đánh giá hay năng lực.')}</Text>}
          {level.pair?.step?.state === 'BYPASSED' && <Text variant="caption">{copy('Bypassed in the pathway; bypass alone is not recognition.', 'Được bỏ qua trong lộ trình; bỏ qua riêng lẻ không phải công nhận.')}</Text>}
          {level.pair?.status === 'learning' && <Text variant="caption">{copy('Learning is in progress in the pathway.', 'Đang học trong lộ trình.')}</Text>}
          <div className="flex flex-wrap gap-2">
            {assessment?.attemptId && <Link className={buttonVariants({ variant: 'link', size: 'sm' })} to={attemptPath(assessment.attemptId)}>{copy('View results', 'Xem kết quả')}</Link>}
            {level.pair?.step && <Link className={buttonVariants({ variant: 'link', size: 'sm' })} to="/employee/pathway?view=role">{copy('View in pathway', 'Xem trong lộ trình')}</Link>}
          </div>
        </li>
      })}</ul>
      <Text variant="caption">{copy('Passing an assessment alone does not grant recognition. Only accepted evidence or the official target projection establishes recognition.', 'Đạt đánh giá riêng lẻ không tự động được công nhận. Công nhận dựa trên minh chứng được chấp nhận hoặc dữ liệu công nhận chính thức của mục tiêu.')}</Text>
      <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/overview#competency-profile">{copy('Full competency profile', 'Hồ sơ năng lực đầy đủ')}</Link>
    </DialogBody>
  </Dialog>
}
