import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readSkillEligibility, readSkillModules, startSkillModule, type SkillEligibility, type OptionalSkillModule } from '../../../shared/api/skillLearningApi'
import { useWorkspaceSlug, workspaceUrl } from '../../../shared/auth/workspacePaths'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Heading } from '../../../shared/components/typography/Heading'

/** Shows the learning prerequisite; never simulates an assessment or learner mastery. */
export function SkillLearningPanel({ skillId, skillName, moduleId, completedLessons }: { skillId: string; skillName: string; moduleId: string; completedLessons: number }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const slug = useWorkspaceSlug(), navigate = useNavigate()
  type Data = { eligibility: SkillEligibility; modules: OptionalSkillModule[] }
  const [result, setResult] = useState<{ key: string; data: Data | null; error: string } | null>(null)
  const [actionError, setActionError] = useState<{ key: string; message: string } | null>(null)
  const [busy, setBusy] = useState(''), [attempt, setAttempt] = useState(0)
  const key = `${skillId}/${moduleId}/${completedLessons}/${attempt}/${vi}`
  const state = result?.key === key ? result.data : null
  const loading = result?.key !== key
  const error = (result?.key === key ? result.error : '') || (actionError?.key === key ? actionError.message : '')
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([readSkillEligibility(skillId, controller.signal), readSkillModules(skillId, controller.signal)])
      .then(([eligibility, modules]) => { if (!controller.signal.aborted) setResult({ key, data: { eligibility, modules }, error: '' }) })
      .catch((e: unknown) => { if (!controller.signal.aborted) setResult({ key, data: null, error: e instanceof Error ? e.message : (vi ? 'Không thể kiểm tra điều kiện học tập.' : 'Cannot check learning eligibility.') }) })
    return () => controller.abort()
  }, [skillId, key, vi])
  const alternatives = state?.modules.filter(m => m.moduleId !== moduleId) ?? []
  async function open(m: OptionalSkillModule) {
    if (busy) return
    setBusy(m.moduleId); setActionError(null)
    try {
      await startSkillModule(skillId, m.moduleId)
      const path = `/employee/modules/${encodeURIComponent(m.moduleId)}`
      void navigate(slug ? workspaceUrl(slug, path) : path)
    } catch (e) { setActionError({ key, message: e instanceof Error ? e.message : 'Cannot start module' }) }
    finally { setBusy('') }
  }
  return <section id="skill-learning-status" tabIndex={-1} className="space-y-3 rounded-lg border border-border bg-card p-4" aria-label={vi ? 'Điều kiện thi kỹ năng và học thêm' : 'Skill learning eligibility and optional modules'} aria-busy={loading}>
    <Heading level={3} size="card">{skillName}</Heading>
    {loading && <p className="text-body-sm text-muted-foreground" role="status">{vi ? 'Đang kiểm tra điều kiện học tập…' : 'Checking learning eligibility…'}</p>}
    {error && <div className="space-y-2"><p className="text-body-sm text-destructive" role="alert">{error}</p><Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => setAttempt(n => n + 1)}>{vi ? 'Thử lại' : 'Retry'}</Button></div>}
    {state && <>
      <Badge variant={state.eligibility.eligible ? 'success' : 'secondary'}>{state.eligibility.eligible ? (vi ? 'Đủ điều kiện học tập để thi Skill' : 'Learning prerequisite met for Skill Assessment') : (vi ? 'Chưa đủ điều kiện học tập để thi Skill' : 'Learning prerequisite not met')}</Badge>
      <p className="text-body-sm text-muted-foreground">{state.eligibility.eligible ? (vi ? 'Bạn có thể tiếp tục học các module khác nếu muốn. Hoàn thành bài học chưa đồng nghĩa đã đạt kỹ năng.' : 'You may continue studying other modules. Learning completion does not mean skill mastery.') : (vi ? 'Hoàn thành tất cả bài học trong một module của kỹ năng này để đủ điều kiện học tập cho bài thi.' : 'Complete every lesson in any one module of this skill to meet the learning prerequisite.')}</p>
      {state.eligibility.qualifyingCompletion && <p className="text-caption text-muted-foreground">{vi ? 'Bằng chứng' : 'Completion evidence'}: {state.eligibility.qualifyingCompletion.moduleId} · {vi ? 'phiên bản' : 'revision'} {state.eligibility.qualifyingCompletion.revision}</p>}
      <Heading level={4} size="card">{vi ? 'Module cùng kỹ năng để học thêm' : 'More modules for this skill'}</Heading>
      {!alternatives.length && <p className="text-body-sm text-muted-foreground">{vi ? 'Chưa có module khác được duyệt cho kỹ năng này.' : 'No other approved modules are available for this skill.'}</p>}
      <ul className="space-y-2">{alternatives.map(m => <li key={m.moduleId} className="flex flex-col items-stretch gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 flex-1 break-words text-body-sm">{m.title}</span><div className="flex flex-wrap items-center gap-2">{m.completed && <Badge variant="success">{vi ? 'Đã hoàn thành' : 'Completed'}</Badge>}<Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => void open(m)}>{busy === m.moduleId ? (vi ? 'Đang mở…' : 'Opening…') : m.started ? (vi ? 'Học tiếp' : 'Continue learning') : (vi ? 'Học thêm' : 'Study module')}</Button></div></li>)}</ul>
    </>}
  </section>
}
