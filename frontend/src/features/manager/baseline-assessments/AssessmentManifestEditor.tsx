import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { ManagedAssessmentItem } from './baselineAssessmentManagementApi'

interface AssessmentManifestEditorProps {
  title: string
  items: ManagedAssessmentItem[]
  editable: boolean
  disabled?: boolean
  revealedAnswers?: Record<string, unknown>
  onTitleChange?: (title: string) => void
  onItemsChange?: (items: ManagedAssessmentItem[]) => void
}

export function AssessmentManifestEditor({
  title,
  items,
  editable,
  disabled = false,
  revealedAnswers = {},
  onTitleChange,
  onItemsChange,
}: AssessmentManifestEditorProps) {
  const { t } = useTranslation()

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (!editable || target < 0 || target >= items.length) return
    const reordered = [...items]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    onItemsChange?.(reordered.map((entry, position) => ({ ...entry, position: position + 1 })))
  }

  return <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{t('baselineAssessmentManagement.manifest.header')}</CardTitle></CardHeader>
      <CardContent>
        <label className="block max-w-2xl space-y-1 text-sm font-medium">
          {t('baselineAssessmentManagement.manifest.title')}
          <Input value={title} disabled={!editable || disabled} onChange={(event) => onTitleChange?.(event.target.value)} />
        </label>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">{t('baselineAssessmentManagement.manifest.items')}</CardTitle><Badge variant="outline">{t('baselineAssessmentManagement.manifest.itemCount').replace('{count}', String(items.length))}</Badge></div></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => <article key={item.itemVersionId} className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">{index + 1}</div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-medium leading-relaxed text-foreground">{item.prompt}</p><p className="mt-1 text-xs text-muted-foreground">{item.roleNameSnapshot} · {item.microSkillNameSnapshot}</p></div>
                <div className="flex gap-1"><Badge variant={difficultyVariant(item.difficulty)}>{t(`baselineBlueprint.difficulty.${item.difficulty.toLowerCase()}`)}</Badge><Badge variant="outline">{formatWeight(item.scoringWeight)}</Badge></div>
              </div>
              <SafeResponseOptions schema={item.responseSchema} />
              {Object.hasOwn(revealedAnswers, item.itemVersionId) && <RevealedAnswer schema={item.responseSchema} protectedKey={revealedAnswers[item.itemVersionId]} />}
              {editable && <div className="flex items-center justify-between border-t border-border pt-2"><span className="flex items-center gap-1 text-xs text-muted-foreground"><GripVertical className="h-3.5 w-3.5" />{t('baselineAssessmentManagement.manifest.reorderHelp')}</span><div className="flex gap-1"><Button variant="ghost" size="icon" disabled={disabled || index === 0} aria-label={t('baselineAssessmentManagement.manifest.moveUp')} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={disabled || index === items.length - 1} aria-label={t('baselineAssessmentManagement.manifest.moveDown')} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button></div></div>}
            </div>
          </div>
        </article>)}
      </CardContent>
    </Card>
  </div>
}

function RevealedAnswer({ schema, protectedKey }: { schema: unknown; protectedKey: unknown }) {
  const { t } = useTranslation()
  const answer = answerLabel(schema, protectedKey)
  return <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm"><span className="font-semibold text-success">{t('baselineAssessmentManagement.answerReview.correctAnswer')}</span> <span className="text-foreground">{answer}</span></div>
}

function answerLabel(schema: unknown, protectedKey: unknown): string {
  if (!protectedKey || typeof protectedKey !== 'object' || Array.isArray(protectedKey)) return JSON.stringify(protectedKey)
  const key = protectedKey as Record<string, unknown>
  const correctOptionId = key.correctOptionId
  if (typeof correctOptionId !== 'string' && typeof correctOptionId !== 'number') return JSON.stringify(protectedKey)
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return String(correctOptionId)
  const options = (schema as Record<string, unknown>).options
  if (!Array.isArray(options)) return String(correctOptionId)
  const match = options.find((value) => value && typeof value === 'object' && !Array.isArray(value)
    && String((value as Record<string, unknown>).id ?? (value as Record<string, unknown>).value) === String(correctOptionId))
  if (!match || typeof match !== 'object' || Array.isArray(match)) return String(correctOptionId)
  const option = match as Record<string, unknown>
  return String(option.label ?? option.text ?? option.value ?? correctOptionId)
}

function SafeResponseOptions({ schema }: { schema: unknown }) {
  const { t } = useTranslation()
  const options = learnerSafeOptions(schema)
  if (options.length === 0) return <p className="text-xs text-muted-foreground">{t('baselineAssessmentManagement.manifest.responseConfigured')}</p>
  return <div className="grid gap-2 sm:grid-cols-2">{options.map((option, index) => <div key={`${index}-${option}`} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">{option}</div>)}</div>
}

function learnerSafeOptions(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return []
  const record = schema as Record<string, unknown>
  const candidate = Array.isArray(record.options) ? record.options : Array.isArray(record.enum) ? record.enum : []
  return candidate.flatMap((value) => {
    if (typeof value === 'string' || typeof value === 'number') return [String(value)]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const option = value as Record<string, unknown>
      const label = option.label ?? option.text ?? option.value
      return typeof label === 'string' || typeof label === 'number' ? [String(label)] : []
    }
    return []
  })
}

function difficultyVariant(difficulty: ManagedAssessmentItem['difficulty']): 'success' | 'warning' | 'destructive' {
  return difficulty === 'EASY' ? 'success' : difficulty === 'MEDIUM' ? 'warning' : 'destructive'
}

function formatWeight(weight: number) {
  return `${Math.round(weight * 10_000) / 100}%`
}
