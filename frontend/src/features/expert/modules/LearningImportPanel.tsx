import { useRef, useState } from 'react'
import {
  moduleRequest,
  uploadLearningFile,
  type ImportPreview,
} from '../../../shared/api/moduleAuthoringApi'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Heading } from '../../../shared/components/typography/Heading'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../shared/components/ui/Dialog'
import { LessonVideo } from '../../../shared/components/learning/LessonVideo'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
export function LearningImportPanel({
  onImported,
}: {
  onImported: () => void
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [played, setPlayed] = useState<Record<string, number>>({})
  const lock = useRef(false)
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <Heading level={2} size="card">
          {vi ? 'Import module và bài học' : 'Import modules and lessons'}
        </Heading>
        <p className="text-sm text-muted-foreground">
          {vi
            ? 'Dùng Excel theo mẫu, hoặc ZIP chứa modules.xlsx và tài nguyên. Kiểm tra toàn bộ trước khi xác nhận.'
            : 'Use the Excel template, or a ZIP containing modules.xlsx and assets. Review the entire batch before confirming.'}
        </p>
        <a
          className="text-primary underline"
          href="/api/v1/module-management/imports/template"
        >
          {vi
            ? 'Tải mẫu Excel và hướng dẫn'
            : 'Download Excel template and instructions'}
        </a>
        <Input
          type="file"
          aria-label={vi ? 'File import module' : 'Module import file'}
          accept=".xlsx,.zip"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file)
              void run(async () => {
                setPreview(null)
                setPreview(
                  await uploadLearningFile<ImportPreview>('/imports', file),
                )
              })
            event.target.value = ''
          }}
        />
        {busy && (
          <p role="status">
            {vi ? 'Đang xử lý gói import…' : 'Processing import…'}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-success">
            {notice}
          </p>
        )}
        {preview && (
          <>
            <p>
              {preview.modules.length}{' '}
              {vi ? 'module trong gói' : 'modules in this batch'}
            </p>
            <ul className="space-y-1">
              {preview.modules.map((row) => (
                <li key={row.moduleId} className="break-words">
                  {row.moduleId} · {row.module.title} · {row.lessons.length}{' '}
                  {vi ? 'bài học' : 'lessons'}
                  {preview.ownedDuplicates.includes(row.moduleId) && (
                    <strong className="ml-2 text-warning">
                      {vi
                        ? 'Module bạn phụ trách bị trùng — sẽ tạo bản sửa'
                        : 'Your existing module — creates a revision'}
                    </strong>
                  )}
                </li>
              ))}
            </ul>
            {preview.errors.length > 0 && (
              <div
                role="alert"
                className="rounded border border-destructive p-3"
              >
                <p className="font-semibold text-destructive">
                  {vi
                    ? 'Chưa thể import. Cần sửa tất cả lỗi:'
                    : 'Import blocked. Resolve every error:'}
                </p>
                <ul className="list-inside list-disc">
                  {preview.errors.map((problem, i) => (
                    <li key={i}>
                      {problem.moduleId} · {vi ? 'dòng' : 'row'} {problem.row}:{' '}
                      {problem.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preview.modules.flatMap((row) =>
              row.lessons
                .filter((l) => l.type === 'VIDEO' && l.videoSource !== 'UPLOAD')
                .map((lesson) => {
                  const key = `${row.moduleId}:${lesson.id}`
                  return (
                    <div
                      key={key}
                      className="space-y-2 rounded border border-border p-3"
                    >
                      <p>
                        {row.moduleId} · {lesson.title}
                      </p>
                      <LessonVideo
                        lesson={lesson}
                        onSample={(sample) => {
                          if (sample.playing && sample.duration > 0)
                            setPlayed((old) =>
                              old[key] === sample.duration
                                ? old
                                : { ...old, [key]: sample.duration },
                            )
                        }}
                      />
                      <Button
                        disabled={busy || !played[key]}
                        variant="outline"
                        onClick={() =>
                          void run(async () => {
                            await moduleRequest('/videos/verify', 'POST', {
                              provider: lesson.videoSource,
                              url: lesson.videoUrl,
                              played: true,
                              durationSeconds: played[key],
                            })
                            setPreview(
                              await moduleRequest<ImportPreview>(
                                `/imports/${preview.id}`,
                              ),
                            )
                          })
                        }
                      >
                        {vi
                          ? 'Kiểm tra video và cập nhật kết quả'
                          : 'Verify video and refresh validation'}
                      </Button>
                    </div>
                  )
                }),
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy || preview.committed}
                onClick={() =>
                  void run(async () =>
                    setPreview(
                      await moduleRequest<ImportPreview>(
                        `/imports/${preview.id}`,
                      ),
                    ),
                  )
                }
              >
                {vi ? 'Kiểm tra lại' : 'Validate again'}
              </Button>
              <Button
                disabled={
                  busy || preview.errors.length > 0 || preview.committed
                }
                onClick={() => setConfirm(true)}
              >
                {vi ? 'Tiếp tục import' : 'Continue import'}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                {vi ? 'Hủy gói' : 'Cancel batch'}
              </Button>
            </div>
          </>
        )}
        <Dialog
          open={confirm}
          onOpenChange={(open) => {
            if (!busy) setConfirm(open)
          }}
          ariaLabel={vi ? 'Xác nhận import' : 'Confirm import'}
        >
          <DialogHeader>
            <DialogTitle>
              {vi ? 'Import gói dữ liệu này?' : 'Import this batch?'}
            </DialogTitle>
          </DialogHeader>
          <p>
            {preview?.ownedDuplicates.length
              ? vi
                ? `Các module bạn phụ trách bị trùng: ${preview.ownedDuplicates.join(', ')}. Dữ liệu import sẽ trở thành bản chỉnh sửa mới và cần gửi duyệt lại.`
                : `Your modules already exist: ${preview.ownedDuplicates.join(', ')}. Import creates new draft revisions that require approval.`
              : vi
                ? 'Tạo các module mới cùng toàn bộ bài học đã kiểm tra.'
                : 'Create the new modules with all validated lessons.'}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              {vi ? 'Hủy' : 'Cancel'}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!preview) return
                  await moduleRequest(`/imports/${preview.id}/commit`, 'POST', {
                    confirmOwnedDuplicates: true,
                  })
                  setConfirm(false)
                  setPreview(null)
                  setNotice(
                    vi
                      ? 'Đã import. Các bản nháp cần được gửi duyệt.'
                      : 'Imported. Submit the drafts for review.',
                  )
                  onImported()
                })
              }
            >
              {vi ? 'Xác nhận import' : 'Confirm import'}
            </Button>
          </DialogFooter>
        </Dialog>
      </CardContent>
    </Card>
  )
}
