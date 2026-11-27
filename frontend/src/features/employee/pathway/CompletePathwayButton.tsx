import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAutoFillAccess } from '../../../shared/hooks/useAutoFillAccess'
import { useToast } from '../../../shared/hooks/useToast'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'

export function CompletePathwayButton({ requestId, disabled }: { requestId: string; disabled: boolean }) {
  const allowed = useAutoFillAccess(), client = useQueryClient(), { toast } = useToast()
  const { language } = useTranslation(), vi = language === 'vi'
  const [phase, setPhase] = useState(''), [error, setError] = useState('')
  const running = useRef(false), controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function run() {
    if (running.current) return
    running.current = true; setError(''); setPhase('STARTING')
    const abort = new AbortController(); controller.current = abort
    try {
      for (let tick = 0; tick < 160 && !abort.signal.aborted; tick++) {
        const response = await workspaceFetch(`/api/v1/employee/pathways/${encodeURIComponent(requestId)}/complete-remaining`, { method: 'POST', signal: abort.signal })
        const value = await response.json()
        if (!response.ok) throw new Error(typeof value?.code === 'string' ? value.code : 'COMPLETION_FAILED')
        if (typeof value?.phase !== 'string') throw new Error('INVALID_RESPONSE')
        setPhase(value.phase)
        if (value.phase === 'COMPLETED') {
          await client.invalidateQueries({ queryKey: ['initialPathway'] })
          await client.invalidateQueries({ queryKey: ['employee-role-overview'] })
          toast({ variant: 'success', description: vi ? 'Lộ trình đã hoàn thành.' : 'Your pathway is completed.' })
          return
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      if (!abort.signal.aborted) throw new Error('COMPLETION_TIMEOUT')
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'COMPLETION_FAILED')
    } finally {
      running.current = false
      if (!abort.signal.aborted) { setPhase(''); void client.invalidateQueries({ queryKey: ['initialPathway'] }) }
    }
  }
  if (!allowed) return null
  const labels: Record<string, string> = {
    STARTING: vi ? 'Đang bắt đầu…' : 'Starting…',
    COMPLETING_MODULES: vi ? 'Đang hoàn thành module…' : 'Completing modules…',
    COMPLETING_ASSESSMENTS: vi ? 'Đang hoàn thành bài đánh giá…' : 'Completing assessments…',
    FINALIZING: vi ? 'Đang cập nhật kết quả…' : 'Finalizing pathway…',
    WAITING_FOR_REQUIREMENTS: vi ? 'Đang chờ mở khóa yêu cầu…' : 'Waiting for requirements…',
  }
  return <div className="space-y-2"><Button variant="outline" size="sm" disabled={disabled || Boolean(phase)} onClick={() => void run()}>{labels[phase] ?? 'Complete remaining requirements'}</Button>
    {error && <Text role="alert" variant="caption" tone="destructive">{vi ? 'Chưa thể hoàn thành. Tiến độ đã lưu được giữ nguyên.' : 'Unable to finish. Saved progress is retained.'} ({error})</Text>}
  </div>
}
