import * as React from 'react'
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Upload,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog'
import { useToast } from '../../hooks/useToast'

export interface ImportPreset {
  id: string
  name: string
  description: string
  badge: string
  itemCount: number
  previewSnippet: string
  payload: unknown
}

interface QuickConfigImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  entityName: string
  description?: string
  presets?: ImportPreset[]
  onImport: (data: unknown, source: 'preset' | 'custom') => void
  sampleJsonPlaceholder?: string
}

export function QuickConfigImportModal({
  open,
  onOpenChange,
  title,
  entityName,
  description = `Upload an Excel spreadsheet (.xlsx, .xls, .csv) to populate ${entityName.toLowerCase()} in bulk.`,
  presets = [],
  onImport,
  sampleJsonPlaceholder,
}: QuickConfigImportModalProps) {
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = React.useState(false)
  const [parsedRows, setParsedRows] = React.useState<Record<string, unknown>[]>([])
  const [fileName, setFileName] = React.useState<string>('')
  const [sheetName, setSheetName] = React.useState<string>('')
  const [importSource, setImportSource] = React.useState<'preset' | 'custom'>('custom')

  // Reset when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setParsedRows([])
      setFileName('')
      setSheetName('')
      setIsDragging(false)
    }
  }, [open])

  const processFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      toast({
        title: 'Unsupported File Format',
        description: 'Please upload an Excel workbook (.xlsx, .xls) or .csv file.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        if (!firstSheet) {
          throw new Error('Workbook contains no sheets.')
        }

        const worksheet = workbook.Sheets[firstSheet]
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

        if (!rawJson || rawJson.length === 0) {
          toast({
            title: 'Empty Sheet',
            description: `No data rows found in worksheet "${firstSheet}".`,
            variant: 'destructive',
          })
          return
        }

        setParsedRows(rawJson)
        setFileName(file.name)
        setSheetName(firstSheet)
        setImportSource('custom')

        toast({
          title: 'Excel File Loaded',
          description: `Parsed ${rawJson.length} records from sheet "${firstSheet}".`,
          variant: 'success',
        })
      } catch (err) {
        toast({
          title: 'Failed to Parse Excel File',
          description: err instanceof Error ? err.message : 'Please check your file structure and try again.',
          variant: 'destructive',
        })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDownloadTemplate = () => {
    try {
      let sampleData: Record<string, unknown>[] = []
      if (presets[0]?.payload && Array.isArray(presets[0].payload)) {
        sampleData = (presets[0].payload as Record<string, unknown>[]).slice(0, 3)
      } else if (sampleJsonPlaceholder) {
        try {
          const parsed = JSON.parse(sampleJsonPlaceholder)
          sampleData = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          sampleData = [{ code: 'SAMPLE-01', name: `Sample ${entityName}`, description: 'Description here' }]
        }
      } else {
        sampleData = [{ code: 'SAMPLE-01', name: `Sample ${entityName}`, description: 'Description here' }]
      }

      // Flatten object properties for clean tabular display
      const flatData = sampleData.map((row) => {
        const flatRow: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(row)) {
          if (typeof val === 'object' && val !== null) {
            flatRow[key] = JSON.stringify(val)
          } else {
            flatRow[key] = val
          }
        }
        return flatRow
      })

      const ws = XLSX.utils.json_to_sheet(flatData)
      const wb = XLSX.utils.book_new()
      const safeSheetTitle = entityName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31) || 'Sheet1'
      XLSX.utils.book_append_sheet(wb, ws, safeSheetTitle)
      const exportName = `${entityName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_template.xlsx`
      XLSX.writeFile(wb, exportName)

      toast({
        title: 'Template Downloaded',
        description: `Saved "${exportName}". Fill out records and upload to import.`,
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Unable to generate Excel template.',
        variant: 'destructive',
      })
    }
  }

  const handleLoadSampleDataset = (preset: ImportPreset) => {
    if (!preset.payload) return
    const rawList = Array.isArray(preset.payload)
      ? (preset.payload as Record<string, unknown>[])
      : [preset.payload as Record<string, unknown>]

    setParsedRows(rawList)
    setFileName(`${preset.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`)
    setSheetName(entityName)
    setImportSource('preset')

    toast({
      title: 'Sample Dataset Loaded',
      description: `Loaded ${rawList.length} records from curated "${preset.name}".`,
      variant: 'info',
    })
  }

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return
    onImport(parsedRows, importSource)
    toast({
      title: 'Excel Import Completed',
      description: `Imported ${parsedRows.length} ${entityName} records successfully.`,
      variant: 'success',
    })
    onOpenChange(false)
  }

  const columns = React.useMemo(() => {
    if (parsedRows.length === 0) return []
    return Object.keys(parsedRows[0])
  }, [parsedRows])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-4xl sm:max-w-4xl xl:max-w-5xl w-[94vw] max-h-[92vh] overflow-y-auto p-6 sm:p-7"
    >
      <div className="space-y-5">
        <DialogHeader className="mb-1">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
              <FileSpreadsheet size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* TOP TOOLBAR: Preset Samples */}
        {presets.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles size={13} className="text-primary" />
                <span>Or load curated preset:</span>
              </span>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadSampleDataset(preset)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-primary/25 bg-secondary hover:bg-secondary/80 text-primary transition-colors cursor-pointer"
                >
                  {preset.name} ({preset.itemCount})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* UPLOAD DROPZONE / SPREADSHEET PREVIEW */}
        {parsedRows.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
              isDragging
                ? 'border-primary bg-primary/10 scale-[0.99]'
                : 'border-border bg-card hover:bg-muted/30 hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
              <FileUp size={32} />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">
              Drop your Excel spreadsheet here, or Browse
            </h3>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-4">
              Upload your completed Excel template or spreadsheet. Supports{' '}
              <strong className="text-foreground">.xlsx, .xls, .csv</strong> files.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-mono">
                .XLSX
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono">
                .XLS
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono">
                .CSV
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Parsed File Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>{fileName}</span>
                    <Badge variant="success" className="text-[10px] py-0 px-2 font-mono">
                      {sheetName}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{parsedRows.length} records detected</span>
                    <span>•</span>
                    <span>{columns.length} columns mapped</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload size={13} />}
                  className="text-xs"
                >
                  Change File
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedRows([])
                    setFileName('')
                    setSheetName('')
                  }}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={13} className="mr-1" />
                  Clear
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Excel Table Grid Preview */}
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
              <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TableIcon size={14} className="text-primary" />
                  <span>Worksheet Data Preview</span>
                </div>
                <span className="text-[11px] font-mono">
                  Showing first {Math.min(parsedRows.length, 10)} of {parsedRows.length} rows
                </span>
              </div>

              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted/95 backdrop-blur-xs border-b border-border z-10">
                    <tr>
                      <th className="py-2 px-3 font-mono text-[11px] text-muted-foreground uppercase border-r border-border/50 w-12 text-center">
                        #
                      </th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="py-2 px-3 font-semibold text-[11px] text-foreground uppercase border-r border-border/50 last:border-r-0 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-[11px]">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground text-center border-r border-border/50 bg-muted/10 font-medium">
                          {idx + 1}
                        </td>
                        {columns.map((col) => {
                          const val = row[col]
                          const displayStr =
                            typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')
                          return (
                            <td
                              key={col}
                              className="py-2 px-3 text-foreground/90 border-r border-border/50 last:border-r-0 max-w-xs truncate"
                              title={displayStr}
                            >
                              {displayStr || <span className="text-muted-foreground/40 italic">null</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 10 && (
                <div className="p-2.5 text-center text-[11px] text-muted-foreground bg-muted/20 border-t border-border">
                  + {parsedRows.length - 10} additional rows will be imported from this spreadsheet.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between sm:justify-between gap-2 w-full mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            leftIcon={<Download size={14} className="text-primary" />}
            className="text-xs font-semibold shadow-2xs w-full sm:w-auto"
          >
            Download Excel Template (.xlsx)
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 size={14} />}
              onClick={handleConfirmImport}
              disabled={parsedRows.length === 0}
              className="font-semibold shadow-2xs px-5"
            >
              Import {parsedRows.length > 0 ? `${parsedRows.length} ` : ''}Records from Excel
            </Button>
          </div>
        </DialogFooter>
      </div>
    </Dialog>
  )
}
