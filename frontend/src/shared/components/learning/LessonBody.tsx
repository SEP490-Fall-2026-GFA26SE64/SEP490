import { useEffect, useState } from 'react'
import { moduleRequest } from '../../api/moduleAuthoringApi'
import { Button } from '../ui/Button'
import { useTranslation } from '../../i18n/LanguageContext'
export function LessonBody({
  body,
  format,
  onReady,
}: {
  body: string
  format: string
  onReady?: () => void
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [attempt, setAttempt] = useState(0)
  const key = `${format}:${attempt}:${body}`
  const [result, setResult] = useState<{
    key: string
    html: string
    error: string
  } | null>(null)
  const html = result?.key === key ? result.html : ''
  const error = result?.key === key ? result.error : ''
  useEffect(() => {
    if (html) onReady?.()
  }, [html, onReady])
  useEffect(() => {
    const controller = new AbortController()
    void moduleRequest<{ html: string }>(
      '/text/preview',
      'POST',
      { body, format },
      controller.signal,
    )
      .then((value) => setResult({ key, html: value.html, error: '' }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            html: '',
            error: err instanceof Error ? err.message : 'Cannot load lesson',
          })
      })
    return () => controller.abort()
  }, [body, format, key])
  return error ? (
    <div role="alert">
      <p className="text-destructive">{error}</p>
      <Button
        variant="outline"
        onClick={() => setAttempt((value) => value + 1)}
      >
        {vi ? 'Thử lại' : 'Retry'}
      </Button>
    </div>
  ) : !html ? (
    <div role="status" className="h-32 animate-pulse rounded bg-muted">
      {vi ? 'Đang tải bài…' : 'Loading lesson…'}
    </div>
  ) : (
    <div
      className="break-words leading-relaxed [&_h1]:mb-3 [&_h1]:text-section [&_h2]:my-3 [&_h2]:text-subsection [&_h3]:my-3 [&_h3]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-6 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
