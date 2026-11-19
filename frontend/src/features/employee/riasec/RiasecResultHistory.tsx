import { useState } from 'react'
import { Eye, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { aiRunning, type Result, type View } from './riasecApi'

export type HistoryAction = { kind: 'view' | 'inactive' | 'restore' | 'purge' | 'retry' | 'start'; result?: Result }
export function RiasecResultHistory({ view, selectedId, busy, onAction, open, onOpenChange, initialAction }: {
  initialAction?: 'start'; open: boolean; onOpenChange: (open: boolean) => void; view: View; selectedId?: string; busy: boolean; onAction: (action: HistoryAction) => Promise<boolean>
}) {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const [pending, setPending] = useState<HistoryAction | null>(() => open && initialAction === 'start' ? { kind: 'start' } : null)
  const [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [order, setOrder] = useState('newest')
  const [ai, setAi] = useState('all'), [failed, setFailed] = useState(false)
  const running = view.results.some(aiRunning)
  const date = (r: Result) => new Date(r.submittedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')
  const state = (r: Result) => r.deletedAt ? 'inactive' : r.id === view.currentId ? 'current' : 'history'
  const stateLabel = (r: Result) => r.deletedAt ? copy('Inactive', 'Không hoạt động') : r.id === view.currentId ? copy('Current', 'Hiện hành') : copy('History', 'Lịch sử')
  const labels = { view: copy('View result', 'Xem kết quả'), inactive: copy('Deactivate', 'Ngừng sử dụng'), restore: copy('Recover', 'Khôi phục'), purge: copy('Delete permanently', 'Xóa vĩnh viễn'), retry: copy('Retry AI', 'Thử lại AI'), start: copy('New assessment', 'Làm bài mới') }
  const rows = view.results.filter(r => (filter === 'all' || state(r) === filter) && (ai === 'all' || r.aiStatus === ai) && `${date(r)} ${r.id} ${stateLabel(r)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .sort((a, b) => (order === 'newest' ? -1 : 1) * (a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id)))
  const request = (action: HistoryAction) => { setFailed(false); setPending(action) }
  const cancelConfirmation = () => {
    if (busy) return
    setPending(null); setFailed(false)
    if (initialAction === 'start') onOpenChange(false)
  }
  const confirm = async () => {
    if (!pending || busy) return
    const success = await onAction(pending)
    if (!success) { setFailed(true); return }
    if (pending.kind === 'view' || pending.kind === 'start') onOpenChange(false)
    setPending(null); setFailed(false)
  }
  return <>
    <Dialog open={open && !pending && initialAction !== 'start'} onOpenChange={value => { if (!busy && !pending) onOpenChange(value) }} size="wide" className="max-w-4xl border-primary/30" ariaLabel={copy('RIASEC result history', 'Danh sách kết quả RIASEC')} closeLabel={copy('Close history', 'Đóng danh sách')}>
      <DialogHeader className="rounded-lg border-l-4 border-primary bg-secondary/50 p-3"><DialogTitle className="text-secondary-foreground">{copy('RIASEC result history', 'Danh sách kết quả RIASEC')}</DialogTitle><Text variant="caption">{copy('Viewing history does not change the current result. Inactive results cannot be viewed and are permanently removed after 7 days.', 'Xem lịch sử không đổi kết quả hiện hành. Không thể xem bản inactive; bản này sẽ bị xóa vĩnh viễn sau 7 ngày.')}</Text></DialogHeader>
      <div className="grid shrink-0 gap-2 rounded-lg bg-background p-3 mb-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-caption">{copy('Search', 'Tìm kiếm')}<input className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2" value={search} onChange={e => setSearch(e.target.value)} placeholder={copy('Date or result ID', 'Ngày hoặc mã kết quả')} /></label>
        <label className="text-caption">{copy('Status', 'Trạng thái')}<select className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">{copy('All', 'Tất cả')}</option><option value="current">{copy('Current', 'Hiện hành')}</option><option value="history">{copy('History', 'Lịch sử')}</option><option value="inactive">{copy('Inactive', 'Không hoạt động')}</option></select></label>
        <label className="text-caption">AI<select className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2" value={ai} onChange={e => setAi(e.target.value)}><option value="all">{copy('All', 'Tất cả')}</option>{['QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="text-caption">{copy('Order', 'Sắp xếp')}<select className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2" value={order} onChange={e => setOrder(e.target.value)}><option value="newest">{copy('Newest first', 'Mới nhất trước')}</option><option value="oldest">{copy('Oldest first', 'Cũ nhất trước')}</option></select></label>
      </div>
      <DialogBody aria-label={copy('Saved results', 'Các kết quả đã lưu')}>
        <Text variant="caption" className="mb-2">{rows.length}/{view.results.length} {copy('results', 'kết quả')}</Text>
        <ul className="divide-y divide-border">{rows.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 odd:bg-secondary/20">
          <div className="min-w-0 space-y-1"><Heading level={3} size="card">{date(r)}</Heading><div className="flex flex-wrap items-center gap-2 text-caption"><span className={`rounded px-2 py-0.5 ${r.id === view.currentId && !r.deletedAt ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{stateLabel(r)}</span><span className="text-muted-foreground">AI · {r.aiStatus}</span>{selectedId === r.id && !r.deletedAt && <span className="text-primary">{copy('Viewing', 'Đang xem')}</span>}</div><p className="break-all text-caption text-muted-foreground">{r.id}</p>{r.deletedAt && <Text variant="caption">{copy('Recover before', 'Khôi phục trước')}: {new Date(new Date(r.deletedAt).getTime() + 7 * 86400000).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</Text>}</div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {!r.deletedAt ? <><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`${labels.view}: ${date(r)}`} title={labels.view} disabled={busy} onClick={() => request({ kind: 'view', result: r })}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`${labels.inactive}: ${date(r)}`} title={labels.inactive} disabled={busy || aiRunning(r)} onClick={() => request({ kind: 'inactive', result: r })}><Trash2 className="h-4 w-4" /></Button>{r.id === view.currentId && r.aiStatus === 'FAILED' && <Button size="sm" variant="outline" disabled={busy || running} onClick={() => request({ kind: 'retry', result: r })}>{labels.retry}</Button>}</> : <><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`${labels.restore}: ${date(r)}`} title={labels.restore} disabled={busy || running} onClick={() => request({ kind: 'restore', result: r })}><RotateCcw className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={`${labels.purge}: ${date(r)}`} title={labels.purge} disabled={busy} onClick={() => request({ kind: 'purge', result: r })}><Trash2 className="h-4 w-4" /></Button></>}
          </div>
        </li>)}</ul>
        {!rows.length && <Text className="py-8 text-center" variant="body-sm">{copy('No results match these filters.', 'Không có kết quả khớp bộ lọc.')}</Text>}
      </DialogBody>

      <DialogFooter>{!view.draft.draftId && <Button size="sm" disabled={busy || running} onClick={() => request({ kind: 'start' })}>{labels.start}</Button>}<Button size="sm" variant="outline" disabled={busy || !!pending} onClick={() => onOpenChange(false)}>{copy('Close', 'Đóng')}</Button></DialogFooter>
    </Dialog>
    <Dialog open={open && !!pending} onOpenChange={value => { if (!value) cancelConfirmation() }} ariaLabel={pending ? labels[pending.kind] : undefined} closeLabel={copy('Cancel', 'Hủy')}>
      {pending && <><DialogHeader><DialogTitle>{labels[pending.kind]}?</DialogTitle></DialogHeader><DialogBody><div className="space-y-3">{pending.result && <Text className="font-semibold">{date(pending.result)}</Text>}<Text variant="body-sm">{pending.kind === 'purge' ? copy('This permanently removes the inactive result, its answers, scores and saved suggestions. This cannot be undone.', 'Xóa vĩnh viễn bản inactive cùng câu trả lời, điểm và gợi ý đã lưu. Không thể hoàn tác.') : pending.kind === 'inactive' ? copy('This result will become inactive and cannot be viewed until recovered within 7 days. It is permanently removed after that. The latest remaining active submission becomes current.', 'Bước này chỉ ngừng sử dụng (inactive), chưa xóa vĩnh viễn. Bạn có thể khôi phục trong 7 ngày; sau đó bản này tự xóa vĩnh viễn. Lần nộp mới nhất còn hoạt động sẽ là hiện hành.') : pending.kind === 'restore' ? copy('Recover this result with its saved scores and suggestions. AI will not run again. The newest active submission is current.', 'Khôi phục điểm và gợi ý đã lưu, không chạy lại AI. Lần nộp mới nhất còn hoạt động là hiện hành.') : pending.kind === 'view' ? copy('Display this submission on the radar. This does not change the current result.', 'Hiển thị lần nộp này trên radar, không đổi kết quả hiện hành.') : pending.kind === 'retry' ? copy('Retry AI suggestions for this failed current result?', 'Thử lại gợi ý AI cho kết quả hiện hành đang thất bại?') : copy('Start a new assessment? Your existing results remain saved.', 'Bắt đầu bài mới? Các kết quả hiện có vẫn được lưu.')}</Text>{failed && <Text role="alert" tone="destructive">{copy('The action could not be completed. Refresh or try again.', 'Chưa thực hiện được. Tải lại hoặc thử lại.')}</Text>}</div></DialogBody><DialogFooter><Button variant="outline" disabled={busy} onClick={cancelConfirmation}>{copy('Cancel', 'Hủy')}</Button><Button variant={pending.kind === 'purge' || pending.kind === 'inactive' ? 'destructive' : 'primary'} disabled={busy} onClick={() => void confirm()}>{busy ? copy('Processing…', 'Đang xử lý…') : copy('Confirm', 'Xác nhận')}</Button></DialogFooter></>}
    </Dialog>
  </>
}
