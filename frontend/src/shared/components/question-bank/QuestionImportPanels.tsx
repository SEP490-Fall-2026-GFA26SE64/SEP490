import { FileDropzone } from '../ui/FileDropzone'
import { FileUp } from 'lucide-react'
import type { BankPreview } from '../../api/questionBankApi'
import { Heading } from '../typography/Heading'
import { Text } from '../typography/Text'
import { Button } from '../ui/Button'

type Copy = (en: string, vi: string) => string
export interface ImportFileInfo { name: string; bytes: number }
export function QuestionImportUpload({ busy, file, maxBytes, maxRows, onUpload, onTemplate, copy }: {
  busy: boolean; file: ImportFileInfo | null; maxBytes: number; maxRows: number
  onUpload: (file: File) => void; onTemplate: (format: 'xlsx' | 'json') => void; copy: Copy
}) {
  return <section className="space-y-4">
    <div><Heading level={3}>{copy('Upload your questions', 'Tải file câu hỏi')}</Heading><Text variant="body-sm" className="mt-1 text-muted-foreground">{copy(`Excel (.xlsx) or JSON · up to ${maxBytes / 1048576} MB · ${maxRows} rows`, `Excel (.xlsx) hoặc JSON · tối đa ${maxBytes / 1048576} MB · ${maxRows} dòng`)}</Text></div>
    <FileDropzone busy={busy} accept=".xlsx,.json" label={copy('Select file', 'Chọn file')} onFile={onUpload} copy={copy} />
    {file && <div role="status" className="flex items-start gap-3 rounded-lg border border-border px-4 py-3"><FileUp className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><Text variant="body-sm" className="break-words font-medium">{file.name}</Text><Text variant="caption" className="text-muted-foreground">{(file.bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</Text></div></div>}
    <div className="flex flex-wrap items-center gap-2"><Text variant="body-sm" className="mr-auto text-muted-foreground">{copy('Need the right format?', 'Cần định dạng mẫu?')}</Text><Button variant="outline" size="sm" disabled={busy} onClick={() => onTemplate('xlsx')}>{copy('Excel template', 'Mẫu Excel')}</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => onTemplate('json')}>{copy('JSON template', 'Mẫu JSON')}</Button></div>
  </section>
}

export function ImportValidationSummary({ preview, totalRows, copy }: { preview: BankPreview; totalRows: number; copy: Copy }) {
  // A row can have multiple duplicate warnings; count distinct candidate codes, never warning strings.
  const duplicateRows = preview.rows.filter(row => row.code && preview.warnings.some(warning => warning.startsWith(row.code + ': matching content'))).length
  const stats = [
    [copy('Total rows', 'Tổng số dòng'), totalRows],
    [copy('Accepted drafts', 'Bản nháp hợp lệ'), preview.rows.length],
    [copy('Rejected rows', 'Dòng không hợp lệ'), Math.max(0, totalRows - preview.rows.length)],
    [copy('Matching content', 'Nội dung trùng'), duplicateRows],
  ] as const
  return <dl aria-label={copy('Import validation summary', 'Tổng kết kiểm tra file')} className="grid grid-cols-2 divide-border rounded-xl border border-border bg-muted/30 sm:grid-cols-4">{stats.map(([label, count]) => <div key={label} className="min-w-0 px-4 py-3"><dt className="text-caption text-muted-foreground">{label}</dt><dd className="mt-1 text-subsection font-semibold tabular-nums">{count}</dd></div>)}</dl>
}

