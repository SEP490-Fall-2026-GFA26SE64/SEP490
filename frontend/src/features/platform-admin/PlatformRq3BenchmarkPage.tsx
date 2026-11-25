import * as React from 'react'
import { CheckCircle2, Download, FlaskConical, RotateCcw } from 'lucide-react'
import { useTranslation } from '../../shared/i18n/LanguageContext'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { PageLoader } from '../../shared/components/ui/PageLoader'
import { StatCard } from '../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/Tabs'
import {
  buildRq3ProfilesCsv,
  fetchBuiltInRq3Report,
  formatSigned,
  type Rq3ExperimentReport,
} from './rq3BenchmarkEngine'
import { Rq3LearnerInspectorTab } from './Rq3LearnerInspectorTab'
import { Rq3StrataAndSensitivityTab } from './Rq3StrataAndSensitivityTab'

export function PlatformRq3BenchmarkPage() {
  const { language } = useTranslation()
  const isVi = language === 'vi'
  const copy = (vi: string, en: string) => (isVi ? vi : en)
  const { toast } = useToast()

  const [report, setReport] = React.useState<Rq3ExperimentReport | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [isRunning, setIsRunning] = React.useState<boolean>(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<string>('overview')
  const [runCount, setRunCount] = React.useState<number>(1)

  React.useEffect(() => {
    let mounted = true
    fetchBuiltInRq3Report()
      .then((data) => {
        if (!mounted) return
        setReport(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setLoadError(err instanceof Error ? err.message : 'Unable to load RQ3 experiment report')
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleReloadResults = async () => {
    if (isRunning) return
    setIsRunning(true)
    setLoadError(null)
    try {
      const fresh = await fetchBuiltInRq3Report()
      setReport(fresh)
      setRunCount((c) => c + 1)
      toast({
        title: copy('Đã tải lại kết quả RQ3', 'RQ3 results reloaded'),
        description: copy(
          `Kết quả đã lưu của lần chạy ${fresh.experimentId}: 100 hồ sơ × ${fresh.replicates} lần lặp, ΔD trung bình = ${formatSigned(fresh.deltaTargetDistanceA0vsS0.mean)}.`,
          `Saved results of run ${fresh.experimentId}: 100 profiles × ${fresh.replicates} replicates, mean ΔD = ${formatSigned(fresh.deltaTargetDistanceA0vsS0.mean)}.`,
        ),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reload results'
      setLoadError(msg)
      toast({
        variant: 'destructive',
        title: copy('Không thể tải lại kết quả RQ3', 'Unable to reload RQ3 results'),
        description: msg,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleDownloadJson = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.experimentId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadCsv = () => {
    if (!report) return
    const csv = buildRq3ProfilesCsv(report)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.experimentId}-profiles.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-7xl space-y-5 p-3 sm:p-6">
        <PageHeader
          forceShowTitle
          icon={<FlaskConical aria-hidden size={24} />}
          title={copy('RQ3 · Hiệu quả lộ trình thích ứng', 'RQ3 · Adaptive pathway efficiency')}
          description={copy(
            'Với cùng hồ sơ, lộ trình ban đầu và ngân sách, lộ trình thích ứng có giúp người học tiến gần vai trò mục tiêu hơn không?',
            'With the same profiles, starting pathways and activity budget, does adaptation bring learners closer to their target roles?',
          )}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={handleReloadResults}
                disabled={loading || isRunning}
                data-testid="rq3-run-button"
                title={copy(
                  'Trang hiển thị kết quả do Rq3SimulationRunner tính sẵn. Nút này chỉ tải lại kết quả, không chạy lại mô phỏng.',
                  'This page shows results precomputed by Rq3SimulationRunner. This button reloads them; it does not rerun the simulation.',
                )}
              >
                <RotateCcw aria-hidden size={16} className={isRunning ? 'animate-spin' : undefined} />
                <span className="ml-1.5">
                  {isRunning
                    ? copy('Đang tải kết quả...', 'Loading results...')
                    : copy('Tải lại kết quả đã lưu', 'Reload saved results')}
                </span>
              </Button>
              <Button variant="outline" onClick={handleDownloadCsv} disabled={!report} data-testid="rq3-export-csv">
                <Download aria-hidden size={16} />
                <span className="ml-1.5">{copy('Xuất CSV (100 hồ sơ)', 'Export CSV (100 profiles)')}</span>
              </Button>
              <Button variant="outline" onClick={handleDownloadJson} disabled={!report} data-testid="rq3-export-json">
                <Download aria-hidden size={16} />
                <span className="ml-1.5">{copy('Xuất JSON', 'Export JSON')}</span>
              </Button>
            </div>
          }
        />

        {loading ? (
          <PageLoader />
        ) : loadError || !report ? (
          <Card>
            <CardHeader>
              <CardTitle>{copy('Không thể tải dữ liệu thực nghiệm RQ3', 'Unable to load RQ3 experiment report')}</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="primary" onClick={handleReloadResults}>
                {copy('Thử tải lại', 'Retry loading')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={copy('Hồ sơ & Lần lặp', 'Cohort & Replicates')}
                value={`${report.profileCount} × ${report.replicates}`}
                description="34 Junior · 33 Middle · 33 Senior (Seed 20261125)"
              />
              <StatCard
                title={copy('Chênh lệch khoảng cách ΔD(40)', 'Paired distance gain ΔD(40)')}
                value={formatSigned(report.deltaTargetDistanceA0vsS0.mean)}
                description={`95% CI: [${formatSigned(report.deltaTargetDistanceA0vsS0.ci95Low)}, ${formatSigned(report.deltaTargetDistanceA0vsS0.ci95High)}]`}
              />
              <StatCard
                title={copy('Giảm lỗ hổng bắt buộc ΔD_gap(40)', 'Mandatory gap gain ΔD_gap(40)')}
                value={formatSigned(report.deltaGapDistanceA0vsS0.mean)}
                description={`S0: ${report.s0MeanGapTrajectory['40']?.toFixed(4)} → A0: ${report.a0MeanGapTrajectory['40']?.toFixed(4)}`}
              />
              <StatCard
                title={copy('Tỷ lệ thắng / Hòa / Thua (A0 vs S0)', 'Win / Tie / Loss (A0 vs S0)')}
                value={`${report.a0WinsOverS0} / ${report.a0TiesWithS0} / ${report.a0LossesToS0}`}
                description={copy(
                  `Hoàn tất lộ trình: A0 ${(report.a0ReleaseRate * 100).toFixed(1)}% vs S0 ${(report.s0ReleaseRate * 100).toFixed(1)}%`,
                  `Pathway release: A0 ${(report.a0ReleaseRate * 100).toFixed(1)}% vs S0 ${(report.s0ReleaseRate * 100).toFixed(1)}%`,
                )}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview" data-testid="rq3-tab-overview">
                  {copy('1. Quỹ đạo & Kết quả Tổng quan', '1. Trajectory & Primary Comparison')}
                </TabsTrigger>
                <TabsTrigger value="strata-sensitivity" data-testid="rq3-tab-strata">
                  {copy('2. Phân tầng & Độ nhạy', '2. Strata & Sensitivity Analysis')}
                </TabsTrigger>
                <TabsTrigger value="learner-inspector" data-testid="rq3-tab-inspector">
                  {copy('3. Tra cứu 100 Hồ sơ Học viên', '3. 100-Profile Trajectory Inspector')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>
                          {copy(
                            'Quỹ đạo khoảng cách tới vai trò mục tiêu D(u, b) theo mốc ngân sách',
                            'Target Role Distance Trajectory D(u, b) Across Budget Checkpoints',
                          )}
                        </CardTitle>
                        <CardDescription>
                          {copy(
                            'D(u, b) = |T(u) \\ E(u, b)| ÷ |T(u)|. Mỗi lượt học hoặc làm bài đánh giá tốn 1 đơn vị ngân sách (tối đa 40 đơn vị).',
                            'D(u, b) = |T(u) \\ E(u, b)| ÷ |T(u)|. Each learning action or assessment attempt consumes 1 budget unit (40 units max).',
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="success">
                        <CheckCircle2 aria-hidden size={13} className="mr-1" />
                        {copy(`Kết quả đã lưu · lần tải #${runCount}`, `Saved results · load #${runCount}`)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-sm" data-testid="rq3-checkpoint-table">
                        <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2.5">{copy('Mốc ngân sách (b)', 'Budget Checkpoint (b)')}</th>
                            <th className="px-3 py-2.5">S0 Static D(b)</th>
                            <th className="px-3 py-2.5">A0 Adaptive D(b)</th>
                            <th className="px-3 py-2.5">S1 Upfront D(b)</th>
                            <th className="px-3 py-2.5">ΔD (S0 − A0)</th>
                            <th className="px-3 py-2.5">S0 Gap D_gap(b)</th>
                            <th className="px-3 py-2.5">A0 Gap D_gap(b)</th>
                            <th className="px-3 py-2.5">ΔD_gap (S0 − A0)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {report.checkpoints.map((cp) => {
                            const k = String(cp)
                            const s0T = report.s0MeanTargetTrajectory[k] ?? 0
                            const a0T = report.a0MeanTargetTrajectory[k] ?? 0
                            const s1T = report.s1MeanTargetTrajectory[k] ?? 0
                            const diffT = s0T - a0T
                            const s0G = report.s0MeanGapTrajectory[k] ?? 0
                            const a0G = report.s0MeanGapTrajectory[k] !== undefined ? (report.a0MeanGapTrajectory[k] ?? 0) : 0
                            const diffG = s0G - a0G
                            return (
                              <tr key={cp} className="hover:bg-muted/30">
                                <td className="px-3 py-2.5 font-semibold text-foreground">
                                  {cp} {copy('đơn vị', 'units')}
                                </td>
                                <td className="px-3 py-2.5 font-mono">{s0T.toFixed(4)}</td>
                                <td className="px-3 py-2.5 font-mono font-semibold text-primary">{a0T.toFixed(4)}</td>
                                <td className="px-3 py-2.5 font-mono text-muted-foreground">{s1T.toFixed(4)}</td>
                                <td className="px-3 py-2.5 font-mono font-semibold">
                                  {diffT >= 0 ? '+' : ''}
                                  {diffT.toFixed(4)}
                                </td>
                                <td className="px-3 py-2.5 font-mono">{s0G.toFixed(4)}</td>
                                <td className="px-3 py-2.5 font-mono font-semibold text-primary">{a0G.toFixed(4)}</td>
                                <td className="px-3 py-2.5 font-mono">
                                  {diffG >= 0 ? '+' : ''}
                                  {diffG.toFixed(4)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border p-4">
                        <p className="font-semibold text-foreground">{copy('S0 · Lộ trình cố định', 'S0 · Primary Static Pathway')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {copy(
                            'Giữ cố định danh sách nhu cầu học ban đầu. Ngân sách tiêu thụ trung bình: ',
                            'Keeps initial baseline-derived curriculum fixed. Mean budget consumed: ',
                          )}
                          <span className="font-mono font-semibold text-foreground">{report.s0MeanBudgetUsed.toFixed(2)}</span> / 40.
                        </p>
                      </div>
                      <div className="rounded-lg border border-primary/40 bg-secondary/40 p-4">
                        <p className="font-semibold text-foreground">{copy('A0 · Lộ trình thích ứng (Engine)', 'A0 · Adaptive Recalculation')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {copy(
                            'Tự động bổ sung bước học tiên quyết khi bài đánh giá phát hiện thiếu hổng (trung bình +',
                            'Supplements prerequisite learning steps when assessment evidence reveals a gap (mean +',
                          )}
                          <span className="font-mono font-semibold text-primary">
                            {report.a0MeanSupplementedPrerequisites.toFixed(2)}
                          </span>{' '}
                          {copy('bước tiên quyết/hồ sơ).', 'prerequisite steps/profile).')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="font-semibold text-foreground">{copy('S1 · Tĩnh mở rộng tiên quyết trước', 'S1 · Upfront Prerequisite Static')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {copy(
                            'Chèn trước toàn bộ tiên quyết chưa có bằng chứng chính thức ngay từ đầu (kể cả các kỹ năng đã miễn trừ baseline).',
                            'Pre-adds all unachieved prerequisites upfront before any assessment failure occurs (including baseline-exempt skills).',
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="strata-sensitivity">
                <Rq3StrataAndSensitivityTab report={report} isVi={isVi} />
              </TabsContent>

              <TabsContent value="learner-inspector">
                <Rq3LearnerInspectorTab report={report} isVi={isVi} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </WorkspaceLayout>
  )
}
