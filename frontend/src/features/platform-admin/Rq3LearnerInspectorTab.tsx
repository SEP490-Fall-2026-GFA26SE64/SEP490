import * as React from 'react'
import { Search } from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { Progress } from '../../shared/components/ui/Progress'
import {
  filterRq3Profiles,
  type Rq3ExperimentReport,
  type Rq3ProfileFilterOptions,
  type Rq3ProfileSummary,
} from './rq3BenchmarkEngine'

interface Rq3LearnerInspectorTabProps {
  report: Rq3ExperimentReport
  isVi: boolean
}

export function Rq3LearnerInspectorTab({ report, isVi }: Rq3LearnerInspectorTabProps) {
  const copy = (vi: string, en: string) => (isVi ? vi : en)
  const [filters, setFilters] = React.useState<Rq3ProfileFilterOptions>({
    searchQuery: '',
    roleLevel: 'ALL',
    gapBand: 'ALL',
    outcomeFilter: 'ALL',
  })
  const [selectedId, setSelectedId] = React.useState<string>(report.profiles[0]?.profileId ?? '')

  const filteredProfiles = React.useMemo(
    () => filterRq3Profiles(report.profiles, filters),
    [report.profiles, filters],
  )

  const activeProfile: Rq3ProfileSummary | undefined = React.useMemo(() => {
    return (
      filteredProfiles.find((p) => p.profileId === selectedId) ??
      filteredProfiles[0]
    )
  }, [filteredProfiles, selectedId])

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      roleLevel: 'ALL',
      gapBand: 'ALL',
      outcomeFilter: 'ALL',
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{copy('Bộ lọc danh sách 100 hồ sơ thực nghiệm', '100-Profile Cohort Filter')}</CardTitle>
          <CardDescription>
            {copy(
              'Tra cứu quỹ đạo khoảng cách mục tiêu của từng hồ sơ học viên qua 30 lần lặp ở các mốc ngân sách 0, 10, 20, 30 và 40.',
              'Inspect individual learner distance trajectories across 30 replicates at budget checkpoints 0, 10, 20, 30, and 40.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search aria-hidden size={15} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
            <Input
              aria-label={copy('Tìm theo mã hồ sơ', 'Search by profile ID')}
              placeholder={copy('Tìm mã hồ sơ (VD: SYN-...)', 'Search profile ID (e.g. SYN-...)')}
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="pl-9"
            />
          </div>
          <select
            aria-label={copy('Lọc theo cấp độ vai trò', 'Filter by role level')}
            value={filters.roleLevel}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                roleLevel: e.target.value as Rq3ProfileFilterOptions['roleLevel'],
              }))
            }
            className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">{copy('Tất cả cấp độ (100)', 'All role levels (100)')}</option>
            <option value="Junior">Junior (34)</option>
            <option value="Middle">Middle (33)</option>
            <option value="Senior">Senior (33)</option>
          </select>
          <select
            aria-label={copy('Lọc theo mức độ thiếu hụt kỹ năng', 'Filter by gap band')}
            value={filters.gapBand}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                gapBand: e.target.value as Rq3ProfileFilterOptions['gapBand'],
              }))
            }
            className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">{copy('Tất cả nhóm lỗ hổng', 'All gap bands')}</option>
            <option value="LOW">{copy('Thấp · 1–2 kỹ năng (LOW)', 'Low · 1–2 gaps (LOW)')}</option>
            <option value="MEDIUM">{copy('Trung bình · 3–5 kỹ năng (MEDIUM)', 'Medium · 3–5 gaps (MEDIUM)')}</option>
            <option value="HIGH">{copy('Cao · 6–9 kỹ năng (HIGH)', 'High · 6–9 gaps (HIGH)')}</option>
          </select>
          <select
            aria-label={copy('Lọc theo kết quả đối chiếu', 'Filter by comparison outcome')}
            value={filters.outcomeFilter}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                outcomeFilter: e.target.value as Rq3ProfileFilterOptions['outcomeFilter'],
              }))
            }
            className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">{copy('Tất cả kết quả đối chiếu', 'All comparison outcomes')}</option>
            <option value="A0_WIN">{copy(`A0 rút ngắn hơn S0 (${report.a0WinsOverS0})`, `A0 outperforms S0 (${report.a0WinsOverS0})`)}</option>
            <option value="TIE">{copy(`Hòa nhau (${report.a0TiesWithS0})`, `Tied outcome (${report.a0TiesWithS0})`)}</option>
            <option value="A0_LOSS">{copy(`S0 thấp hơn A0 (${report.a0LossesToS0})`, `S0 lower than A0 (${report.a0LossesToS0})`)}</option>
          </select>
        </CardContent>
      </Card>

      {filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-base font-semibold text-foreground">
              {copy('Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại', 'No learner profiles match the selected filters')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy(
                'Hãy xóa từ khóa tìm kiếm hoặc đặt lại bộ lọc để xem toàn bộ 100 hồ sơ thực nghiệm.',
                'Clear your search query or reset filters to browse all 100 cohort profiles.',
              )}
            </p>
            <Button variant="outline" className="mt-4" onClick={resetFilters}>
              {copy('Đặt lại bộ lọc', 'Reset filters')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {copy(`Danh sách hồ sơ (${filteredProfiles.length}/100)`, `Learner Cohort (${filteredProfiles.length}/100)`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
              {filteredProfiles.map((profile) => {
                const isSelected = activeProfile?.profileId === profile.profileId
                return (
                  <button
                    key={profile.profileId}
                    type="button"
                    onClick={() => setSelectedId(profile.profileId)}
                    className={`w-full rounded-lg border p-3 text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-primary bg-secondary/70 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">{profile.profileId}</span>
                      <Badge variant={profile.deltaTargetDistanceA0vsS0 > 0 ? 'success' : 'outline'}>
                        ΔD = {profile.deltaTargetDistanceA0vsS0 >= 0 ? '+' : ''}
                        {profile.deltaTargetDistanceA0vsS0.toFixed(4)}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{profile.roleLevel}</span>
                      <span>•</span>
                      <span>{copy(`Lỗ hổng: ${profile.initialGapCount}`, `Gaps: ${profile.initialGapCount}`)}</span>
                      <span>•</span>
                      <span>
                        {copy(`Tiên quyết thiếu: ${profile.unachievedPrerequisiteCount}`, `Unmet prereqs: ${profile.unachievedPrerequisiteCount}`)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {activeProfile && (
            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="font-mono text-lg">{activeProfile.profileId}</CardTitle>
                    <CardDescription>
                      {activeProfile.roleLevel} · {activeProfile.gapBand} · {activeProfile.evidenceHistoryStratum}
                    </CardDescription>
                  </div>
                  <Badge variant={activeProfile.deltaTargetDistanceA0vsS0 > 0 ? 'success' : 'secondary'}>
                    {activeProfile.deltaTargetDistanceA0vsS0 > 0
                      ? copy('A0 rút ngắn khoảng cách hơn S0', 'A0 achieves shorter distance than S0')
                      : copy('Khoảng cách tương đương', 'Equivalent final distance')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{copy('Tổng yêu cầu Role', 'Target requirements')}</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{activeProfile.targetRequirementCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{copy('Bằng chứng có sẵn', 'Initial official proof')}</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{activeProfile.initialOfficialCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{copy('Nhu cầu học ban đầu', 'Initial learning gaps')}</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{activeProfile.initialGapCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{copy('Bổ sung tiên quyết (A0)', 'A0 prereqs added')}</p>
                    <p className="mt-1 text-lg font-bold text-primary">{activeProfile.a0MeanSupplements.toFixed(2)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5">{copy('Mốc ngân sách', 'Checkpoint')}</th>
                        <th className="px-3 py-2.5">S0 Static D(u,b)</th>
                        <th className="px-3 py-2.5">A0 Adaptive D(u,b)</th>
                        <th className="px-3 py-2.5">S1 Upfront D(u,b)</th>
                        <th className="px-3 py-2.5">ΔD (S0 − A0)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.checkpoints.map((cp) => {
                        const key = String(cp)
                        const s0 = activeProfile.s0TargetTrajectory[key] ?? activeProfile.s0FinalTargetDistance
                        const a0 = activeProfile.a0TargetTrajectory[key] ?? activeProfile.a0FinalTargetDistance
                        const s1 = activeProfile.s1TargetTrajectory[key] ?? activeProfile.s1FinalTargetDistance
                        const diff = s0 - a0
                        return (
                          <tr key={cp} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium">{cp} {copy('đơn vị', 'units')}</td>
                            <td className="px-3 py-2 font-mono">{s0.toFixed(4)}</td>
                            <td className="px-3 py-2 font-mono font-semibold text-primary">{a0.toFixed(4)}</td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">{s1.toFixed(4)}</td>
                            <td className="px-3 py-2 font-mono font-semibold">
                              {diff >= 0 ? '+' : ''}
                              {diff.toFixed(4)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">{copy('Tỷ lệ hoàn tất lộ trình S0', 'S0 pathway release rate')}</span>
                      <span className="font-semibold text-foreground">{(activeProfile.s0ReleaseRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={activeProfile.s0ReleaseRate * 100} className="mt-2" />
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">{copy('Tỷ lệ hoàn tất lộ trình A0', 'A0 pathway release rate')}</span>
                      <span className="font-semibold text-primary">{(activeProfile.a0ReleaseRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={activeProfile.a0ReleaseRate * 100} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
