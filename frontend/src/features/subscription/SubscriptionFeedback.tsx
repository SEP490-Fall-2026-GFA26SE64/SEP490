import { Link } from 'react-router-dom'
import { Button } from '../../shared/components/ui/Button'
import { useTranslation } from '../../shared/i18n/LanguageContext'
import { SubscriptionApiError } from './subscriptionApi'

export function useCopy() {
  const { language } = useTranslation()
  return (en: string, vi: string) => language === 'vi' ? vi : en
}
export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  const c = useCopy()
  return <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-card p-4">
    <p className="font-semibold">{c('Unable to complete this operation', 'Không thể hoàn tất thao tác')}</p>
    <p className="text-body-sm">{error instanceof Error ? error.message : c('The request failed.', 'Yêu cầu thất bại.')}</p>
    {error instanceof SubscriptionApiError && [401, 403].includes(error.status) &&
      <p><Link className="text-primary underline" to="/login">{c('Workspace sign in', 'Đăng nhập không gian làm việc')}</Link>
        {' · '}<Link className="text-primary underline" to="/guest/resume">{c('Resume registration', 'Tiếp tục đăng ký')}</Link></p>}
    {retry && <Button variant="outline" onClick={retry}>{c('Try again', 'Thử lại')}</Button>}
  </div>
}
export function Loading() {
  const c = useCopy()
  return <p role="status" className="rounded-lg border border-border bg-card p-5 text-muted-foreground">{c('Loading…', 'Đang tải…')}</p>
}
export function StateLabel({ value }: { value: string }) {
  const c = useCopy()
  const labels: Record<string, [string, string]> = {
    CREATING: ['Creating checkout', 'Đang tạo thanh toán'], PENDING: ['Pending', 'Đang chờ'],
    UNKNOWN: ['Awaiting confirmation', 'Chờ xác nhận'], PARTIAL: ['Payment needs reconciliation', 'Cần đối soát thanh toán'],
    PAID: ['Payment confirmed', 'Đã xác nhận thanh toán'], UNPAID_TERMINAL: ['Unpaid — retry eligible', 'Chưa thanh toán — có thể thử lại'],
    EXCEPTION: ['Payment exception — action required', 'Ngoại lệ thanh toán — cần xử lý'],
    NOT_APPLIED: ['Not activated', 'Chưa kích hoạt'], APPLIED: ['Subscription activated', 'Đã kích hoạt gói'],
    WAITING_CAPACITY: ['Reduce used seats to continue', 'Giảm số chỗ đang dùng để tiếp tục'],
    NOT_STARTED: ['Workspace not ready', 'Không gian chưa sẵn sàng'], READY: ['Workspace ready', 'Không gian sẵn sàng'],
    PROVISIONING: ['Setting up workspace', 'Đang thiết lập không gian'], FAILED: ['Setup failed', 'Thiết lập thất bại'],
    ACTIVE: ['Active', 'Đang hoạt động'], EXPIRED: ['Expired', 'Đã hết hạn'], SUSPENDED: ['Suspended', 'Đã tạm ngưng'],
  }
  const label = labels[value]
  return <span>{label ? c(...label) : value}</span>
}
