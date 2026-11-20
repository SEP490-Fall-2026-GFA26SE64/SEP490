import { Lock } from 'lucide-react'
import type { RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

export function RequirementLockNotice({ pathway, step }: { pathway: RulePathway; step: RuleStep }) {
  const { t, language } = useTranslation(), vi = language === 'vi'
  if (!step.learningLocked && !step.assessmentLocked) return null
  const needs = pathway.dependencies.filter(edge => edge.dependentStepId === step.id)
    .flatMap(edge => pathway.steps.filter(item => item.id === edge.prerequisiteStepId && !['FULFILLED', 'ASSESSED_SATISFIED', 'BYPASSED'].includes(item.state)))
  return <div role="status" className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
    <Text variant="body-sm" className="flex items-center gap-2 font-semibold"><Lock className="size-4 shrink-0" />{vi ? 'Đang khóa' : 'Locked'}</Text>
    <Text variant="body-sm">{needs.length ? !step.learningLocked ? vi ? 'Nội dung đã bắt đầu vẫn xem được. Cần giải quyết các yêu cầu dưới đây trước khi làm Skill Assessment.' : 'Started content remains readable. Resolve these requirements before taking the Skill Assessment.' : vi ? 'Cần hoàn thành các yêu cầu dưới đây để tiếp tục học và thi lại phần chính.' : 'Complete these requirements to continue learning and retake MAIN.' : vi ? 'Cần lộ trình được phê duyệt hợp lệ trước khi tiếp tục.' : 'A valid pathway approval is required before continuing.'}</Text>
    {needs.length > 0 && <ul className="list-disc space-y-1 pl-5 text-body-sm">{needs.map(item => <li key={item.id}>{item.requirement.skillName} · {t('knowledgeLevel.' + item.requirement.knowledgeLevel)} · {item.requirement.skillId === step.requirement.skillId ? vi ? 'Mức thấp hơn cùng kỹ năng' : 'Lower level of the same skill' : vi ? 'Kỹ năng tiên quyết khác' : 'Prerequisite skill'}</li>)}</ul>}
  </div>
}
