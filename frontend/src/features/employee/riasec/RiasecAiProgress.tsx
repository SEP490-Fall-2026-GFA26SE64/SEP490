import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { aiRunning, type Result } from './riasecApi'

export function RiasecAiProgress({ result }: { result: Result }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const running = aiRunning(result)
  const [simulated, setSimulated] = useState(0)
  useEffect(() => {
    if (!running) return
    const started = Date.now()
    const timer = window.setInterval(() => setSimulated(Math.min(95, Math.floor(95 * (1 - Math.exp(-(Date.now() - started) / 90000))))), 1500)
    return () => window.clearInterval(timer)
  }, [running])
  if (!running) return <p role="status" className={`text-caption ${result.aiStatus === 'SUCCEEDED' ? 'text-success' : 'text-muted-foreground'}`}>{result.aiStatus === 'SUCCEEDED' ? (vi ? 'AI đã hoàn tất gợi ý' : 'AI suggestions completed') : (vi ? 'AI chưa xử lý thành công. Điểm của bạn đã được lưu.' : 'AI processing was unsuccessful. Your scores are saved.')}</p>
  return <div className="space-y-2 rounded-lg border border-primary/40 bg-secondary/40 px-3 py-2">
    <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-secondary-foreground"><span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{vi ? 'AI đang khám phá vị trí' : 'AI is exploring positions'}</span><span className="tabular-nums">{simulated}% · {vi ? 'mô phỏng' : 'simulated'}</span></div>
    <div role="progressbar" aria-label={vi ? 'AI đang xử lý; thanh tiến trình mô phỏng' : 'AI processing; simulated progress'} className="h-1.5 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary/70 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.max(3, simulated)}%` }} /></div>
    <p className="text-caption text-muted-foreground">{vi ? 'Hiệu ứng chờ, không phải tiến độ thực. Kết quả xuất hiện khi AI hoàn tất.' : 'Waiting animation, not actual progress. Results appear when AI finishes.'}</p>
  </div>
}
