import { LoaderCircle } from 'lucide-react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { aiRunning, type Result } from './riasecApi'

export function RiasecAiProgress({ result }: { result: Result }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const running = aiRunning(result)
  const reasons: Record<string, [string, string]> = {
    NO_ELIGIBLE_POSITIONS: ['AI has not run: no active company positions have a complete RIASEC profile. Ask L&D to complete the profiles, then retry.', 'AI chưa chạy: chưa có vị trí hoạt động trong công ty với đủ hồ sơ RIASEC. Nhờ L&D bổ sung hồ sơ rồi thử lại.'],
    AI_MODEL_NOT_FOUND: ['AI could not start because the configured model is not installed. Contact the administrator, then retry.', 'AI chưa khởi chạy vì model được cấu hình chưa được cài. Liên hệ quản trị viên rồi thử lại.'],
    AI_ENDPOINT_UNAVAILABLE: ['The AI service endpoint is unavailable. Contact the administrator, then retry.', 'Endpoint dịch vụ AI chưa khả dụng. Liên hệ quản trị viên rồi thử lại.'],
    AI_CATALOG_UNAVAILABLE: ['Position profiles could not be loaded. Retry when the catalog service is available.', 'Chưa tải được hồ sơ vị trí. Thử lại khi dịch vụ danh mục khả dụng.'],
    AI_TIMEOUT: ['AI processing timed out. You can retry without answering again.', 'AI xử lý quá thời gian. Bạn có thể thử lại mà không cần làm lại bài.'],
    AI_UNAVAILABLE: ['The AI service could not process this result. Check that the service and model are ready, then retry.', 'Dịch vụ AI chưa xử lý được kết quả. Kiểm tra dịch vụ và model đã sẵn sàng rồi thử lại.'],
  }
  const reason = reasons[result.failureCode ?? '']
  const message = result.aiStatus === 'QUEUED' ? copy('Your scores are saved. AI suggestions are queued.', 'Điểm đã được lưu. Gợi ý AI đang chờ xử lý.')
    : result.aiStatus === 'PROCESSING' ? copy('Your scores are saved. AI is processing position profiles. Results will appear automatically.', 'Điểm đã được lưu. AI đang xử lý hồ sơ vị trí. Kết quả sẽ tự cập nhật.')
    : result.aiStatus === 'SUCCEEDED' ? result.recommendations?.length ? copy('AI suggestions completed.', 'AI đã hoàn tất gợi ý.') : copy('Your scores are saved, but this result has no saved AI suggestions.', 'Điểm đã được lưu nhưng kết quả này không có gợi ý AI được lưu.')
    : copy('Your scores are saved. ', 'Điểm đã được lưu. ') + (reason ? copy(...reason) : copy('AI processing was unsuccessful. You can retry this result.', 'AI chưa xử lý thành công. Bạn có thể thử lại kết quả này.'))
  return <div role="status" aria-live="polite" className={`flex items-start gap-2 text-caption ${running ? 'rounded-lg border border-primary/40 bg-secondary/40 px-3 py-2 text-secondary-foreground' : 'text-muted-foreground'}`}>
    {running && <LoaderCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />}
    <p>{message}</p>
  </div>
}
