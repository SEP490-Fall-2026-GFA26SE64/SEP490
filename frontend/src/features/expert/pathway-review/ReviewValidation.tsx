import type { Candidate, ReviewDetail } from '../../../shared/api/initialPathway'
import { pathwayDiagnostic } from '../../../shared/api/initialPathwayMessages'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialTeachingDetails } from '../../../shared/components/InitialTeachingDetails'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { AlertCircle, Plus } from 'lucide-react'

export function ReviewValidation({ detail, diagnostics, disabled, onInclude }: {
  detail: ReviewDetail; diagnostics: string[]; disabled: boolean; onInclude: (moduleId: string) => void
}) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), flow = (key: string) => tr('reviewFlow.' + key)
  const names = new Map(detail.gaps.skills.map(skill => [skill.skillId, skill.name]))
  const selected = new Set(detail.revision.selectedModules)
  function suggestions(skillId: string): Candidate[] {
    return detail.candidates.filter(c => c.skillId === skillId && !selected.has(c.moduleId)
      && c.preferredDifficulty !== null && c.teachingFocus !== 'INCIDENTAL')
      .sort((a, b) => Number(b.teachingFocus === 'PRIMARY') - Number(a.teachingFocus === 'PRIMARY')
        || a.preference - b.preference || a.durationMinutes - b.durationMinutes || a.moduleId.localeCompare(b.moduleId))
  }
  return <div className="space-y-4">
    <div className="flex items-start gap-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4" role="status">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="space-y-1"><Heading level={3} size="card">{flow('invalid')}</Heading><Text variant="body-sm">{flow('suggestionHelp')}</Text></div>
    </div>
    {[...new Set(diagnostics)].map(issue => {
      const [code, ...references] = issue.split(':')
      const skillId = ['MISSING_PROVIDER', 'UNPLANNED_PREREQUISITE', 'UNSUITABLE_PROVIDER'].includes(code) ? references[0] : undefined
      const options = skillId ? suggestions(skillId) : []
      const labels = references.map(id => names.get(id) ?? detail.candidates.find(c => c.moduleId === id)?.title ?? id)
      return <section key={issue} className="space-y-3 rounded-xl border border-destructive/30 bg-card p-4">
        <div className="space-y-1"><Heading level={3} size="card">{skillId ? names.get(skillId) ?? skillId : pathwayDiagnostic(issue, t)}</Heading>
          <Text variant="body-sm">{pathwayDiagnostic(issue, t)}</Text>
          <Text variant="caption" className="break-words">{skillId ?? labels.join(' · ')}</Text>
        </div>
        {skillId && <>
          <Text variant="caption" className="font-semibold text-primary">{flow('suggestions')}</Text>
          {options.length === 0 && <Text variant="body-sm">{flow('noSuggestion')}</Text>}
          {options.map(candidate => <div key={candidate.moduleId} className="space-y-3 rounded-lg border border-primary/35 bg-secondary/30 p-3">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-64 space-y-1"><Text className="break-words font-semibold">{candidate.title}</Text>
                <Text variant="caption" className="break-all font-mono">{candidate.moduleId}</Text>
              </div>
              <Button size="sm" disabled={disabled} onClick={() => onInclude(candidate.moduleId)}><Plus className="size-4" />{tr('include')}</Button>
            </div>
            <div className="flex flex-wrap gap-3"><Badge variant="outline">{(candidate.durationMinutes / 60).toLocaleString(language, { maximumFractionDigits: 2 })} {tr('reviewUi.hours')}</Badge><Text variant="caption">{candidate.priceVnd.toLocaleString(language)} {tr('price')}</Text></div>
            <InitialTeachingDetails targets={[candidate]} skillNames={names} />
          </div>)}
        </>}
      </section>
    })}
    {diagnostics.length === 0 && <Text variant="body-sm">{flow('checkNeeded')}</Text>}
  </div>
}
