import type { PathwayView } from '../../../shared/api/initialPathway'
import { baselineTargetMet, pathwayAccessNote, pathwayEntry, pathwaySkill } from '../../../shared/api/initialPathwayMessages'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialTeachingDetails } from '../../../shared/components/InitialTeachingDetails'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Progress } from '../../../shared/components/ui/Progress'

/** Read-only presentation shared by the original roadmap and timeline; no replacement layout. */
export type PathwayDetailSelection = { kind: 'module' | 'skill'; id: string } | null
export function InitialPathwayDetails({ pathway, selection, onClose }: { pathway: PathwayView; selection: PathwayDetailSelection; onClose: () => void }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), ui = (key: string) => tr('display.' + key)
  if (!selection) return null
  const item = selection.kind === 'module' ? pathway.modules.find(item => item.module.id === selection.id) : null
  const skill = selection.kind === 'skill' ? pathwaySkill(pathway, selection.id) : null
  const title = item?.module.title ?? skill?.name ?? selection.id
  const names = new Map((pathway.baseline?.skills ?? []).map(row => [row.skillId, row.name]))
  const percent = (value: number | null | undefined) => value == null ? tr('unknown') : `${(value * 100).toLocaleString(language, { maximumFractionDigits: 1 })}%`
  const dependencies = pathway.dependencies.filter(gate => gate.moduleId === selection.id)
  const entry = item ? pathwayEntry(pathway, item.module.id) : null
  return <Dialog open size="wide" onOpenChange={open => { if (!open) onClose() }} ariaLabel={title} closeLabel={tr('cancel')}>
    <DialogHeader><DialogTitle className="min-w-0 break-words pr-6">{title}</DialogTitle><DialogDescription>{pathway.status?.roleName} · {pathway.status?.levelName}</DialogDescription></DialogHeader>
    <DialogBody className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="max-w-full whitespace-normal break-all font-mono">{selection.id}</Badge>{item && <Badge variant={item.accessState === 'AVAILABLE' ? 'success' : 'warning'}>{item.accessState === 'PREVIEW' ? tr('reviewFlow.draft') : tr('state.' + item.accessState)}</Badge>}{skill && <Badge variant={baselineTargetMet(skill) ? 'success' : 'secondary'}>{ui(baselineTargetMet(skill) ? 'targetMet' : 'targetNotMet')}</Badge>}</div>
      {selection.kind === 'skill' && <>
        <Text variant="body-sm">{ui('snapshotHelp')}</Text>
        <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3"><div><Text variant="caption">{tr('mastery')}</Text><Text className="font-semibold">{percent(skill?.mastery)}</Text></div><div><Text variant="caption">{tr('required')}</Text><Text className="font-semibold">{percent(skill?.requiredScore)}</Text></div><div><Text variant="caption">{tr('confidence')}</Text><Text className="font-semibold">{skill?.confidence ? t('employeeBaseline.' + skill.confidence) : tr('unknown')}</Text></div></div>
        {skill?.mastery != null && <Progress value={skill.mastery * 100} label={tr('mastery')} variant={baselineTargetMet(skill) ? 'success' : 'primary'} />}
        {!skill && <Text variant="body-sm">{ui('outsideSnapshot')}</Text>}
        {skill?.evidenceState === 'UNKNOWN' && <Text variant="body-sm">{tr('unknownHelp')}</Text>}
        <Heading level={3} size="card">{ui('taughtIn')}</Heading>
        <ul className="space-y-2">{pathway.modules.filter(item => item.module.targets.some(target => target.skillId === selection.id)).map(item => <li key={item.module.id} className="break-words rounded-lg border border-border p-3"><Text className="font-semibold">{item.module.ordinal}. {item.module.title}</Text><InitialTeachingDetails targets={item.module.targets.filter(target => target.skillId === selection.id)} skillNames={names} /></li>)}</ul>
      </>}
      {item && <>
        <div className="flex flex-wrap gap-4"><Text variant="body-sm">{(item.module.durationMinutes / 60).toLocaleString(language, { maximumFractionDigits: 2 })} {ui('hours')}</Text><Text variant="body-sm">{item.module.priceVnd.toLocaleString(language)} {tr('price')}</Text><Text variant="caption">{ui('contentVersion')}: {item.module.contentVersion}</Text></div>
        {item.reasonCode && <Text variant="body-sm" role="status">{pathwayAccessNote(item.reasonCode, t)}</Text>}
        <Heading level={3} size="card">{ui('teachingSkills')}</Heading>
        <InitialTeachingDetails targets={item.module.targets} skillNames={names} />
        <div className="overflow-x-auto scrollbar-hidden" tabIndex={0} role="region" aria-label={ui('baselineTargets')}><table className="w-full min-w-96 text-left text-body-sm"><thead className="bg-muted"><tr>{['skill', 'mastery', 'required'].map(key => <th key={key} scope="col" className="px-3 py-2">{tr(key)}</th>)}</tr></thead><tbody>{item.module.targets.map(target => { const row = pathwaySkill(pathway, target.skillId); return <tr key={target.skillId} className="border-b border-border"><th scope="row" className="break-words px-3 py-2 font-medium">{row?.name ?? target.skillId}</th><td className="px-3 py-2">{percent(row?.mastery)}</td><td className="px-3 py-2">{percent(row?.requiredScore)}</td></tr> })}</tbody></table></div>
        <Text variant="caption">{ui('snapshotHelp')}</Text>
        {dependencies.length > 0 && <div className="space-y-2"><Heading level={3} size="card">{tr('prerequisites')}</Heading>{dependencies.map(gate => <Text key={gate.dependentSkillId + ':' + gate.prerequisiteSkillId} variant="body-sm">{names.get(gate.prerequisiteSkillId) ?? gate.prerequisiteSkillId}{gate.providerModuleId ? ' · ' + (pathway.modules.find(item => item.module.id === gate.providerModuleId)?.module.title ?? gate.providerModuleId) : ''}</Text>)}</div>}
      </>}
    </DialogBody>
    <DialogFooter><Button variant="outline" onClick={onClose}>{ui('close')}</Button>{entry && <a href={entry} className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground hover:bg-primary-hover">{tr('learn')}</a>}</DialogFooter>
  </Dialog>
}
