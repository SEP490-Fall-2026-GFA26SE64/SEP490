import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../shared/components/ui/Dialog'
import { Button } from '../../../../shared/components/ui/Button'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Progress } from '../../../../shared/components/ui/Progress'
import { getActiveCompany } from '../../../../shared/stores/companyStore'
import type { Reference } from '../../../subscription/subscriptionApi'
import {
  buildOrganizationTargetRoles,
  fetchOrganizationTargetRoles,
  readTargetRoleMeta,
  type CatalogJobPosition,
  type DepartmentItem,
} from '../userAssignmentOptions'
import { parseUserImportFile, type ParseError } from './userImportParser'
import { buildImportCatalog, validateImportRows, type ValidatedImportRow } from './userImportValidation'
import { buildUserImportWorkbook, downloadBlob, prefillFromRows, workbookToBlob } from './userImportTemplate'
import { sendImportInvitation } from './userImportSubmit'
import { IMPORT_COLUMNS, MAX_IMPORT_ROWS, ROLE_LABELS, type CopyFn, type ImportLanguage } from './userImportShared'

type Phase = 'upload' | 'preview' | 'importing' | 'done'
type ImportOutcome = { rowNumber: number; ok: boolean; message?: string }

export interface UserImportDialogProps {
  open: boolean
  onClose: () => void
  organization: string
  organizationName?: string | null
  language: ImportLanguage
  c: CopyFn
  departments: DepartmentItem[]
  jobPositions: CatalogJobPosition[]
  references: Reference[]
  existingEmails: string[]
  enabled: boolean
  onImported: (createdCount: number) => Promise<void>
}

function parseErrorMessage(error: ParseError, c: CopyFn, language: ImportLanguage): string {
  switch (error.code) {
    case 'invalidFile': return c('This file cannot be read. Upload an .xlsx file created from the template.', 'Không đọc được tệp. Hãy tải lên tệp .xlsx tạo từ file mẫu.')
    case 'missingSheet': return c('The Users tab was not found. Use the downloaded template and keep its tabs unchanged.', 'Không tìm thấy tab Người dùng. Hãy dùng file mẫu đã tải và giữ nguyên các tab.')
    case 'missingHeaders': {
      const names = error.missing.map(field => IMPORT_COLUMNS.find(column => column.field === field)?.header[language] ?? field).join(', ')
      return c(`Required columns are missing: ${names}. Do not rename the header row.`, `Thiếu cột bắt buộc: ${names}. Không đổi tên dòng tiêu đề.`)
    }
    case 'empty': return c('The file has no user rows. Enter at least one user below the header row.', 'Tệp chưa có dòng người dùng nào. Hãy nhập ít nhất một người dùng dưới dòng tiêu đề.')
    case 'tooManyRows': return c(`The file has ${error.count} rows; the limit is ${MAX_IMPORT_ROWS} per file. Split it into several files.`, `Tệp có ${error.count} dòng; giới hạn là ${MAX_IMPORT_ROWS} dòng mỗi tệp. Hãy chia thành nhiều tệp.`)
  }
}

function serverMessage(error: unknown, c: CopyFn): string {
  const raw = error instanceof Error ? error.message : ''
  if (/network error|failed to fetch/i.test(raw)) return c('Unable to connect to the server.', 'Không thể kết nối với máy chủ.')
  return raw || c('The invitation could not be sent.', 'Không gửi được lời mời.')
}

function isXlsx(file: File) {
  return /\.xlsx$/i.test(file.name)
}

