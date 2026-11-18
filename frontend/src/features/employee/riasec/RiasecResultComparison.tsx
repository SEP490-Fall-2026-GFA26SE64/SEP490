import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { cn } from '../../../shared/lib/utils'
import { dimensions, type Recommendation, type Result } from './riasecApi'
import { interestCopy } from './riasecContent'
import { RiasecRadarPanel } from './RiasecRadarPanel'
import { RiasecRecommendationCard } from './RiasecRecommendationCard'

// Keyed by submission/history view so transient UI cannot compare a stale snapshot.
export function RiasecResultComparison({ result, activeIds, navigation, footer }: { result: Result; activeIds: string[]; navigation?: ReactNode; footer?: ReactNode }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const [pinned, setPinned] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [detail, setDetail] = useState<Recommendation | null>(null)
  const recommendations = result.aiStatus === 'SUCCEEDED' ? (result.recommendations ?? []).slice(0, 3) : []
  const comparison = recommendations.find(r => r.position.id === (hovered ?? focused ?? pinned))
  return <>
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]" data-testid="riasec-comparison">
      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {navigation}
        <RiasecRadarPanel scores={result.scores} comparison={comparison?.position} />
        {footer}
      </div>
      <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Heading level={3} size="card" className="text-secondary-foreground">{copy('Suggested Job Positions', 'Job Position được gợi ý')}</Heading>
        <Text variant="caption">{copy('Hover or focus to compare. Select a card to pin.', 'Trỏ chuột hoặc dùng bàn phím để so sánh. Chọn thẻ để ghim.')}</Text>
        {recommendations.map(r => {
          const id = r.position.id, isPinned = pinned === id, preview = comparison?.position.id === id
          return <RiasecRecommendationCard key={id} recommendation={r} isPinned={isPinned} preview={preview}
            onPreview={setHovered} onFocusPreview={setFocused} onToggle={() => setPinned(value => value === id ? null : id)} onDetails={() => setDetail(r)} />
        })}
        {result.aiStatus === 'SUCCEEDED' && !recommendations.length && <Text variant="body-sm">{copy('No suitable positions were identified from the available catalog.', 'Chưa tìm thấy vị trí phù hợp từ danh sách hiện có.')}</Text>}
      </div>
    </div>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null) }} ariaLabel={detail?.position.name} closeLabel={copy('Close details', 'Đóng chi tiết')}
      containerClassName="items-stretch justify-end overflow-hidden p-0 sm:p-0"
      className="my-0 h-dvh max-h-none w-full max-w-xl rounded-none p-0 duration-300 slide-in-from-right zoom-in-100 motion-reduce:animate-none sm:p-0">
      {detail && <>
        <DialogHeader className="m-0 border-b border-border px-5 py-5 pr-14"><DialogTitle className="break-words">{detail.position.name}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-6 px-5 py-5" aria-label={copy('Position details', 'Chi tiết vị trí')}>
          <Text className="whitespace-pre-wrap break-words">{detail.position.description}</Text>
          <section className="space-y-2"><Heading level={3} size="subsection">{copy('Why it was suggested', 'Vì sao được gợi ý')}</Heading><p lang="en" data-i18n-skip className="whitespace-pre-wrap break-words text-body-sm">{detail.explanation}</p></section>
          <section className="space-y-3">
            <Heading level={3} size="subsection">{copy('RIASEC interests', 'Sở thích RIASEC')}</Heading>
            <Text variant="caption">{copy('Shared scale: 0–40. Labels mark the groups in the saved AI comparisons.', 'Cùng thang điểm 0–40. Nhãn đánh dấu nhóm trong so sánh AI đã lưu.')}</Text>
            {dimensions.map(d => {
              const marked = detail.comparisons?.some(c => c.dimension === d)
              return <div key={d} className={cn('space-y-2 rounded-lg border p-3', marked ? 'border-primary/40 bg-secondary/30' : 'border-border')}>
                <div className="flex flex-wrap items-center justify-between gap-2"><Heading level={4} size="card">{d} · {interestCopy[d][vi ? 1 : 0]}</Heading>
                  {marked && <span className="rounded border border-border bg-card px-2 py-0.5 text-caption text-muted-foreground">{copy('AI comparison', 'AI so sánh')}</span>}
                </div>
                {([{ label: copy('You', 'Bạn'), score: result.scores[d], self: true }, { label: 'Job Position', score: detail.position.scores[d], self: false }]).map(row => <div key={row.label}>
                  <div className="mb-1 flex justify-between gap-2 text-caption"><span>{row.label}</span><span className="tabular-nums">{row.score}/40</span></div>
                  <div role="meter" aria-label={`${d} · ${row.label}`} aria-valuemin={0} aria-valuemax={40} aria-valuenow={row.score} className="h-2 overflow-hidden rounded-full bg-muted">
                    <div style={{ width: `${row.score / 40 * 100}%` }} className={cn('h-full rounded-full', row.self ? 'bg-primary/70' : 'bg-success/70')} />
                  </div>
                </div>)}
              </div>
            })}
          </section>
          <Text variant="body-sm">{copy('Suggestions reflect occupational interests and do not confirm competence for a position. Lower scores indicate different interests, not a lack of ability.', 'Gợi ý phản ánh sở thích nghề nghiệp, không xác nhận đủ năng lực đảm nhiệm vị trí. Điểm thấp hơn chỉ thể hiện khác biệt sở thích, không phải thiếu năng lực.')}</Text>
        </DialogBody>
        <DialogFooter className="m-0 px-5 py-4">
          {activeIds.includes(detail.position.id) ? <Link className={buttonVariants({ variant: 'primary', className: 'h-10 px-4' })} to={`/employee/upskilling?tab=roles&jobPositionId=${encodeURIComponent(detail.position.id)}`}>Explore more</Link> : <div className="space-y-1"><Button disabled>Explore more</Button><Text variant="caption">{copy('This position is currently unavailable to explore.', 'Vị trí hiện không khả dụng để khám phá tiếp.')}</Text></div>}
          <Button variant="outline" onClick={() => setDetail(null)}>{copy('Close', 'Đóng')}</Button>
        </DialogFooter>
      </>}
    </Dialog>
  </>
}
