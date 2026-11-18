import { useState } from 'react'
import { ChevronDown, Download, FileUp } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/utils'
import { FileDropzone } from '../ui/FileDropzone'
import type { BankPreview } from '../../api/questionBankApi'
import { Heading } from '../typography/Heading'
import { Text } from '../typography/Text'
import { buttonVariants } from '../ui/Button'

type Copy = (en: string, vi: string) => string
export interface ImportFileInfo { name: string; bytes: number }
export function QuestionImportUpload({ busy, file, maxBytes, maxRows, onUpload, onTemplate, copy }: {
  busy: boolean; file: ImportFileInfo | null; maxBytes: number; maxRows: number
  onUpload: (file: File) => void; onTemplate: (lang: 'vi' | 'en') => void; copy: Copy
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <section className="space-y-4">
    <div><Heading level={3}>{copy('Upload your questions', 'Tải file câu hỏi')}</Heading><Text variant="body-sm" className="mt-1 text-muted-foreground">{copy(`Excel (.xlsx) · up to ${maxBytes / 1048576} MB · ${maxRows} rows`, `Excel (.xlsx) · tối đa ${maxBytes / 1048576} MB · ${maxRows} dòng`)}</Text></div>
    <FileDropzone busy={busy} accept=".xlsx" label={copy('Select file', 'Chọn file')} onFile={onUpload} copy={copy} />
    {file && <div role="status" className="flex items-start gap-3 rounded-lg border border-border px-4 py-3"><FileUp className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><Text variant="body-sm" className="break-words font-medium">{file.name}</Text><Text variant="caption" className="text-muted-foreground">{(file.bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</Text></div></div>}
    <div className="flex flex-wrap items-center gap-2">
      <Text variant="body-sm" className="mr-auto text-muted-foreground">{copy('Need the right format?', 'Cần định dạng mẫu?')}</Text>
      <div className="inline-flex items-center rounded-md border border-border shadow-2xs bg-secondary">
        <button
          type="button"
          disabled={busy}
          onClick={() => onTemplate(copy('en', 'vi') as 'vi' | 'en')}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'h-8 rounded-r-none border-r border-border gap-2 font-medium text-primary hover:bg-secondary-hover cursor-pointer')}
        >
          <Download className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{copy('Excel template', 'Mẫu Excel')}</span>
        </button>
        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={busy}
              className="flex h-8 items-center justify-center rounded-r-md px-2 text-primary hover:bg-secondary-hover cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              title={copy('Choose template language', 'Chọn ngôn ngữ mẫu')}
              aria-label={copy('Choose template language', 'Chọn ngôn ngữ mẫu')}
            >
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={4} className="z-50 w-64 rounded-lg border border-border bg-card p-1.5 shadow-md focus:outline-none">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onTemplate('vi') }}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="text-sm">🇻🇳</span>
                  <div>
                    <div className="font-semibold">{copy('Vietnamese template', 'Mẫu Tiếng Việt')}</div>
                    <div className="text-[10px] text-muted-foreground">{copy('Questions + Vietnamese guide', 'Questions + hướng dẫn tiếng Việt')}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onTemplate('en') }}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="text-sm">🇬🇧</span>
                  <div>
                    <div className="font-semibold">{copy('English template', 'Mẫu Tiếng Anh')}</div>
                    <div className="text-[10px] text-muted-foreground">{copy('Questions + English guide', 'Questions + hướng dẫn tiếng Anh')}</div>
                  </div>
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
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