export function UserImportDialog(props: UserImportDialogProps) {
  const { open, onClose, organization, organizationName, language, c, departments, jobPositions, references, existingEmails, enabled, onImported } = props
  const [phase, setPhase] = useState<Phase>('upload')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [rows, setRows] = useState<ValidatedImportRow[]>([])
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([])
  const [dragging, setDragging] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const targetRolesQuery = useQuery({
    queryKey: ['admin-org-target-roles', organization],
    queryFn: () => fetchOrganizationTargetRoles(organization),
    enabled: open && Boolean(organization),
    staleTime: 15000,
  })

  const catalog = useMemo(() => {
    const targetRoles = buildOrganizationTargetRoles(organization, getActiveCompany(), targetRolesQuery.data, readTargetRoleMeta(organization), jobPositions)
    return buildImportCatalog({ departments, jobPositions, references, targetRoles, organization })
  }, [organization, targetRolesQuery.data, departments, jobPositions, references])

  const validRows = rows.filter(row => row.resolved)
  const invalidRows = rows.filter(row => !row.resolved)
  const visibleRows = errorsOnly ? invalidRows : rows
  const failedImports = outcomes.filter(outcome => !outcome.ok)
  const createdCount = outcomes.filter(outcome => outcome.ok).length
  const busy = phase === 'importing'

  const reset = () => {
    setPhase('upload'); setFileName(''); setParseError(null); setRows([]); setErrorsOnly(false); setProgress(0); setOutcomes([])
    if (inputRef.current) inputRef.current.value = ''
  }
  const close = () => { if (busy) return; reset(); onClose() }

  const downloadTemplate = async () => {
    setDownloading(true)
    try {
      const workbook = await buildUserImportWorkbook({ language, organizationName, catalog })
      downloadBlob(await workbookToBlob(workbook), language === 'vi' ? 'mau-nhap-nguoi-dung.xlsx' : 'user-import-template.xlsx')
    } finally {
      setDownloading(false)
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setParseError(null)
    setFileName(file.name)
    if (!isXlsx(file)) {
      setParseError(c('Only .xlsx files are supported. Save the file as Excel Workbook (.xlsx).', 'Chỉ hỗ trợ tệp .xlsx. Hãy lưu tệp dạng Excel Workbook (.xlsx).'))
      return
    }
    setReading(true)
    try {
      const result = await parseUserImportFile(await file.arrayBuffer())
      if (!result.ok) { setParseError(parseErrorMessage(result.error, c, language)); return }
      setRows(validateImportRows(result.rows, catalog, existingEmails, c))
      setErrorsOnly(false)
      setPhase('preview')
    } catch {
      setParseError(c('This file cannot be read. Upload an .xlsx file created from the template.', 'Không đọc được tệp. Hãy tải lên tệp .xlsx tạo từ file mẫu.'))
    } finally {
      setReading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  const runImport = async () => {
    setPhase('importing')
    setProgress(0)
    const results: ImportOutcome[] = []
    for (const row of validRows) {
      try {
        await sendImportInvitation(row.resolved!, organization)
        results.push({ rowNumber: row.raw.rowNumber, ok: true })
      } catch (error) {
        results.push({ rowNumber: row.raw.rowNumber, ok: false, message: serverMessage(error, c) })
      }
      setProgress(results.length)
      setOutcomes([...results])
    }
    if (validRows.some(row => row.resolved?.role === 'LD_MANAGER')) window.dispatchEvent(new Event('departments_updated'))
    await onImported(results.filter(result => result.ok).length)
    setPhase('done')
  }

  const downloadErrorReport = async () => {
    const serverErrors = new Map(failedImports.map(outcome => [outcome.rowNumber, outcome.message ?? '']))
    const failed = rows
      .filter(row => !row.resolved || serverErrors.has(row.raw.rowNumber))
      .map(row => ({
        raw: row.raw,
        error: row.resolved ? serverErrors.get(row.raw.rowNumber) ?? '' : row.issues.map(issue => issue.message).join(' '),
      }))
    if (failed.length === 0) return
    setDownloading(true)
    try {
      const workbook = await buildUserImportWorkbook({ language, organizationName, catalog }, prefillFromRows(failed))
      downloadBlob(await workbookToBlob(workbook), language === 'vi' ? 'bao-cao-loi-nhap-nguoi-dung.xlsx' : 'user-import-errors.xlsx')
    } finally {
      setDownloading(false)
    }
  }

  const roleText = (row: ValidatedImportRow) => row.resolved ? ROLE_LABELS[row.resolved.role][language] : row.raw.role || '—'
  const outcomeFor = (rowNumber: number) => outcomes.find(outcome => outcome.rowNumber === rowNumber)
  const hasReportRows = invalidRows.length > 0 || failedImports.length > 0
  const rowViews = visibleRows.map(row => {
    const outcome = outcomeFor(row.raw.rowNumber)
    const pending = phase === 'importing' && row.resolved && !outcome
    const status = !row.resolved
      ? <Badge variant="destructive">{c('Error', 'Lỗi')}</Badge>
      : outcome?.ok ? <Badge variant="success">{c('Invited', 'Đã mời')}</Badge>
        : outcome ? <Badge variant="destructive">{c('Failed', 'Thất bại')}</Badge>
          : pending ? <Badge variant="outline">{c('Waiting', 'Đang chờ')}</Badge>
            : <Badge variant="success">{c('Valid', 'Hợp lệ')}</Badge>
    const assignmentItems = [row.resolved?.department?.label ?? row.raw.department, row.resolved?.jobPosition?.label ?? (row.resolved?.role === 'LD_MANAGER' ? '' : row.raw.jobPosition)].filter(Boolean)
    const target = row.resolved?.targetRole ? `${row.resolved.targetRole.label}${row.resolved.level ? ` · ${row.resolved.level}` : ''}` : ''
    const messages = row.resolved ? (outcome?.message ? [outcome.message] : []) : row.issues.map(issue => issue.message)
    return {
      rowNumber: row.raw.rowNumber,
      status,
      fullName: row.raw.fullName || '—',
      email: row.raw.email || '—',
      role: roleText(row),
      assignment: (
        <>
          {assignmentItems.length > 0 ? assignmentItems.map(item => <p key={item}>{item}</p>) : '—'}
          {target && <p className="text-caption text-muted-foreground">{target}</p>}
        </>
      ),
      details: messages.length > 0 ? (
        <ul className="space-y-1">
          {messages.map(message => (
            <li key={message} className="flex gap-1.5 text-destructive">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </li>
          ))}
        </ul>
      ) : <span className="text-muted-foreground">{outcome?.ok ? c('Invitation sent', 'Đã gửi lời mời') : c('Ready', 'Sẵn sàng')}</span>,
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={next => { if (!next) close() }}
      ariaLabel={c('Import users from Excel', 'Nhập người dùng từ Excel')}
      closeLabel={c('Close', 'Đóng')}
      className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden p-6 sm:p-8"
    >
      <DialogHeader className="mb-4 shrink-0">
        <DialogTitle className="text-section font-bold">{c('Import users from Excel', 'Nhập người dùng từ Excel')}</DialogTitle>
        <DialogDescription>
          {c(`Create up to ${MAX_IMPORT_ROWS} users at once. Each valid row receives an activation invitation; seats are counted once activated.`,
            `Tạo tối đa ${MAX_IMPORT_ROWS} người dùng cùng lúc. Mỗi dòng hợp lệ sẽ nhận lời mời kích hoạt; ghế chỉ được tính sau khi kích hoạt.`)}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {phase === 'upload' && (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs" aria-labelledby="import-step-template">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-body-sm font-bold text-primary" aria-hidden="true">1</span>
                <h3 id="import-step-template" className="text-card font-semibold text-foreground">{c('Download the template', 'Tải file mẫu')}</h3>
              </div>
              <p className="text-body-sm text-muted-foreground">
                {c('The template contains an Instructions tab with the rules, a Users tab to fill in, and a Lists tab with your current departments, job positions and Target roles.',
                  'File mẫu gồm tab Hướng dẫn từng bước, tab Người dùng để điền thông tin và tab Danh mục chứa phòng ban, vị trí công việc, vai trò mục tiêu hiện có.')}
              </p>
              <ul className="space-y-1 text-body-sm text-foreground">
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{c('Drop-down lists for role and assignments', 'Danh sách thả xuống cho vai trò và phân công')}</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{c('Required columns marked with *', 'Cột bắt buộc được đánh dấu *')}</li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{c(`Up to ${MAX_IMPORT_ROWS} users per file`, `Tối đa ${MAX_IMPORT_ROWS} người dùng mỗi tệp`)}</li>
              </ul>
              <div className="mt-auto pt-2">
                <Button variant="outline" leftIcon={<Download size={16} aria-hidden="true" />} isLoading={downloading || targetRolesQuery.isPending} onClick={() => void downloadTemplate()}>
                  {c('Download template (.xlsx)', 'Tải file mẫu (.xlsx)')}
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xs" aria-labelledby="import-step-upload">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-body-sm font-bold text-primary" aria-hidden="true">2</span>
                <h3 id="import-step-upload" className="text-card font-semibold text-foreground">{c('Upload the completed file', 'Tải lên tệp đã điền')}</h3>
              </div>
              <div
                onDragOver={event => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-primary bg-secondary' : 'border-border bg-muted/40'}`}
              >
                <FileSpreadsheet size={36} className="text-primary" aria-hidden="true" />
                <p className="text-body-sm text-foreground">{c('Drag and drop the .xlsx file here, or', 'Kéo thả tệp .xlsx vào đây, hoặc')}</p>
                <input
                  ref={inputRef}
                  id="user-import-file"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  aria-label={c('Choose Excel file', 'Chọn tệp Excel')}
                  onChange={event => void handleFile(event.target.files?.[0])}
                />
                <Button leftIcon={<Upload size={16} aria-hidden="true" />} isLoading={reading} disabled={!enabled} onClick={() => inputRef.current?.click()}>
                  {c('Choose file', 'Chọn tệp')}
                </Button>
                {fileName && <p className="text-caption text-muted-foreground break-all">{fileName}</p>}
              </div>
              {parseError && (
                <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-card p-3 text-body-sm text-foreground">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
                  <span><strong className="font-semibold">{c('File not accepted:', 'Tệp không hợp lệ:')}</strong> {parseError}</span>
                </div>
              )}
            </section>
          </div>
        )}

        {phase !== 'upload' && (
          <>
            <div className="flex flex-wrap items-center gap-2" role="status">
              <span className="text-body-sm text-muted-foreground break-all">{fileName}</span>
              <Badge variant="outline">{c(`${rows.length} rows`, `${rows.length} dòng`)}</Badge>
              <Badge variant="success">{c(`${validRows.length} valid`, `${validRows.length} hợp lệ`)}</Badge>
              {invalidRows.length > 0 && <Badge variant="destructive">{c(`${invalidRows.length} with errors`, `${invalidRows.length} có lỗi`)}</Badge>}
            </div>

            {phase === 'preview' && invalidRows.length > 0 && (
              <div role="alert" className="rounded-lg border border-warning/40 bg-card p-3 text-body-sm text-foreground">
                {c(`${invalidRows.length} row(s) have errors and will be skipped. Only the ${validRows.length} valid row(s) will be imported. Download the error report to fix them.`,
                  `${invalidRows.length} dòng có lỗi và sẽ bị bỏ qua. Chỉ ${validRows.length} dòng hợp lệ được nhập. Tải báo cáo lỗi để sửa.`)}
              </div>
            )}

            {(phase === 'importing' || phase === 'done') && (
              <Progress
                value={progress}
                max={Math.max(validRows.length, 1)}
                variant={phase === 'done' && failedImports.length > 0 ? 'warning' : 'primary'}
                label={c(`Sending invitations ${progress}/${validRows.length}`, `Đang gửi lời mời ${progress}/${validRows.length}`)}
              />
            )}

            {phase === 'done' && (
              <div role="status" className={`flex gap-2 rounded-lg border bg-card p-3 text-body-sm text-foreground ${failedImports.length > 0 ? 'border-warning/40' : 'border-success/30'}`}>
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <span>
                  {c(`${createdCount} invitation(s) sent. ${failedImports.length + invalidRows.length} row(s) not imported.`,
                    `Đã gửi ${createdCount} lời mời. ${failedImports.length + invalidRows.length} dòng chưa được nhập.`)}
                </span>
              </div>
            )}

            {invalidRows.length > 0 && phase === 'preview' && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-body-sm text-foreground">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={errorsOnly} onChange={event => setErrorsOnly(event.target.checked)} />
                {c('Show rows with errors only', 'Chỉ hiển thị dòng có lỗi')}
              </label>
            )}

            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
              <table className="w-full min-w-[760px] text-left text-body-sm">
                <caption className="sr-only">{c('Import preview', 'Xem trước dữ liệu nhập')}</caption>
                <thead className="bg-muted text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">{c('Row', 'Dòng')}</th>
                    <th scope="col" className="px-3 py-2">{c('Status', 'Trạng thái')}</th>
                    <th scope="col" className="px-3 py-2">{c('User', 'Người dùng')}</th>
                    <th scope="col" className="px-3 py-2">{c('Role', 'Vai trò')}</th>
                    <th scope="col" className="px-3 py-2">{c('Assignment', 'Phân công')}</th>
                    <th scope="col" className="px-3 py-2">{c('Details', 'Chi tiết')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rowViews.map(view => (
                    <tr key={view.rowNumber} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-medium text-muted-foreground">{view.rowNumber}</td>
                      <td className="px-3 py-2">{view.status}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{view.fullName}</p>
                        <p className="break-all text-caption text-muted-foreground">{view.email}</p>
                      </td>
                      <td className="px-3 py-2 text-foreground">{view.role}</td>
                      <td className="px-3 py-2 text-foreground">{view.assignment}</td>
                      <td className="px-3 py-2">{view.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden" aria-label={c('Import preview', 'Xem trước dữ liệu nhập')}>
              {rowViews.map(view => (
                <li key={view.rowNumber} className="rounded-xl border border-border bg-card p-3 text-body-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{c(`Row ${view.rowNumber}`, `Dòng ${view.rowNumber}`)}</p>
                      <p className="font-medium text-foreground">{view.fullName}</p>
                      <p className="break-all text-caption text-muted-foreground">{view.email}</p>
                    </div>
                    {view.status}
                  </div>
                  <p className="mt-2 text-foreground">{view.role}</p>
                  <div className="text-foreground">{view.assignment}</div>
                  <div className="mt-2">{view.details}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <DialogFooter className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {phase === 'preview' && (
          <Button variant="ghost" leftIcon={<RotateCcw size={16} aria-hidden="true" />} onClick={reset}>
            {c('Choose another file', 'Chọn tệp khác')}
          </Button>
        )}
        {(phase === 'preview' || phase === 'done') && hasReportRows && (
          <Button variant="outline" leftIcon={<Download size={16} aria-hidden="true" />} isLoading={downloading} onClick={() => void downloadErrorReport()}>
            {c('Download error report', 'Tải báo cáo lỗi')}
          </Button>
        )}
        {phase === 'done' || phase === 'upload' ? (
          <Button variant={phase === 'done' ? 'primary' : 'outline'} onClick={close}>{phase === 'done' ? c('Done', 'Hoàn tất') : c('Cancel', 'Hủy')}</Button>
        ) : (
          <>
            <Button variant="outline" disabled={busy} onClick={close}>{c('Cancel', 'Hủy')}</Button>
            <Button isLoading={busy} disabled={!enabled || validRows.length === 0 || busy} onClick={() => void runImport()}>
              {c(`Import ${validRows.length} valid user(s)`, `Nhập ${validRows.length} người dùng hợp lệ`)}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  )
}
