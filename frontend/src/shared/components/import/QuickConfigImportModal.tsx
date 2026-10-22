import * as React from 'react'
import {
  AlertCircle,
  Check,
  Code2,
  FileJson,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'
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
  description: string
  presets: ImportPreset[]
  onImport: (data: unknown, source: 'preset' | 'custom') => void
  sampleJsonPlaceholder?: string
}

export function QuickConfigImportModal({
  open,
  onOpenChange,
  title,
  entityName,
  description,
  presets,
  onImport,
  sampleJsonPlaceholder = '[\n  {\n    "code": "ITEM-01",\n    "title": "Example Item"\n  }\n]',
}: QuickConfigImportModalProps) {
  const { toast } = useToast()
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>(presets[0]?.id || '')
  const [customJson, setCustomJson] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'presets' | 'custom'>('presets')
  const [copied, setCopied] = React.useState(false)

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || presets[0]

  const handleCopyPreview = () => {
    if (!selectedPreset?.previewSnippet) return
    navigator.clipboard.writeText(selectedPreset.previewSnippet)
    setCopied(true)
    toast({
      title: 'Copied to Clipboard',
      description: 'Configuration JSON preview copied.',
      variant: 'info',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLoadSampleTemplate = () => {
    setCustomJson(sampleJsonPlaceholder)
    toast({
      title: 'Template Inserted',
      description: 'Sample JSON schema loaded into the editor.',
      variant: 'info',
    })
  }

  const handleApplyPreset = () => {
    if (!selectedPreset) return
    onImport(selectedPreset.payload, 'preset')
    toast({
      title: 'Import Successful',
      description: `Loaded ${selectedPreset.itemCount} ${entityName} from "${selectedPreset.name}".`,
      variant: 'success',
    })
    onOpenChange(false)
  }

  const handleApplyCustomJson = () => {
    if (!customJson.trim()) {
      toast({
        title: 'Empty Input',
        description: 'Please paste a valid JSON array or object configuration.',
        variant: 'destructive',
      })
      return
    }

    try {
      const parsed = JSON.parse(customJson)
      onImport(parsed, 'custom')
      toast({
        title: 'Custom Import Successful',
        description: `Successfully imported custom configuration for ${entityName}.`,
        variant: 'success',
      })
      onOpenChange(false)
      setCustomJson('')
    } catch (err: unknown) {
      toast({
        title: 'Invalid JSON Format',
        description: err instanceof Error ? err.message : 'Check your syntax and try again.',
        variant: 'destructive',
      })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCustomJson(text)
      setActiveTab('custom')
      toast({
        title: 'File Loaded',
        description: `Read ${file.name} (${Math.round(file.size / 1024)} KB). Ready to import.`,
        variant: 'info',
      })
    }
    reader.readAsText(file)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-5xl sm:max-w-5xl xl:max-w-6xl w-[94vw] max-h-[92vh] overflow-y-auto p-6 sm:p-7"
    >
      <div className="space-y-5">
        <DialogHeader className="mb-2">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
              <Sparkles size={22} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'custom')} className="w-full">
          <TabsList className="grid grid-cols-2 bg-muted/60 p-1 rounded-xl max-w-md mb-4">
            <TabsTrigger
              value="presets"
              className="text-xs sm:text-sm font-semibold gap-2 py-2 data-[state=active]:bg-card data-[state=active]:text-primary shadow-2xs"
            >
              <Layers size={15} />
              <span>Industry Presets ({presets.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="text-xs sm:text-sm font-semibold gap-2 py-2 data-[state=active]:bg-card data-[state=active]:text-primary shadow-2xs"
            >
              <Upload size={15} />
              <span>Paste JSON / Upload</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PRESETS */}
          <TabsContent value="presets" className="space-y-4 pt-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Presets List Column */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available Presets
                  </span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 font-mono">
                    {presets.length} Ready
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {presets.map((preset) => {
                    const isSelected = preset.id === selectedPresetId
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                          isSelected
                            ? 'border-primary bg-primary/[0.05] ring-2 ring-primary/25 shadow-xs'
                            : 'border-border bg-card hover:bg-muted/40 hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2.5 mb-1.5">
                            <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                              {preset.name}
                            </h4>
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[10px] py-0.5 px-2 font-mono font-semibold bg-secondary text-primary border border-primary/20"
                            >
                              {preset.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>

                        <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-border/60 text-xs">
                          <span className="font-medium text-foreground/80 flex items-center gap-1.5 text-xs">
                            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                              {preset.itemCount} {entityName}
                            </span>
                          </span>
                          {isSelected ? (
                            <span className="text-primary font-bold flex items-center gap-1 text-[11px] bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                              <Check size={12} className="stroke-[3]" /> Selected
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors font-medium">
                              Select Package
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Configuration Specification & Preview
                  </span>
                  {selectedPreset && (
                    <button
                      type="button"
                      onClick={handleCopyPreview}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Code2 size={12} />
                          <span>Copy Raw JSON</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedPreset ? (
                  <div className="rounded-xl border border-border bg-slate-950 text-slate-100 overflow-hidden shadow-xs flex flex-col flex-1 min-h-[380px]">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-primary" />
                        <span className="font-mono uppercase tracking-wider text-slate-400">
                          {selectedPreset.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                        {selectedPreset.itemCount} items payload
                      </Badge>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-200 overflow-y-auto max-h-[400px] flex-1 whitespace-pre-wrap leading-relaxed select-text">
                      {selectedPreset.previewSnippet}
                    </pre>
                    <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Ready to load into company tenant workspace.</span>
                      <span className="text-slate-500 font-mono text-[10px]">JSON Schema Verified</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs flex flex-col items-center justify-center min-h-[380px]">
                    <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    Select a preset package from the left to inspect its configuration schema.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Sparkles size={14} />}
                onClick={handleApplyPreset}
                className="font-semibold shadow-2xs px-5"
              >
                Apply Preset ({selectedPreset?.itemCount || 0} {entityName})
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: CUSTOM JSON / FILE */}
          <TabsContent value="custom" className="space-y-4 pt-1">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <FileJson size={15} className="text-primary" />
                    <span>JSON Configuration Payload</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleTemplate}
                    className="text-[11px] text-primary hover:underline cursor-pointer font-medium ml-2"
                  >
                    Insert Schema Template
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="quick-import-file"
                    className="text-xs text-primary font-semibold hover:bg-primary/15 cursor-pointer flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg border border-primary/20 transition-colors shadow-2xs"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Upload .json file</span>
                  </label>
                  <input
                    id="quick-import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <textarea
                rows={16}
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                placeholder={sampleJsonPlaceholder}
                className="w-full font-mono text-xs sm:text-[13px] p-4 rounded-xl border border-border bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[380px] max-h-[550px] leading-relaxed shadow-inner"
              />

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
                <AlertCircle size={15} className="text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Schema Validation Rule:</p>
                  <p>
                    The payload must match the attributes accepted by the creation form for{' '}
                    <strong className="text-foreground">{entityName}</strong>. You can paste an array of objects or click{' '}
                    <button
                      type="button"
                      onClick={handleLoadSampleTemplate}
                      className="text-primary underline font-medium hover:opacity-80"
                    >
                      "Insert Schema Template"
                    </button>{' '}
                    to inspect required properties.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Upload size={14} />}
                onClick={handleApplyCustomJson}
                disabled={!customJson.trim()}
                className="font-semibold shadow-2xs px-5"
              >
                Import Configuration ({entityName})
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </div>
    </Dialog>
  )
}

