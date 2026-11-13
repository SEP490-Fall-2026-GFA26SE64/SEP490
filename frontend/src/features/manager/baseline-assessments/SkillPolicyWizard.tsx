import { useState } from 'react'
import { Check, Clock3, ListChecks } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { rulePolicy, type RulePolicy } from './assessmentRulePolicyApi'
import type { PolicyWorkspace, ScopedVersion } from './scopedAssessmentPolicyApi'

const fieldClass = 'h-10 border-primary/30 bg-card font-medium hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted'
const positive = (value: string) => Number.isSafeInteger(Number(value)) && Number(value) > 0

export function SkillPolicyWizard({ workspace, version, locked, onSave, onCancel }: {
  workspace: PolicyWorkspace; version?: ScopedVersion; locked: boolean;
  onSave?: (policy: RulePolicy, activate: boolean) => void; onCancel: () => void;
}) {
  const { t } = useTranslation(), initial = version?.configuration ?? workspace.draft?.configuration
  const [step, setStep] = useState(version ? 3 : 1), [invalid, setInvalid] = useState(false)
  const [groups, setGroups] = useState(() => {
    const requirements = version ? version.configuration.groups : workspace.scope.groups.map(g => g.requirement)
    return requirements.map(requirement => {
      const rule = initial?.groups.find(g => g.skillId === requirement.skillId && g.knowledgeLevel === requirement.knowledgeLevel)
      return { skillId: requirement.skillId, knowledgeLevel: requirement.knowledgeLevel, totalCount: rule ? String(rule.totalCount) : '', requiredCorrectCount: rule ? String(rule.requiredCorrectCount) : '', mandatoryCount: rule?.mandatoryCount == null ? (rule?.mandatoryRequired ? '' : '0') : String(rule.mandatoryCount), legacyMandatory: Boolean(rule && rule.mandatoryCount == null), allWrongVeto: rule?.allWrongVeto ?? false }
    }).sort((a, b) => {
      const main = (g: typeof a) => g.skillId === workspace.scope.ownerId && g.knowledgeLevel === workspace.scope.levelId
      return Number(main(b)) - Number(main(a)) || a.skillId.localeCompare(b.skillId) || a.knowledgeLevel.localeCompare(b.knowledgeLevel)
    })
  })
  const total = groups.reduce((sum, g) => sum + (positive(g.totalCount) ? Number(g.totalCount) : 0), 0)
  const [minutes, setMinutes] = useState(initial ? String(initial.timeLimitSeconds / 60) : '')
  const [rate, setRate] = useState(initial && total > 0 ? String(initial.timeLimitSeconds / 60 / total) : '1')
  const [wait, setWait] = useState(initial ? String(initial.retakeWaitSeconds / 60) : '10')
  const [attempts, setAttempts] = useState(initial ? String(initial.maxAttempts) : '3')
  const main = (g: typeof groups[number]) => g.skillId === workspace.scope.ownerId && g.knowledgeLevel === workspace.scope.levelId
  const name = (g: typeof groups[number]) => workspace.scope.groups.find(s => s.requirement.skillId === g.skillId && s.requirement.knowledgeLevel === g.knowledgeLevel)?.skillName ?? g.skillId
  const capacity = (g: typeof groups[number]) => workspace.groupCapacities.find(c => c.skillId === g.skillId && c.knowledgeLevel === g.knowledgeLevel)
  const quotaValid = (g: typeof groups[number]) => {
    const c = capacity(g)
    return Boolean(c && /^\d+$/.test(g.mandatoryCount) && Number.isSafeInteger(Number(g.mandatoryCount))
      && Number(g.mandatoryCount) <= Math.min(Number(g.totalCount), c.mandatoryQuestions)
      && Number(g.totalCount) - Number(g.mandatoryCount) <= c.ordinaryQuestions)
  }
  const countsValid = groups.length > 0 && total <= workspace.maxPaperItems && groups.every(g => {
    const c = capacity(g)
    return c && positive(g.totalCount) && Number(g.totalCount) >= c.minQuestions && Number(g.totalCount) <= c.maxQuestions
      && positive(g.requiredCorrectCount) && Number(g.requiredCorrectCount) <= Number(g.totalCount)
      && quotaValid(g)
  })
  const seconds = (value: string, min: number) => value.trim() && Number.isFinite(Number(value)) && Number(value) * 60 >= min && Number(value) * 60 <= 2147483647
  const timingValid = seconds(minutes, 1) && seconds(wait, 0) && positive(attempts)
  function next() {
    if (step === 1 && countsValid) {
      setMinutes(String(Math.round(total * (Number(rate) > 0 ? Number(rate) : 1) * 60) / 60)); setInvalid(false); setStep(2)
    } else if (step === 2 && timingValid) { setInvalid(false); setStep(3) }
    else setInvalid(true)
  }
  function save(activate: boolean) {
    if (!countsValid || !timingValid) { setInvalid(true); return }
    try {
      const policy = rulePolicy({ timeLimitSeconds: Math.round(Number(minutes) * 60), retakeWaitSeconds: Math.round(Number(wait) * 60), maxAttempts: Number(attempts), groups: groups.map(g => ({ skillId: g.skillId, knowledgeLevel: g.knowledgeLevel, totalCount: Number(g.totalCount), requiredCorrectCount: Number(g.requiredCorrectCount), mandatoryCount: Number(g.mandatoryCount), mandatoryRequired: Number(g.mandatoryCount) > 0, allWrongVeto: g.allWrongVeto })) })
      setInvalid(false); onSave?.(policy, activate)
    } catch { setInvalid(true) }
  }
  return <div className="space-y-4">
    {!version && <ol aria-label={t('baselineWizard.progress')} className="grid grid-cols-3 gap-2">
      {['questions', 'timing', 'review'].map((key, index) => <li key={key} aria-current={step === index + 1 ? 'step' : undefined} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-body-sm ${step === index + 1 ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-body-sm">{step > index + 1 ? <Check size={14} aria-hidden="true" /> : index + 1}</span><span>{t(`baselineWizard.${key}`)}</span>
      </li>)}
    </ol>}
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-secondary/30 p-4"><Text tone="foreground" className="font-semibold">{t('baselineWizard.total')}: {total}</Text><Text variant="caption">{t('baselineWizard.paperLimit')}: {workspace.maxPaperItems}</Text></div>
    {invalid && <Text role="alert" tone="destructive">{t('baselineWizard.invalid')}</Text>}
    {step === 1 && <section className="space-y-4" aria-label={t('baselineWizard.questions')}>
      <Heading level={3} size="card" className="flex items-center gap-2"><ListChecks size={17} className="text-primary" />{t('skillWizard.counts')}</Heading>
      <Text variant="body-sm">{t('skillWizard.countsHelp')}</Text>
      {groups.map((group, index) => {
        const c = capacity(group), patch = (value: Partial<typeof group>) => setGroups(all => all.map((g, i) => i === index ? { ...g, ...value } : g))
        return <div key={`${group.skillId}:${group.knowledgeLevel}`} className="space-y-3 rounded-lg border border-primary/25 bg-background/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><Text tone="foreground" className="font-semibold">{name(group)} · {t(`knowledgeLevel.${group.knowledgeLevel}`)}</Text><Badge variant={main(group) ? 'secondary' : 'outline'}>{t(main(group) ? 'skillWizard.main' : 'skillWizard.prerequisite')}</Badge></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2"><Text as="span" tone="foreground" variant="body-sm" className="font-semibold">{t('scopedPolicy.totalCount')}</Text><Input className={fieldClass} type="number" min={c?.minQuestions ?? 1} max={c?.maxQuestions ?? 0} step="1" required disabled={locked} value={group.totalCount} onChange={e => patch({ totalCount: e.target.value })} /></label>
            <label className="flex flex-col gap-2"><Text as="span" tone="foreground" variant="body-sm" className="font-semibold">{t('scopedPolicy.requiredCorrect')}</Text><Input className={fieldClass} type="number" min="1" max={Number(group.totalCount) || 0} step="1" required disabled={locked} value={group.requiredCorrectCount} onChange={e => patch({ requiredCorrectCount: e.target.value })} /></label></div>
          <Text variant="caption">{c && c.maxQuestions >= c.minQuestions ? `${t('baselineWizard.allowed')}: ${c.minQuestions}–${c.maxQuestions}. ${t('baselineWizard.correctHelp')}` : t('baselineWizard.noQuestions')}</Text>
          <div className="space-y-2 rounded-md bg-card p-3"><label className="flex flex-col gap-2"><Text as="span" tone="foreground" variant="body-sm">{t('skillWizard.mandatoryQuota')}</Text><Input className={fieldClass} type="number" min="0" max={Math.min(Number(group.totalCount) || 0, c?.mandatoryQuestions ?? 0)} step="1" required disabled={locked} value={group.mandatoryCount} aria-invalid={!quotaValid(group)} onChange={e => patch({ mandatoryCount: e.target.value, legacyMandatory: false })} /></label><Text variant="caption">{t('skillWizard.mandatoryHelp')}{c ? ` ${t('skillWizard.mandatoryCount')}: ${c.mandatoryQuestions}. ${t('skillWizard.ordinaryCount')}: ${c.ordinaryQuestions}.` : ''}</Text></div>
          {!quotaValid(group) && <Text role="alert" tone="destructive" variant="caption">{t('skillWizard.quotaInvalid')}</Text>}
          {!main(group) && <div className="space-y-1 rounded-md bg-card p-3"><label className="flex cursor-pointer items-start gap-2"><input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" disabled={locked} checked={group.allWrongVeto} onChange={e => patch({ allWrongVeto: e.target.checked })} /><Text as="span" tone="foreground" variant="body-sm">{t('scopedPolicy.veto')}</Text></label><Text variant="caption" className="pl-6">{t('skillWizard.vetoHelp')}</Text></div>}
        </div>
      })}
    </section>}
    {step === 2 && <section aria-label={t('baselineWizard.timing')} className="space-y-4 rounded-lg border border-border bg-background/60 p-4">
      <Heading level={3} size="card" className="flex items-center gap-2"><Clock3 size={17} className="text-primary" />{t('baselineWizard.timing')}</Heading><Text variant="body-sm">{t('baselineWizard.recommendations')}</Text>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><Text as="span" tone="foreground" variant="body-sm" className="font-semibold">{t('baselineWizard.totalMinutes')}</Text><Input className={fieldClass} type="number" min="0.01" step="any" disabled={locked} value={minutes} onChange={e => { setMinutes(e.target.value); setRate(e.target.value && total ? String(Number(e.target.value) / total) : '') }} /></label>
        <label className="space-y-2"><Text as="span" tone="foreground" variant="body-sm" className="font-semibold">{t('baselineWizard.minutesPerQuestion')}</Text><Input className={fieldClass} type="number" min="0.01" step="any" disabled={locked} value={rate} onChange={e => { setRate(e.target.value); setMinutes(e.target.value ? String(Number(e.target.value) * total) : '') }} /></label>
        <label className="space-y-2"><Text as="span" tone="foreground" variant="body-sm" className="font-semibold">{t('scopedPolicy.maxAttempts')}</Text><Input className={fieldClass} type="number" min="1" step="1" disabled={locked} value={attempts} onChange={e => setAttempts(e.target.value)} /></label>
        <label className="space-y-2"><Text as="span" tone="foreground" variant="body-sm" className="font-semibold">{t('baselineWizard.waitMinutes')}</Text><Input className={fieldClass} type="number" min="0" step="any" disabled={locked} value={wait} onChange={e => setWait(e.target.value)} /></label></div>
    </section>}
    {step === 3 && <section aria-label={t('baselineWizard.review')} className="space-y-4 rounded-lg border border-border p-4">
      <Heading level={3} size="card">{version ? `v${version.version} · ${t('scopedPolicy.readonly')}` : t('baselineWizard.review')}</Heading>
      <div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead className="border-b border-border bg-background"><tr>{['skill', 'totalCount', 'requiredCorrect'].map(key => <th className="p-2 font-semibold" key={key}>{t(`scopedPolicy.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-border">{groups.map(g => <tr key={`${g.skillId}:${g.knowledgeLevel}`}><td className="p-2"><Text tone="foreground" variant="body-sm" className="font-semibold">{name(g)}</Text><Text variant="caption">{t(`knowledgeLevel.${g.knowledgeLevel}`)} · {t(main(g) ? 'skillWizard.main' : 'skillWizard.prerequisite')}</Text>{<Text variant="caption">{g.legacyMandatory ? t('skillWizard.legacyMandatory') : `${t('skillWizard.mandatoryQuota')}: ${g.mandatoryCount}`}</Text>}{g.allWrongVeto && <Text variant="caption">{t('scopedPolicy.veto')}</Text>}</td><td className="p-2">{g.totalCount}</td><td className="p-2">{g.requiredCorrectCount}</td></tr>)}</tbody></table></div>
      <div className="grid gap-3 sm:grid-cols-3">{[[t('baselineWizard.totalMinutes'), minutes], [t('scopedPolicy.maxAttempts'), attempts], [t('baselineWizard.waitMinutes'), wait]].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/40 p-3"><Text variant="caption">{label}</Text><Text tone="foreground" className="font-semibold">{value}</Text></div>)}</div>
      {!version && <Text variant="body-sm">{t('skillWizard.saveHelp')}</Text>}
    </section>}
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <Button variant="outline" className="min-w-28 border-primary/30 font-semibold text-primary hover:bg-secondary" disabled={locked && !version} onClick={() => { if (!version && step > 1) { setInvalid(false); setStep(step - 1) } else onCancel() }}>{t(!version && step > 1 ? 'baselineWizard.previous' : 'scopedPolicy.backVersions')}</Button>
      {!version && step < 3 && <Button className="min-w-28 font-semibold" disabled={locked || (step === 1 ? !countsValid : !timingValid)} onClick={next}>{t('skillWizard.next')}</Button>}
      {!version && step === 3 && <><Button variant="outline" className="min-w-28 border-primary/30 font-semibold text-primary hover:bg-secondary" disabled={locked || !countsValid || !timingValid} onClick={() => save(false)}>{t('scopedPolicy.save')}</Button><Button className="min-w-28 font-semibold" disabled={locked || !countsValid || !timingValid || !workspace.scope.ready} onClick={() => save(true)}>{t('skillWizard.saveActivate')}</Button></>}
    </div>
  </div>
}
