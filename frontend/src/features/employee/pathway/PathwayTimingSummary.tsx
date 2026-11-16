import type { PathwayTiming } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Text } from '../../../shared/components/typography/Text'

export function PathwayTimingSummary({ timing }: { timing?: PathwayTiming | null }) {
  const { language } = useTranslation(), vi = language === 'vi'
  if (!timing) return null
  const date = (value: string) => new Date(value).toLocaleString(vi ? 'vi-VN' : 'en-GB', { timeZone: 'UTC', timeZoneName: 'short' })
  const at = timing.completedAt ?? timing.observedAt
  const days = timing.deadlineAt ? Math.ceil(Math.abs(Date.parse(timing.deadlineAt) - Date.parse(at)) / 86400000) : null
  const late = timing.deadlineAt && Date.parse(at) > Date.parse(timing.deadlineAt)
  const state = timing.state === 'NOT_STARTED' ? (vi ? 'Chưa bắt đầu' : 'Not started')
    : timing.state === 'LEGACY_UNTIMED' ? (vi ? 'Không có hạn' : 'No deadline')
    : timing.state === 'COMPLETED' ? (timing.onTime === null ? (vi ? 'Đã hoàn tất' : 'Completed') : timing.onTime ? (vi ? 'Hoàn tất đúng hạn.' : 'Completed on time.') : (vi ? 'Hoàn tất trễ hạn.' : 'Completed late.'))
    : late ? (vi ? `Quá hạn · ${days} ngày` : `Overdue · ${days} days`)
    : (vi ? `Còn ${days} ngày.` : `${days} days remaining.`)
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3" role="status">
    <Text tone={late && timing.state !== 'COMPLETED' ? 'destructive' : 'foreground'} variant="body-sm" className="font-semibold">{state}</Text>
    {timing.startedAt && <Text variant="caption">{vi ? 'Bắt đầu' : 'Started'}: {date(timing.startedAt)} · {timing.durationMonths} {vi ? 'tháng' : 'months'}</Text>}
    {timing.deadlineAt && <Text variant="caption">{vi ? 'Hạn hoàn thành' : 'Deadline'}: {date(timing.deadlineAt)}</Text>}
    {timing.completedAt && <Text variant="caption">{vi ? 'Hoàn tất' : 'Completed'}: {date(timing.completedAt)}</Text>}
  </div>
}
