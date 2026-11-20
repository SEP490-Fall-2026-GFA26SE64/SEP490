import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { DialogBody } from '../../../shared/components/ui/Dialog'
import { ManagementSection, ManagementSteps } from '../../../shared/components/ui/ManagementUi'
import { BaselineRequestForm } from '../../../shared/components/question-bank/BaselineQuestionRequests'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { BaselineEditorState, PolicyWorkspace } from './scopedAssessmentPolicyApi'

export interface BaselineFormHandle { save: (dismiss?: boolean) => void }
export const BaselinePolicyForm = forwardRef<BaselineFormHandle, {
  workspace: PolicyWorkspace; locked: boolean; onSave: (state: BaselineEditorState, dismiss: boolean) => void; onDirtyChange: (dirty: boolean) => void
}>(function BaselinePolicyForm({ workspace, locked, onSave, onDirtyChange }, ref) {
  const { language, t } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const progress = workspace.draft?.editorState, policy = workspace.draft?.configuration ?? workspace.active?.configuration
  const initial = {
    levels: workspace.capacities.map(capacity => {
      const row = progress?.levels.find(item => item.knowledgeLevel === capacity.knowledgeLevel)
      const configured = policy?.groups.find(item => item.knowledgeLevel === capacity.knowledgeLevel)
      return { knowledgeLevel: capacity.knowledgeLevel, count: String(row?.totalCount ?? configured?.totalCount ?? ''), correct: String(row?.requiredCorrectCount ?? configured?.requiredCorrectCount ?? '') }
    }),
    seconds: String(progress?.timePerQuestionSeconds ?? policy?.baselineTiming?.secondsPerQuestion ?? ''),
    wait: progress?.retakeWaitSeconds != null || policy?.retakeWaitSeconds != null ? String((progress?.retakeWaitSeconds ?? policy?.retakeWaitSeconds ?? 0) / 60) : '', attempts: String(progress?.maxAttempts ?? policy?.maxAttempts ?? ''),
  }
  const [values, setValues] = useState(initial), [step, setStep] = useState(progress?.step ?? 1), [invalid, setInvalid] = useState(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || step === 3 && Boolean(workspace.draft) && !workspace.draft?.configuration
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const integer = (value: string, min: number, max = 2147483647) => {
    if (!value.trim()) return null
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw Error('Invalid configuration')
    return parsed
  }
  function snapshot(next = step): BaselineEditorState {
    const levels = values.levels.map(row => {
      const capacity = workspace.capacities.find(item => item.knowledgeLevel === row.knowledgeLevel)
      const totalCount = integer(row.count, 1, capacity?.maxQuestions ?? 0), requiredCorrectCount = integer(row.correct, 1, totalCount ?? capacity?.maxQuestions ?? 0)
      if (totalCount !== null && requiredCorrectCount !== null && requiredCorrectCount > totalCount || next > 1 && (totalCount === null || requiredCorrectCount === null)) throw Error('Invalid count')
      return { knowledgeLevel: row.knowledgeLevel, totalCount, requiredCorrectCount }
    })
    const waitSeconds = Number(values.wait) * 60
    if (values.wait.trim() && (!Number.isFinite(waitSeconds) || Math.abs(waitSeconds - Math.round(waitSeconds)) > 0.000001)) throw Error('Invalid wait')
    const timePerQuestionSeconds = integer(values.seconds, 1), retakeWaitSeconds = integer(values.wait.trim() ? String(Math.round(waitSeconds)) : '', 0), maxAttempts = integer(values.attempts, 1)
    if (!levels.length || next === 3 && (timePerQuestionSeconds === null || retakeWaitSeconds === null || maxAttempts === null)) throw Error('Complete configuration')
    for (const member of workspace.scope.memberLevels ?? []) {
      const count = member.groups.reduce((sum, group) => sum + (levels.find(row => row.knowledgeLevel === group.requirement.knowledgeLevel)?.totalCount ?? 0), 0)
      if (count > workspace.maxPaperItems || timePerQuestionSeconds !== null && count * timePerQuestionSeconds > 2147483647) throw Error('Paper limit')
    }
    return { step: next, completed: next === 3, levels, timeLimitSeconds: null, timePerQuestionSeconds, retakeWaitSeconds, maxAttempts }
  }
  function move(next: number) { try { snapshot(next); setInvalid(false); setStep(next) } catch { setInvalid(true) } }
  function save(dismiss = false) { try { const state = snapshot(); setInvalid(false); onSave(state, dismiss) } catch { setInvalid(true) } }
  useImperativeHandle(ref, () => ({ save }))
  return <DialogBody className="space-y-4">
    <ManagementSteps current={step - 1} steps={[copy('Questions', 'Câu hỏi'), copy('Time & retakes', 'Thời gian và làm lại'), copy('Review', 'Kiểm tra')]} />
    <ManagementSection title={copy('Role', 'Vị trí')} aside={<span className="rounded-full border border-primary/25 bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{copy('All Role levels', 'Mọi Role Level')}</span>}><Text variant="body-sm" className="font-semibold">{workspace.scope.ownerName}</Text></ManagementSection>
    {invalid && <Text role="alert" tone="destructive" variant="body-sm">{copy('Use whole numbers within each bank limit below. The passing count cannot exceed the question count. Keep each Role level within the paper and duration limits.', 'Nhập số nguyên trong giới hạn ngân hàng bên dưới. Số câu đúng không vượt số câu mỗi Skill. Mỗi Role Level phải trong giới hạn đề và thời gian.')}</Text>}
    {(step === 1 || step === 3) && <ManagementSection title={copy('Questions per knowledge level', 'Câu hỏi theo mức kiến thức')}>
      {!values.levels.length ? <Text role="status" variant="body-sm">{copy('No eligible questions. Add and publish questions for this Role’s required Skills first.', 'Chưa có câu hỏi hợp lệ. Thêm và xuất bản câu hỏi cho Skill của vị trí trước.')}</Text> : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full table-fixed text-left text-body-sm"><thead className="bg-muted/30"><tr>{[copy('Knowledge level', 'Mức kiến thức'), copy('Questions per Skill', 'Số câu mỗi Skill'), copy('Correct to pass', 'Số câu đúng để đạt')].map(label => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{values.levels.map((row, index) => {
        const capacity = workspace.capacities.find(item => item.knowledgeLevel === row.knowledgeLevel)
        const maximum = capacity?.maxQuestions ?? 0
        return <tr key={row.knowledgeLevel} className="border-t border-border"><th scope="row" className="p-3 align-top font-normal">{t('knowledgeLevel.' + row.knowledgeLevel)}</th>{(['count', 'correct'] as const).map(field => {
          const limit = field === 'correct' && row.count.trim() ? Math.min(maximum, Number(row.count)) : maximum
          const outOfRange = row[field] !== '' && (!Number.isInteger(Number(row[field])) || Number(row[field]) < 1 || Number(row[field]) > limit)
          return <td key={field} className="p-3 align-top"><Input type="number" required placeholder={limit > 0 ? `1–${limit}` : "0"} min={1} max={Math.max(0, limit)} step={1} aria-invalid={outOfRange} aria-describedby={`baseline-${row.knowledgeLevel}-${field}-limit`} aria-label={`${t('knowledgeLevel.' + row.knowledgeLevel)} ${copy(field === 'count' ? 'questions' : 'correct', field === 'count' ? 'số câu' : 'số câu đúng')}`} value={row[field]} disabled={locked || step === 3 || maximum < 1} onChange={event => setValues(previous => ({ ...previous, levels: previous.levels.map((item, position) => position === index ? { ...item, [field]: event.target.value } : item) }))} /><Text id={`baseline-${row.knowledgeLevel}-${field}-limit`} variant="caption" tone={outOfRange ? 'destructive' : undefined}>{limit >= 1 ? `1–${limit}` : copy('No eligible questions', 'Chưa có câu hợp lệ')}</Text>{field === 'count' && capacity && capacity.limitingSkills.length > 0 && <details className="mt-1 text-caption text-muted-foreground"><summary className="cursor-pointer">{copy('Limiting Skills', 'Skill giới hạn')} ({capacity.limitingSkills.length})</summary><p className="mt-1 break-words">{capacity.limitingSkills.join(', ')}</p></details>}</td>
        })}</tr>
      })}</tbody></table></div>}
      {values.levels.length > 0 && <Text variant="caption">{copy('All required Skills must have enough published questions.', 'Mọi Skill yêu cầu phải có đủ câu hỏi đã xuất bản.')}</Text>}
    </ManagementSection>}
    {step === 1 && <BaselineRequestForm workspace={workspace} />}
    {(step === 2 || step === 3) && <ManagementSection title={copy('Time & retakes', 'Thời gian và làm lại')}><div className="grid gap-3 sm:grid-cols-3">{([
      ['seconds', copy('Seconds per question', 'Giây mỗi câu'), 1, '60'], ['wait', copy('Retake wait (minutes)', 'Chờ làm lại (phút)'), 0, '1'], ['attempts', copy('Maximum attempts', 'Số lượt tối đa'), 1, '3'],
    ] as const).map(([field, label, min, example]) => <label key={field} className="flex flex-col gap-2 text-body-sm"><span>{label} *</span><Input type="number" required min={min} step={field === 'wait' ? 'any' : 1} placeholder={copy(`e.g. ${example}`, `VD: ${example}`)} aria-label={label} value={values[field]} disabled={locked || step === 3} onChange={event => setValues(previous => ({ ...previous, [field]: event.target.value }))} /></label>)}</div><Text variant="caption">{copy('Required fields. Duration = seconds per question × question count.', 'Các ô đều bắt buộc. Thời lượng = giây mỗi câu × số câu.')}</Text></ManagementSection>}
    {workspace.scope.memberLevels && <details className="rounded-lg border border-border p-3 text-caption"><summary className="cursor-pointer">{copy('Role levels covered', 'Các Role Level áp dụng')} ({workspace.scope.memberLevels.length})</summary><ul className="mt-2 space-y-1">{workspace.scope.memberLevels.map(member => <li key={member.id}>{member.name} · {member.groups.length} {copy('required Skill–knowledge groups', 'nhóm Skill–kiến thức yêu cầu')}</li>)}</ul></details>}
    <div className="flex justify-between gap-3"><Button variant="outline" disabled={locked || step === 1} onClick={() => setStep(value => value - 1)}>{copy('Back', 'Quay lại')}</Button>{step < 3 && <Button variant="secondary" disabled={locked || !values.levels.length || workspace.capacities.some(item => item.maxQuestions < 1)} onClick={() => move(step + 1)}>{copy('Next', 'Tiếp theo')}</Button>}</div>
  </DialogBody>
})
