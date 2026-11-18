import { useContext, useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Search } from 'lucide-react'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Card } from '../../../shared/components/ui/Card'
import { Heading } from '../../../shared/components/typography/Heading'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { readKnowledgeProfile } from './knowledgeProfileApi'
import { achievedSkills } from './achievedSkills'
import { attemptPath } from './baselineApi'

export function MySkillsPage() {
  return <WorkspaceLayout><MySkillsSummary /></WorkspaceLayout>
}

export function MySkillsSummary() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <OwnedMySkills key={JSON.stringify([identity?.organizationId, identity?.accountId, identity?.roles])} />
}

function OwnedMySkills() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const { language, t } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const allowed = Boolean(identity?.organizationId && identity.accountId && identity.roles?.includes('EMPLOYEE'))
  const [search, setSearch] = useState(''), [level, setLevel] = useState(''), [selected, setSelected] = useState<string | null>(null)
  const profile = useInfiniteQuery({ queryKey: ['my-achieved-skills', identity?.organizationId, identity?.accountId],
    initialPageParam: 0, queryFn: ({ pageParam, signal }) => readKnowledgeProfile(pageParam, signal),
    getNextPageParam: last => last.hasMore && last.page < 250 ? last.page + 1 : undefined,
    enabled: allowed, retry: false, gcTime: 0, refetchOnWindowFocus: true })
  const { hasNextPage, isFetching, isError, fetchNextPage } = profile
  const loadedPageCount = profile.data?.pages.length ?? 0
  useEffect(() => {
    if (allowed && hasNextPage && !isFetching && !isError) void fetchNextPage()
  }, [allowed, hasNextPage, isFetching, isError, fetchNextPage, loadedPageCount])
  const denied = !allowed || Boolean(profile.error && 'status' in profile.error && [401, 403].includes(Number(profile.error.status)))
  const skills = useMemo(() => achievedSkills(denied ? [] : profile.data?.pages.flatMap(p => p.items) ?? []), [profile.data, denied])
  const incomplete = !profile.data || Boolean(profile.data.pages.at(-1)?.hasMore) || profile.isError
  const limited = profile.data?.pages.at(-1)?.page === 250 && profile.data.pages.at(-1)?.hasMore
  const visible = skills.filter(skill => `${skill.skillName} ${skill.skillId}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (!level || skill.levels.some(l => l.knowledgeLevel === level)))
  const detail = denied ? undefined : skills.flatMap(skill => skill.levels).find(node => node.key === selected)
  const retry = () => { if (profile.isFetchNextPageError) void profile.fetchNextPage(); else void profile.refetch() }
  return <div className="space-y-5">
    <PageHeader title={copy('My Skills', 'Kỹ năng của tôi')} description={copy('Officially achieved skill levels from your pathways and individual learning.', 'Các mức kỹ năng đã đạt chính thức từ lộ trình và học kỹ năng độc lập.')} icon={<Award size={24} aria-hidden="true" />} actions={<Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/employee/upskilling?tab=skills">{copy('Explore skills', 'Khám phá kỹ năng')}</Link>} />
    {denied ? <p role="alert" className="text-body-sm text-destructive">{copy('Sign in as an Employee to view your achieved skills.', 'Đăng nhập với vai trò Employee để xem kỹ năng đã đạt của bạn.')}</p> : <>
      <Card className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
        <div className="min-w-0 space-y-1.5"><label htmlFor="my-skills-search" className="text-body-sm font-medium">{copy('Search skills', 'Tìm kỹ năng')}</label><div className="relative"><Search size={16} aria-hidden="true" className="absolute left-3 top-3 text-muted-foreground" /><Input id="my-skills-search" type="search" className="pl-9" maxLength={200} value={search} onChange={e => setSearch(e.target.value)} placeholder={copy('Search by skill name', 'Tìm theo tên kỹ năng')} /></div></div>
        <div className="min-w-0 space-y-1.5"><label htmlFor="my-skills-level" className="text-body-sm font-medium">{copy('Achieved level', 'Mức đã đạt')}</label><Combobox id="my-skills-level" aria-label={copy('Achieved level', 'Mức đã đạt')} clearable={false} value={level || 'ALL'} onChange={value => setLevel(value === 'ALL' ? '' : value)} options={[{ value: 'ALL', label: copy('All achieved levels', 'Tất cả mức đã đạt') }, ...['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(value => ({ value, label: t('knowledgeLevel.' + value) }))]} /></div>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-caption text-muted-foreground" role="status">{incomplete ? copy(`${skills.length} skill versions loaded. The summary is not complete yet.`, `Đã tải ${skills.length} phiên bản kỹ năng. Danh sách chưa đầy đủ.`) : copy(`${visible.length} skill versions with achieved levels`, `${visible.length} phiên bản kỹ năng có mức đã đạt`)}</p><Button size="sm" variant="ghost" disabled={profile.isFetching} onClick={() => void profile.refetch()}>{copy('Refresh', 'Tải lại')}</Button></div>
      {profile.isFetching && <p role="status" className="text-body-sm text-muted-foreground">{copy('Loading achievement records…', 'Đang tải minh chứng đạt kỹ năng…')}</p>}
      {profile.isError && <div role="alert" className="space-y-2 rounded-lg border border-border bg-card p-4"><p className="text-body-sm">{copy('Achievement records could not be fully loaded. Any records shown are incomplete; this does not mean other levels were not achieved.', 'Chưa tải được đầy đủ minh chứng. Các mục đang hiển thị chưa đầy đủ; không thể kết luận các mức khác chưa đạt.')}</p><Button variant="outline" size="sm" disabled={profile.isFetching} onClick={retry}>{copy('Retry', 'Thử lại')}</Button></div>}
      {limited && <p role="alert" className="text-body-sm text-muted-foreground">{copy('The history limit was reached. Search and filters cover loaded records only.', 'Đã chạm giới hạn tải lịch sử. Tìm kiếm và bộ lọc chỉ áp dụng cho các bản ghi đã tải.')}</p>}
      {visible.length > 0 && <Card><ul aria-label={copy('Achieved skills', 'Kỹ năng đã đạt')} className="divide-y divide-border">{visible.map(skill => <li key={skill.key} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5">
        <div className="min-w-0 space-y-1"><Heading level={2} size="card" className="break-words">{skill.skillName}</Heading><p className="text-caption text-muted-foreground">{copy('Skill version', 'Phiên bản kỹ năng')}: {skill.skillVersion}</p></div>
        <div className="flex flex-wrap gap-2 sm:justify-end">{skill.levels.map(node => <div key={node.key} className="flex flex-wrap items-center gap-1.5"><Button variant="outline" size="sm" className="gap-1.5 border-success/30 bg-success/10 text-foreground hover:bg-success/20" aria-haspopup="dialog" aria-label={`${skill.skillName} · ${t('knowledgeLevel.' + node.knowledgeLevel)} · ${skill.skillVersion}`} onClick={() => setSelected(node.key)}><CheckCircle2 size={15} aria-hidden="true" className="text-success" />{t('knowledgeLevel.' + node.knowledgeLevel)}</Button>{node.needsReview && <Badge variant="warning">{copy('Needs review', 'Cần xem xét')}</Badge>}</div>)}</div>
      </li>)}</ul></Card>}
      {!visible.length && !incomplete && <Card className="space-y-3 p-6 text-center"><Heading level={2} size="card">{skills.length ? copy('No matching achieved skills', 'Không có kỹ năng đã đạt phù hợp') : copy('No achieved skills yet', 'Chưa có kỹ năng đạt chính thức')}</Heading><p className="text-body-sm text-muted-foreground">{skills.length ? copy('Try another search or achieved level.', 'Thử từ khóa hoặc mức đã đạt khác.') : copy('Your official achievements will appear here when they are recorded.', 'Kỹ năng đã đạt sẽ xuất hiện tại đây khi được ghi nhận chính thức.')}</p>{skills.length ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); setLevel('') }}>{copy('Reset filters', 'Xóa bộ lọc')}</Button> : <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} to="/employee/upskilling?tab=skills">{copy('Explore skills', 'Khám phá kỹ năng')}</Link>}</Card>}
    </>}
    <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setSelected(null) }} size="wide" ariaLabel={copy('Achievement details', 'Chi tiết kỹ năng đã đạt')} closeLabel={copy('Close achievement details', 'Đóng chi tiết kỹ năng')}>
      {detail && <><DialogHeader><DialogTitle className="break-words">{detail.skillName}</DialogTitle><p className="text-body-sm text-muted-foreground">{t('knowledgeLevel.' + detail.knowledgeLevel)} · {copy('Skill version', 'Phiên bản kỹ năng')} {detail.skillVersion}</p></DialogHeader><DialogBody className="space-y-4">
        <div className="flex flex-wrap gap-2"><Badge variant="success">{copy('Achieved', 'Đã đạt')}</Badge>{detail.needsReview && <Badge variant="warning">{copy('Needs review — achievement retained', 'Cần xem xét — giữ nguyên achievement')}</Badge>}</div>
        {incomplete && <p role="status" className="text-body-sm text-muted-foreground">{copy('More evidence may exist. The loaded history is incomplete.', 'Có thể còn minh chứng khác. Lịch sử đã tải chưa đầy đủ.')}</p>}
        <ul className="space-y-3" aria-label={copy('Achievement evidence', 'Minh chứng đạt kỹ năng')}>{detail.evidence.map(e => <li key={e.id} className="space-y-2 rounded-lg border border-border p-3"><p className="text-body-sm font-medium">{e.sourceKind === 'CERTIFICATE' ? copy('Approved certificate', 'Chứng chỉ đã duyệt') : copy('Learning and Skill Assessment', 'Học và Skill Assessment')}</p><p className="text-caption text-muted-foreground">{copy('Recorded on', 'Ghi nhận lúc')}: <time dateTime={e.observedAt}>{new Date(e.observedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</time></p>{e.attemptId && <Link className={buttonVariants({ variant: 'link', size: 'sm', className: 'h-auto px-0' })} to={attemptPath(e.attemptId)}>{copy('View assessment result', 'Xem kết quả đánh giá')}</Link>}</li>)}</ul>
      </DialogBody><DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>{copy('Close', 'Đóng')}</Button></DialogFooter></>}
    </Dialog>
  </div>
}
