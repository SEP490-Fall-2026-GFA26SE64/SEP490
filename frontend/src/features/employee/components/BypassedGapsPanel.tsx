import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readBypassedGaps, rulePathwaysEnabled, type RulePathway } from '../../../shared/api/requirementPathway'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

/** Also visible between target selection and the next pathway request. No read creates a request. */
export function BypassedGapsPanel({ availableOnly = false, pathway }: { availableOnly?: boolean; pathway?: RulePathway | null }) {
  const identity = useContext(WorkspaceSessionContext)?.identity, { language, t } = useTranslation(), vi = language === 'vi'
  const query = useQuery({ queryKey: ['bypassedGaps', identity?.organizationId, identity?.accountId], queryFn: ({ signal }) => readBypassedGaps(signal), enabled: rulePathwaysEnabled && Boolean(identity?.roles?.includes('EMPLOYEE')), retry: false, staleTime: 15_000, refetchOnWindowFocus: true, refetchInterval: 30_000 })
  if (!rulePathwaysEnabled || !identity?.roles?.includes('EMPLOYEE')) return null
  const gaps = query.isError ? [] : (query.data ?? []).filter(gap => !availableOnly || !gap.achieved && (gap.options.length > 0 || gap.certificate) && !pathway?.steps.some(step => step.sourceBypassId === gap.bypassId))
  if (!query.isError && !gaps.length) return null
  return <section id={availableOnly ? 'supplementary-learning' : 'retained-gaps'} className="space-y-3 rounded-xl border border-border bg-card p-4">
    <Heading level={2} size="card">{availableOnly ? vi ? 'Học bổ sung từ gap cũ' : 'Supplementary learning from earlier gaps' : vi ? 'Gap được bypass' : 'Bypassed gaps'}</Heading>
    <Text variant="body-sm">{vi ? 'Bypass giữ lại gap và lịch sử phê duyệt, không công nhận đạt kỹ năng. Học bổ sung không khóa mục tiêu mới hoặc thay đổi hoàn thành của lộ trình cũ.' : 'Bypass retains the gap and approval history without awarding skill achievement. Supplementary learning does not lock a new target or change the completion of an earlier pathway.'}</Text>
    {query.isError && <div role="alert" className="space-y-2"><Text variant="body-sm">{vi ? 'Chưa tải được các gap đã lưu.' : 'Retained gaps could not be loaded.'}</Text><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>{t('common.retry', vi ? 'Thử lại' : 'Retry')}</Button></div>}
    <ul className="space-y-3">{gaps.map(gap => {
      const available = gap.options.length > 0 || Boolean(gap.certificate)
      const attached = pathway?.steps.find(step => step.sourceBypassId === gap.bypassId)
      return <li key={gap.bypassId} className="space-y-2 rounded-lg border border-border p-3">
        <Text tone="foreground" className="font-semibold">{gap.requirement.skillName} · {t('knowledgeLevel.' + gap.requirement.knowledgeLevel)}</Text>
        <Badge variant={gap.achieved ? 'success' : available ? 'secondary' : 'outline'} className="whitespace-normal">{gap.achieved ? vi ? 'Đã công nhận năng lực' : 'Achievement accepted' : available ? vi ? 'Đã có nội dung học/chứng chỉ phù hợp' : 'Compatible learning/certificate now available' : vi ? 'Chưa có nội dung học/chứng chỉ phù hợp' : 'No compatible learning content or certificate available'}</Badge>
        <Text variant="caption">{vi ? 'Gap từ' : 'Gap from'}: {gap.roleName} · {gap.levelName}</Text>
        <Text variant="body-sm">{vi ? 'Lý do bypass' : 'Bypass reason'}: {gap.reason}</Text>
        <Text variant="caption">{vi ? 'Người duyệt' : 'Approved by'}: {gap.expertId} · {new Date(gap.decidedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</Text>
        {!attached && gap.options.length > 0 && <ul className="list-disc pl-5 text-body-sm">{gap.options.map(option => <li key={option.moduleId + ':' + option.moduleRevision}>{option.title}</li>)}</ul>}
        {!attached && gap.certificate?.description && <Text variant="body-sm" className="whitespace-pre-wrap break-words">{gap.certificate.description}</Text>}{!attached && gap.certificate && <a className="block text-body-sm text-primary underline underline-offset-4" href={gap.certificate.referenceUrl} target="_blank" rel="noopener noreferrer">{gap.certificate.name}</a>}
        <div className="flex flex-wrap gap-2"><Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to={'/employee/pathway?view=role&archive=' + encodeURIComponent(gap.sourceRequestId)}>{vi ? 'Lịch sử gap gốc' : 'Original gap history'}</Link>
          {!gap.achieved && available && (attached ? <Link className={buttonVariants({ size: 'sm' })} to="/employee/pathway?view=role">{vi ? 'Xem học bổ sung' : 'View supplementary learning'}</Link> : <Link className={buttonVariants({ size: 'sm' })} to={'/employee/upskilling?tab=skills&skillId=' + encodeURIComponent(gap.requirement.skillId) + '&level=' + gap.requirement.knowledgeLevel}>{vi ? 'Xem kỹ năng và nội dung' : 'View skill and learning content'}</Link>)}
        </div>
        {!gap.achieved && available && !attached && <Text variant="caption">{vi ? 'Nội dung bổ sung vẫn được giữ khi bạn chưa có lộ trình mới.' : 'This supplementary content remains available before your next pathway is created.'}</Text>}
      </li>
    })}</ul>
  </section>
}
