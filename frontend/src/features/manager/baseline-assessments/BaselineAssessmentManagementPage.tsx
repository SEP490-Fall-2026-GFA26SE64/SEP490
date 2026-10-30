import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  RefreshCw,
  Search,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  BaselineAssessmentManagementApiError,
  type BaselineAssessmentOccupation,
  type BaselineAssessmentStatus,
  type PendingStage,
  listBaselineAssessmentOccupations,
} from './baselineAssessmentManagementApi'

const PAGE_SIZE = 12

export function BaselineAssessmentManagementPage() {
  const navigate = useNavigate()
  const { language, t } = useTranslation()
  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<BaselineAssessmentStatus>('')
  const [sort, setSort] = React.useState<'name_asc' | 'name_desc'>('name_asc')
  const [page, setPage] = React.useState(0)
  const [reloadRevision, setReloadRevision] = React.useState(0)
  const [result, setResult] = React.useState({ items: [] as BaselineAssessmentOccupation[], total: 0 })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0)
      setSearch(searchInput.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void listBaselineAssessmentOccupations({ search, status, sort, page, size: PAGE_SIZE, signal: controller.signal })
      .then((response) => setResult({ items: response.items, total: response.total }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(apiErrorMessage(cause, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [page, reloadRevision, search, sort, status, t])

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
  const openWorkspace = (occupationId: string) => {
    navigate(`/ld-manager/baseline-assessments/${encodeURIComponent(occupationId)}`)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          icon={<ClipboardCheck className="h-7 w-7" />}
          title={t('baselineAssessmentManagement.pageTitle')}
          description={t('baselineAssessmentManagement.pageDescription')}
          actions={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
              disabled={loading}
              onClick={() => setReloadRevision((value) => value + 1)}
            >
              {t('common.refresh')}
            </Button>
          }
        />

        <Card className="overflow-hidden border-border shadow-xs">
          <CardHeader className="border-b border-border bg-card pb-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  {t('baselineAssessmentManagement.directoryTitle')}
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {t('baselineAssessmentManagement.directoryDescription')}
                </CardDescription>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-auto xl:grid-cols-[17rem_13rem_11rem]">
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                  placeholder={t('baselineAssessmentManagement.searchPlaceholder')}
                  aria-label={t('baselineAssessmentManagement.searchLabel')}
                />
                <select
                  value={status}
                  onChange={(event) => { setStatus(event.target.value as BaselineAssessmentStatus); setPage(0) }}
                  aria-label={t('baselineAssessmentManagement.statusFilter')}
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t('baselineAssessmentManagement.allStatuses')}</option>
                  <option value="NOT_CONFIGURED">{t('baselineAssessmentManagement.status.notConfigured')}</option>
                  <option value="WORKING_REVISION">{t('baselineAssessmentManagement.status.workingRevision')}</option>
                  <option value="BLUEPRINT_CANDIDATE">{t('baselineAssessmentManagement.status.blueprintCandidate')}</option>
                  <option value="DRAFT">{t('baselineAssessmentManagement.status.draft')}</option>
                  <option value="REVIEWED">{t('baselineAssessmentManagement.status.reviewed')}</option>
                  <option value="ACTIVE">{t('baselineAssessmentManagement.status.active')}</option>
                </select>
                <select
                  value={sort}
                  onChange={(event) => { setSort(event.target.value as 'name_asc' | 'name_desc'); setPage(0) }}
                  aria-label={t('baselineAssessmentManagement.sortLabel')}
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="name_asc">{t('baselineAssessmentManagement.sortAscending')}</option>
                  <option value="name_desc">{t('baselineAssessmentManagement.sortDescending')}</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {error ? (
              <EmptyState
                bordered={false}
                icon={<AlertCircle className="h-7 w-7" />}
                title={t('baselineAssessmentManagement.loadFailed')}
                description={error}
                action={<Button size="sm" onClick={() => setReloadRevision((value) => value + 1)}>{t('common.refresh')}</Button>}
              />
            ) : loading ? (
              <LoadingRows />
            ) : result.items.length === 0 ? (
              <EmptyState
                bordered={false}
                icon={<FileQuestion className="h-7 w-7" />}
                title={t('baselineAssessmentManagement.emptyTitle')}
                description={t('baselineAssessmentManagement.emptyDescription')}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground">
                        <th className="px-4 py-3">{t('baselineAssessmentManagement.columns.occupation')}</th>
                        <th className="px-4 py-3">{t('baselineAssessmentManagement.columns.blueprint')}</th>
                        <th className="px-4 py-3">{t('baselineAssessmentManagement.columns.pending')}</th>
                        <th className="px-4 py-3">{t('baselineAssessmentManagement.columns.candidate')}</th>
                        <th className="px-4 py-3">{t('baselineAssessmentManagement.columns.active')}</th>
                        <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.items.map((occupation) => (
                        <tr key={occupation.occupationId} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-foreground">{occupation.occupationName}</div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{occupation.occupationId}</div>
                          </td>
                          <td className="px-4 py-4">{versionLabel(occupation.latestBlueprintVersion, t)}</td>
                          <td className="px-4 py-4"><PendingBadge stage={occupation.pendingStage} t={t} /></td>
                          <td className="px-4 py-4"><CandidateBadge occupation={occupation} t={t} /></td>
                          <td className="px-4 py-4"><ActiveBadge version={occupation.activeAssessmentVersion} t={t} /></td>
                          <td className="px-4 py-4 text-right">
                            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => openWorkspace(occupation.occupationId)}>
                              {primaryAction(occupation, t)}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-3 md:hidden">
                  {result.items.map((occupation) => (
                    <article key={occupation.occupationId} className="rounded-lg border border-border bg-card p-4 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground">{occupation.occupationName}</h3>
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{occupation.occupationId}</p>
                        </div>
                        <ActiveBadge version={occupation.activeAssessmentVersion} t={t} />
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <LifecycleField label={t('baselineAssessmentManagement.columns.blueprint')} value={versionLabel(occupation.latestBlueprintVersion, t)} />
                        <LifecycleField label={t('baselineAssessmentManagement.columns.pending')} value={<PendingBadge stage={occupation.pendingStage} t={t} />} />
                        <LifecycleField label={t('baselineAssessmentManagement.columns.candidate')} value={<CandidateBadge occupation={occupation} t={t} />} />
                        <LifecycleField label={t('baselineAssessmentManagement.updated')} value={formatDate(occupation.lastUpdatedAt, language, t)} />
                      </dl>
                      <Button className="mt-4 w-full" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => openWorkspace(occupation.occupationId)}>
                        {primaryAction(occupation, t)}
                      </Button>
                    </article>
                  ))}
                </div>

                <Pagination
                  currentPage={page + 1}
                  totalPages={totalPages}
                  totalItems={result.total}
                  pageSize={PAGE_SIZE}
                  itemLabel={t('baselineAssessmentManagement.occupationItems')}
                  onPageChange={(nextPage) => setPage(nextPage - 1)}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  )
}

type Translate = (key: string, fallback?: string) => string

function PendingBadge({ stage, t }: { stage: PendingStage; t: Translate }) {
  if (stage === 'NONE') return <span className="text-muted-foreground">{t('baselineAssessmentManagement.none')}</span>
  return <Badge variant="warning">{t(`baselineAssessmentManagement.status.${pendingKey(stage)}`)}</Badge>
}

function CandidateBadge({ occupation, t }: { occupation: BaselineAssessmentOccupation; t: Translate }) {
  if (occupation.openAssessmentVersion === null || occupation.openAssessmentState === null) {
    return <span className="text-muted-foreground">{t('baselineAssessmentManagement.none')}</span>
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={occupation.openAssessmentState === 'REVIEWED' ? 'success' : 'warning'}>
        {t(`baselineAssessmentManagement.status.${occupation.openAssessmentState === 'REVIEWED' ? 'reviewed' : 'draft'}`)}
      </Badge>
      <span className="text-[11px] text-muted-foreground">v{occupation.openAssessmentVersion}</span>
    </div>
  )
}

function ActiveBadge({ version, t }: { version: number | null; t: Translate }) {
  return version === null
    ? <Badge variant="outline">{t('baselineAssessmentManagement.status.notConfigured')}</Badge>
    : <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />{t('baselineAssessmentManagement.activeVersion').replace('{version}', String(version))}</Badge>
}

function LifecycleField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="mb-1 text-muted-foreground">{label}</dt><dd className="font-medium text-foreground">{value}</dd></div>
}

function versionLabel(version: number | null, t: Translate) {
  return version === null ? t('baselineAssessmentManagement.none') : `v${version}`
}

function pendingKey(stage: PendingStage) {
  return {
    WORKING_REVISION: 'workingRevision',
    BLUEPRINT_CANDIDATE: 'blueprintCandidate',
    ASSESSMENT_DRAFT: 'assessmentDraft',
    ASSESSMENT_REVIEWED: 'assessmentReviewed',
    NONE: 'none',
  }[stage]
}

function primaryAction(occupation: BaselineAssessmentOccupation, t: Translate) {
  if (occupation.pendingStage !== 'NONE' || occupation.openAssessmentVersion !== null) {
    return t('baselineAssessmentManagement.continueAction')
  }
  if (occupation.activeAssessmentVersion !== null) return t('baselineAssessmentManagement.manageAction')
  return t('baselineAssessmentManagement.configureAction')
}

function formatDate(value: string | null, language: 'en' | 'vi', t: Translate) {
  if (!value) return t('baselineAssessmentManagement.notAvailable')
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? t('baselineAssessmentManagement.notAvailable') : new Intl.DateTimeFormat(language).format(date)
}

function apiErrorMessage(cause: unknown, t: Translate) {
  if (cause instanceof BaselineAssessmentManagementApiError) {
    const key = `baselineAssessmentManagement.apiErrors.${cause.code}`
    const translated = t(key)
    return translated === key ? cause.message : translated
  }
  return t('baselineAssessmentManagement.apiErrors.unexpected')
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4" aria-busy="true">
      {[0, 1, 2, 3].map((row) => <div key={row} className="h-16 animate-pulse rounded-lg bg-muted/60" />)}
    </div>
  )
}
