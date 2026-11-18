import { useState } from 'react'
import type { KnowledgeLevel } from '../../../shared/api/requirementPathway'
import type { OptionalSkillModule } from '../../../shared/api/skillLearningApi'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { BaselineError } from '../baseline-assessment/baselineApi'
import { CompletedModuleAssessmentLink } from "../baseline-assessment/CompletedModuleAssessmentLink"
import { targetForCompletedModule } from "../baseline-assessment/CompletedModuleAssessmentLink.helpers"
import { SharedSkillAssessmentEntry } from '../baseline-assessment/SharedSkillAssessmentEntry'

type SkillPanelProps = { skillId: string; modules: OptionalSkillModule[]; skillVersion?: string | null; level: KnowledgeLevel; levelLabel: string; vi: boolean }
export function SkillLevelAssessmentPanel(props: SkillPanelProps) {
  const { skillId, skillVersion, level, levelLabel, vi, modules } = props
  const [chosen, setChosen] = useState(''), [locked, setLocked] = useState(false)
  const eligible = completedModules(modules, skillVersion, level)
  const selected = eligible.length === 1 ? eligible[0] : eligible.find(m => moduleKey(m) === chosen)
  if (!skillVersion) return <LegacySkillLevelAssessmentPanel {...props} />
  const admission = <div className="space-y-2">
    {eligible.length > 1 && <div className="space-y-2"><label htmlFor="new-assessment-module" className="text-body-sm font-medium">{vi ? 'Module làm căn cứ cho lượt mới' : 'Learning evidence for the new attempt'}</label><Combobox id="new-assessment-module" aria-label={vi ? 'Module làm căn cứ cho lượt mới' : 'Learning evidence for the new attempt'} clearable={false} disabled={locked} wrapOptions value={selected ? moduleKey(selected) : ''} onChange={setChosen} placeholder={vi ? 'Chọn module đã hoàn thành' : 'Choose a completed module'} options={eligible.map(m => ({ value: moduleKey(m), label: m.title }))} /></div>}
    <p className="text-body-sm text-muted-foreground">{selected ? (vi ? 'Căn cứ học tập: ' : 'Learning evidence: ') + selected.title : eligible.length ? (vi ? 'Chọn căn cứ học tập để mở lượt mới. Lịch sử và giới hạn vẫn dùng chung.' : 'Choose learning evidence for a new attempt. History and limits remain shared.') : (vi ? 'Hoàn thành một module phù hợp bên dưới để mở bài đánh giá mới. Lịch sử và bài đang làm vẫn được giữ.' : 'Complete a compatible module below before starting a new assessment. Existing history and active papers are retained.')}</p>
  </div>
  return <SharedSkillAssessmentEntry panel locator={{ skillId, knowledgeLevel: level, skillVersion }} disabled={!selected} onLockChange={setLocked} getNewTarget={async () => { if (!selected) throw new BaselineError('EXACT_LEARNING_COMPLETION_REQUIRED', 409); return targetForCompletedModule(selected.moduleId, selected.moduleRevision!) }} legacy={<LegacySkillLevelAssessmentPanel {...props} />} header={<div className="flex flex-wrap items-center gap-2"><Heading level={3} size="card">Skill Assessment</Heading><Badge variant="secondary">{levelLabel}</Badge></div>} admission={admission} />
}
const moduleKey = (m: OptionalSkillModule) => `${m.moduleId}:${m.moduleRevision}`
const completedModules = (modules: OptionalSkillModule[], version: string | null | undefined, level: KnowledgeLevel) => modules.filter(m => m.completed && !m.unavailableReason && m.knowledgeLevel === level && Boolean(version) && m.skillVersion === version && Number.isSafeInteger(m.moduleRevision) && m.moduleRevision! > 0)

/** Module is completion evidence; the visible assessment belongs to the selected Skill/level. */
export function LegacySkillLevelAssessmentPanel({ modules, skillVersion, level, levelLabel, vi }: {
  modules: OptionalSkillModule[]; skillVersion?: string | null; level: KnowledgeLevel; levelLabel: string; vi: boolean
}) {
  const [chosen, setChosen] = useState('')
  const eligible = completedModules(modules, skillVersion, level)
  const key = (m: OptionalSkillModule) => `${m.moduleId}:${m.moduleRevision}`
  const selected = eligible.length === 1 ? eligible[0] : eligible.find(m => key(m) === chosen)
  return <section aria-label="Skill Assessment" className="space-y-3 rounded-lg border border-primary/20 bg-card p-4 shadow-sm">
    <div className="flex flex-wrap items-center gap-2"><Heading level={3} size="card">Skill Assessment</Heading><Badge variant="secondary">{levelLabel}</Badge></div>
    <p className="text-body-sm text-muted-foreground">{vi ? 'Đánh giá kỹ năng ở mức kiến thức này. Hoàn thành một module phù hợp để đủ điều kiện làm bài.' : 'Assess this skill at the selected knowledge level. Complete a compatible module to qualify.'}</p>
    {!eligible.length ? <p className="text-body-sm text-muted-foreground">{vi ? 'Chưa có module đã hoàn thành và đủ điều kiện ở phiên bản kỹ năng này. Hãy học một module phù hợp bên dưới; nếu đã học xong, hãy kiểm tra điều kiện hoặc tải lại danh sách.' : 'No completed eligible module is available for this skill version. Study a compatible module below; if already completed, check its conditions or refresh the list.'}</p> : <>
      {eligible.length > 1 && <div className="space-y-2"><label htmlFor="assessment-completion-module" className="text-body-sm font-medium">{vi ? 'Module đã học làm căn cứ' : 'Completed module used for assessment'}</label><Combobox id="assessment-completion-module" aria-label={vi ? 'Module đã học làm căn cứ' : 'Completed module used for assessment'} clearable={false} wrapOptions value={selected ? key(selected) : ''} placeholder={vi ? 'Chọn module đã hoàn thành' : 'Choose a completed module'} options={eligible.map(m => ({ value: key(m), label: m.title, description: vi ? `Phiên bản module ${m.moduleRevision}` : `Module revision ${m.moduleRevision}` }))} onChange={setChosen} /></div>}
      {selected ? <>
        <p className="break-words text-body-sm"><span className="font-medium">{vi ? 'Căn cứ học tập: ' : 'Learning evidence: '}</span>{selected.title}</p>
        <p className="text-caption text-muted-foreground">{vi ? 'Lịch sử thi và giới hạn làm lại áp dụng cho module và phiên bản được chọn.' : 'Assessment history and retake limits apply to the selected module and revision.'}</p>
        <CompletedModuleAssessmentLink key={key(selected)} moduleId={selected.moduleId} revision={selected.moduleRevision!} />
      </> : <p className="text-body-sm text-muted-foreground">{vi ? 'Chọn module để xem đúng lượt thi và điều kiện tương ứng.' : 'Choose a module to view its assessment attempts and conditions.'}</p>}
    </>}
  </section>
}
