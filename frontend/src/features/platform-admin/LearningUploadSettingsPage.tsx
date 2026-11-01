import { useEffect, useRef, useState } from 'react'
import {
  moduleRequest,
  type LearningLimits,
} from '../../shared/api/moduleAuthoringApi'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { FormField } from '../../shared/components/ui/FormField'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../shared/i18n/LanguageContext'
export function LearningUploadSettingsPage() {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [settings, setSettings] = useState<LearningLimits | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const lock = useRef(false)
  useEffect(() => {
    const abort = new AbortController()
    void moduleRequest<LearningLimits>(
      '/upload-settings',
      'GET',
      undefined,
      abort.signal,
    )
      .then(setSettings)
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : 'Cannot load settings')
      })
    return () => abort.abort()
  }, [attempt])
  return (
    <WorkspaceLayout>
      <div className="space-y-4">
        <PageHeader
          title={vi ? 'Dung lượng nội dung học' : 'Learning upload limits'}
          description={
            vi
              ? 'Quản lí dung lượng tải lên cho toàn hệ thống. File đã lưu vẫn được sử dụng khi giảm giới hạn.'
              : 'Manage platform upload limits. Previously accepted files remain available when limits are reduced.'
          }
        />
        {error && (
          <div role="alert">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError('')
                setAttempt((a) => a + 1)
              }}
            >
              {vi ? 'Tải lại' : 'Reload'}
            </Button>
          </div>
        )}
        {notice && (
          <p role="status" className="text-success">
            {notice}
          </p>
        )}
        {!settings ? (
          <p role="status">{vi ? 'Đang tải cấu hình…' : 'Loading settings…'}</p>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (lock.current) return
                  lock.current = true
                  setBusy(true)
                  setError('')
                  setNotice('')
                  void moduleRequest<LearningLimits>(
                    '/upload-settings',
                    'PUT',
                    settings,
                  )
                    .then((s) => {
                      setSettings(s)
                      setNotice(
                        vi ? 'Đã cập nhật giới hạn.' : 'Upload limits updated.',
                      )
                    })
                    .catch((err: unknown) =>
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Cannot save settings',
                      ),
                    )
                    .finally(() => {
                      lock.current = false
                      setBusy(false)
                    })
                }}
              >
                {(['videoBytes', 'imageBytes', 'zipBytes'] as const).map(
                  (key) => (
                    <FormField
                      key={key}
                      label={`${key === 'videoBytes' ? 'Video MP4' : key === 'imageBytes' ? (vi ? 'Ảnh' : 'Image') : 'ZIP'} (MB)`}
                    >
                      <Input
                        type="number"
                        min={1}
                        max={key === 'imageBytes' ? 100 : 10240}
                        step={1}
                        required
                        disabled={busy}
                        value={settings[key] / 1048576}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [key]: Number(e.target.value) * 1048576,
                          })
                        }
                      />
                    </FormField>
                  ),
                )}
                <p className="text-sm text-muted-foreground">
                  {settings.changedBy
                    ? `${vi ? 'Cập nhật bởi' : 'Updated by'} ${settings.changedBy} · ${new Date(settings.changedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}`
                    : vi
                      ? 'Đang dùng giới hạn mặc định.'
                      : 'Using default limits.'}
                </p>
                <Button type="submit" disabled={busy}>
                  {vi ? 'Lưu cấu hình' : 'Save settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </WorkspaceLayout>
  )
}
