import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { bankRequest, type BankSession } from '../../../shared/api/questionBankApi'
import { getRulePolicy, listRulePolicies, rulePolicy, runRulePolicyCommand, type AssessmentPurpose, type RulePolicyState, type RulePolicyVersion, type RulePolicyCommand } from './assessmentRulePolicyApi'

const selectClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[length:var(--text-body-sm)] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
type GroupDraft = { skillId: string; knowledgeLevel: string; totalCount: string; requiredCorrectCount: string; mandatoryRequired: boolean; allWrongVeto: boolean }
export function AssessmentPolicyTab(props: { onPendingChange?: (pending: boolean) => void; returnToBaseline?: string }) {
  const { language } = useTranslation(), [purpose, setPurpose] = useState<AssessmentPurpose>('BASELINE'), [locked, setLocked] = useState(false)
  const { onPendingChange } = props
  const reportPending = useCallback((value: boolean) => { setLocked(value); onPendingChange?.(value) }, [onPendingChange])
  return <div className="space-y-5"><Tabs value={purpose} onValueChange={value => { if (!locked) setPurpose(value as AssessmentPurpose) }}><TabsList>
    <TabsTrigger value="BASELINE" disabled={locked}>{language === 'vi' ? 'Đánh giá đầu vào' : 'Baseline'}</TabsTrigger>
    <TabsTrigger value="SKILL_ASSESSMENT" disabled={locked}>{language === 'vi' ? 'Đánh giá kỹ năng' : 'Skill Assessment'}</TabsTrigger>
  </TabsList></Tabs><RulePolicyEditor key={purpose} purpose={purpose} onPendingChange={reportPending} returnToBaseline={props.returnToBaseline} /></div>
}
function RulePolicyEditor({ purpose, onPendingChange, returnToBaseline }: { purpose: AssessmentPurpose; onPendingChange: (pending: boolean) => void; returnToBaseline?: string }) {
  const { language } = useTranslation(), vi = language === 'vi', copy = (en: string, vn: string) => vi ? vn : en, navigate = useNavigate()
  const [state, setState] = useState<RulePolicyState | null>(null), [versions, setVersions] = useState<RulePolicyVersion[]>([]), [skills, setSkills] = useState<BankSession['skills']>([])
  const [timer, setTimer] = useState(''), [wait, setWait] = useState(''), [max, setMax] = useState(''), [groups, setGroups] = useState<GroupDraft[]>([])
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [page, setPage] = useState(0), [reload, setReload] = useState(0)
  const [pending, setPending] = useState<RulePolicyCommand | null>(null), [confirm, setConfirm] = useState<RulePolicyVersion | null>(null), inFlight = useRef(false), initialized = useRef(false)
  useEffect(() => { onPendingChange(busy || pending !== null); return () => onPendingChange(false) }, [busy, pending, onPendingChange])
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([getRulePolicy(purpose, controller.signal), listRulePolicies(purpose, page, controller.signal), bankRequest<BankSession>('/session', undefined, controller.signal)])
      .then(([current, history, session]) => {
        if (controller.signal.aborted) return
        setState(current); setVersions(history); setSkills(session.skills); setError('')
        if (!initialized.current) {
          initialized.current = true
          if (current.active) { const c = current.active.configuration; setTimer(String(c.timeLimitSeconds)); setWait(String(c.retakeWaitSeconds)); setMax(String(c.maxAttempts)); setGroups(c.groups.map(g => ({ ...g, totalCount: String(g.totalCount), requiredCorrectCount: String(g.requiredCorrectCount) }))) }
        }
      }).catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load policies.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [purpose, page, reload])
  const locked = busy || pending !== null || loading || !state
  async function execute(command: RulePolicyCommand) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setPending(command); setError(''); setNotice(''); setConfirm(null)
    try { await runRulePolicyCommand(command); setPending(null); setNotice(copy('Policy saved.', 'Đã lưu cấu hình.')); setLoading(true); setReload(v => v + 1) }
    catch (e) { setError(e instanceof Error ? e.message : copy('Unable to save.', 'Không lưu được.')); const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 0; if (status >= 400 && status < 500) { setPending(null); setLoading(true); setReload(v => v + 1) } }
    finally { inFlight.current = false; setBusy(false) }
  }
  function save() {
    try {
      const number = (value: string) => { if (!value.trim()) throw new Error('Required'); return Number(value) }
      const configuration = rulePolicy({ timeLimitSeconds: number(timer), retakeWaitSeconds: number(wait), maxAttempts: number(max), groups: groups.map(g => ({ ...g, totalCount: number(g.totalCount), requiredCorrectCount: number(g.requiredCorrectCount) })) })
      void execute({ purpose, kind: 'save', commandKey: crypto.randomUUID(), configuration })
    } catch { setError(copy('Enter valid timing and unique skill-level groups. Required correct answers must be within the total.', 'Nhập thời gian hợp lệ và nhóm kỹ năng–mức không trùng. Số câu đúng bắt buộc phải nằm trong tổng số câu.')) }
  }
  const patchGroup = (index: number, patch: Partial<GroupDraft>) => setGroups(all => all.map((g, i) => i === index ? { ...g, ...patch } : g))
  return <div className="space-y-5">
    {returnToBaseline && purpose === 'BASELINE' && <Button variant="outline" disabled={locked || !state?.active} onClick={() => navigate(returnToBaseline)}>{copy('Return to baseline', 'Trở lại đánh giá đầu vào')}</Button>}
    <Card><CardHeader><Heading level={2} size="section">{purpose === 'BASELINE' ? copy('Baseline policy', 'Cấu hình đánh giá đầu vào') : copy('Skill Assessment policy', 'Cấu hình đánh giá kỹ năng')}</Heading><Text>{copy('Set the assessment time and passing rules for each skill and knowledge level.', 'Cấu hình thời gian và quy tắc đạt cho từng kỹ năng và mức kiến thức.')}</Text></CardHeader><CardContent className="space-y-4">
      {loading && <Text role="status">{copy('Loading…', 'Đang tải…')}</Text>}{error && <Text role="alert" tone="destructive">{error}</Text>}{notice && <Text role="status" tone="success">{notice}</Text>}
      {state && <Badge variant={state.active ? 'success' : 'warning'}>{state.active ? copy('Active version ', 'Phiên bản đang dùng ') + state.active.version : copy('No active policy', 'Chưa kích hoạt cấu hình')}</Badge>}
      {pending && !busy && <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-4"><Text>{copy('The result is uncertain. Retry the same request.', 'Chưa xác định được kết quả. Hãy gửi lại yêu cầu cũ.')}</Text><Button variant="outline" onClick={() => void execute(pending)}>{copy('Retry', 'Thử lại')}</Button></div>}
      <Button variant="outline" disabled={busy} onClick={() => { setLoading(true); setReload(v => v + 1) }}>{copy('Refresh', 'Tải lại')}</Button>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); save() }}>
        <div className="grid gap-4 md:grid-cols-2">{[{ label: copy('Time limit (seconds)', 'Thời gian làm bài (giây)'), value: timer, set: setTimer, min: 1 }, { label: copy('Wait before retake (seconds)', 'Chờ trước khi làm lại (giây)'), value: wait, set: setWait, min: 0 }, { label: copy('Maximum attempts', 'Số lượt làm tối đa'), value: max, set: setMax, min: 1 }].map(f => <label key={f.label} className="space-y-2"><Text as="span">{f.label}</Text><Input type="number" step="1" min={f.min} required disabled={locked} value={f.value} onChange={e => f.set(e.target.value)} /></label>)}</div>
        {groups.map((g, index) => <div key={index} className="space-y-3 rounded-lg border border-border p-3"><div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2"><Text as="span">{copy('Skill', 'Kỹ năng')}</Text><select className={selectClass} required disabled={locked} value={g.skillId} onChange={e => patchGroup(index, { skillId: e.target.value })}><option value="">{copy('Select skill', 'Chọn kỹ năng')}</option>{skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="space-y-2"><Text as="span">{copy('Knowledge level', 'Mức kiến thức')}</Text><select className={selectClass} required disabled={locked} value={g.knowledgeLevel} onChange={e => patchGroup(index, { knowledgeLevel: e.target.value })}><option value="">{copy('Select level', 'Chọn mức')}</option><option value="FOUNDATION">{copy('Foundation', 'Nền tảng')}</option><option value="INTERMEDIATE">{copy('Intermediate', 'Trung cấp')}</option><option value="ADVANCED">{copy('Advanced', 'Nâng cao')}</option></select></label>
          <label className="space-y-2"><Text as="span">{copy('Total questions', 'Tổng số câu')}</Text><Input type="number" min="1" max="500" step="1" required disabled={locked} value={g.totalCount} onChange={e => patchGroup(index, { totalCount: e.target.value })} /></label>
          <label className="space-y-2"><Text as="span">{copy('Required correct answers', 'Số câu đúng bắt buộc')}</Text><Input type="number" min="1" max={g.totalCount || undefined} step="1" required disabled={locked} value={g.requiredCorrectCount} onChange={e => patchGroup(index, { requiredCorrectCount: e.target.value })} /></label>
        </div><label className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={g.mandatoryRequired} onChange={e => patchGroup(index, { mandatoryRequired: e.target.checked })} /><Text as="span">{copy('Require all mandatory questions correct', 'Phải đúng tất cả câu bắt buộc')}</Text></label>
          {purpose === 'SKILL_ASSESSMENT' && <label className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={g.allWrongVeto} onChange={e => patchGroup(index, { allWrongVeto: e.target.checked })} /><Text as="span">{copy('Block main result on all-wrong prerequisite answers', 'Chặn kết quả chính khi sai toàn bộ câu tiền đề')}</Text></label>}
          <Button type="button" variant="outline" disabled={locked} onClick={() => setGroups(all => all.filter((_, i) => i !== index))}>{copy('Remove group', 'Bỏ nhóm')}</Button></div>)}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={locked || groups.length >= 1000} onClick={() => setGroups(all => [...all, { skillId: '', knowledgeLevel: '', totalCount: '', requiredCorrectCount: '', mandatoryRequired: false, allWrongVeto: false }])}>{copy('Add skill group', 'Thêm nhóm kỹ năng')}</Button><Button type="submit" disabled={locked}>{copy('Save version', 'Lưu phiên bản')}</Button></div>
      </form>
    </CardContent></Card>
    <Card><CardHeader><Heading level={2} size="subsection">{copy('Versions', 'Các phiên bản')}</Heading></CardHeader><CardContent className="space-y-3">{!versions.length && <Text>{copy('No versions yet.', 'Chưa có phiên bản.')}</Text>}{versions.map(v => <div key={v.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div><Heading level={3} size="card">{copy('Version ', 'Phiên bản ')}{v.version}</Heading><Text variant="caption">{new Date(v.createdAt).toLocaleString(vi ? 'vi-VN' : 'en-US')} · {v.configuration.groups.length} {copy('groups', 'nhóm')}</Text></div>{v.id === state?.active?.id ? <Badge variant="success">{copy('Active', 'Đang dùng')}</Badge> : <Button variant="outline" disabled={locked} onClick={() => setConfirm(v)}>{copy('Activate', 'Kích hoạt')}</Button>}</div>)}<div className="flex gap-2"><Button variant="outline" disabled={locked || page === 0} onClick={() => { setLoading(true); setPage(p => p - 1) }}>{copy('Previous', 'Trang trước')}</Button><Button variant="outline" disabled={locked || versions.length < 20} onClick={() => { setLoading(true); setPage(p => p + 1) }}>{copy('Next', 'Trang sau')}</Button></div></CardContent></Card>
    <Dialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null) }} ariaLabel={copy('Activate policy', 'Kích hoạt cấu hình')}><DialogHeader><DialogTitle>{copy('Activate policy', 'Kích hoạt cấu hình')}</DialogTitle><DialogDescription>{copy('New attempts use this version. Attempts already started keep their saved policy and deadline.', 'Lượt làm mới dùng phiên bản này. Lượt đã bắt đầu giữ cấu hình và hạn làm bài đã lưu.')}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>{copy('Cancel', 'Hủy')}</Button><Button disabled={busy || !confirm || !state} onClick={() => { if (confirm && state) void execute({ purpose, kind: 'activate', commandKey: crypto.randomUUID(), versionId: confirm.id, expectedRevision: state.activationRevision }) }}>{copy('Activate', 'Kích hoạt')}</Button></DialogFooter></Dialog>
  </div>
}
