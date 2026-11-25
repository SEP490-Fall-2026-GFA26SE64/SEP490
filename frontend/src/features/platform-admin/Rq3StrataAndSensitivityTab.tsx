import { Badge } from '../../shared/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { formatSigned } from './rq3BenchmarkEngine'
import type { Rq3ExperimentReport, Rq3StratumSummary } from './rq3BenchmarkEngine'

interface Rq3StrataAndSensitivityTabProps {
  report: Rq3ExperimentReport
  isVi: boolean
}

function StratumTable({
  title,
  description,
  rows,
  isVi,
}: {
  title: string
  description: string
  rows: Rq3StratumSummary[]
  isVi: boolean
}) {
  const copy = (vi: string, en: string) => (isVi ? vi : en)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">{copy('Nhóm phân tầng', 'Stratum')}</th>
                <th className="px-3 py-2.5">{copy('Số hồ sơ', 'Profiles')}</th>
                <th className="px-3 py-2.5">D(0) Baseline</th>
                <th className="px-3 py-2.5">S0 Final D(40)</th>
                <th className="px-3 py-2.5">A0 Final D(40)</th>
                <th className="px-3 py-2.5">S1 Final D(40)</th>
                <th className="px-3 py-2.5">ΔD (S0 − A0)</th>
                <th className="px-3 py-2.5">{copy('Hoàn tất S0 / A0', 'Release S0 / A0')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.stratumKey} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-medium text-foreground">{row.stratumKey}</td>
                  <td className="px-3 py-2.5">{row.profileCount}</td>
                  <td className="px-3 py-2.5 font-mono">{row.baselineTargetDistance.toFixed(4)}</td>
                  <td className="px-3 py-2.5 font-mono">{row.s0FinalTargetDistance.toFixed(4)}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                    {row.a0FinalTargetDistance.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">
                    {row.s1FinalTargetDistance.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{formatSigned(row.deltaTargetDistance)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {(row.s0ReleaseRate * 100).toFixed(1)}% →{' '}
                    <span className="font-semibold text-primary">{(row.a0ReleaseRate * 100).toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function Rq3StrataAndSensitivityTab({ report, isVi }: Rq3StrataAndSensitivityTabProps) {
  const copy = (vi: string, en: string) => (isVi ? vi : en)

  return (
    <div className="space-y-4">
      <StratumTable
        isVi={isVi}
        title={copy(
          'Đối chứng theo Mức độ Thiếu hụt Tiên quyết (Prerequisite Exposure Control)',
          'Prerequisite Exposure Control Stratum',
        )}
        description={copy(
          'Ở 25 hồ sơ đã có sẵn toàn bộ bằng chứng tiên quyết, A0 và S0 cho kết quả trùng khớp tuyệt đối (ΔD = 0.0000). Toàn bộ mức cải thiện của A0 tập trung ở 75 hồ sơ có lỗ hổng tiên quyết thực tế.',
          'Across the 25 profiles where all prerequisites were already officially achieved, A0 and S0 yield identical outcomes (ΔD = 0.0000). All adaptive gains arise from the 75 profiles with genuine prerequisite gaps.',
        )}
        rows={report.byPrerequisiteExposure}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <StratumTable
          isVi={isVi}
          title={copy('Phân tầng theo Cấp độ Vai trò (Role Level)', 'Breakdown by Target Role Level')}
          description={copy(
            'So sánh 34 hồ sơ Junior, 33 hồ sơ Middle và 33 hồ sơ Senior.',
            'Comparison across 34 Junior, 33 Middle, and 33 Senior Application Developer profiles.',
          )}
          rows={report.byRoleLevel}
        />
        <StratumTable
          isVi={isVi}
          title={copy('Phân tầng theo Nhóm Lỗ hổng (Initial Gap Band)', 'Breakdown by Initial Gap Band')}
          description={copy(
            'LOW (1–2 nhu cầu học), MEDIUM (3–5 nhu cầu học) và HIGH (6–9 nhu cầu học).',
            'LOW (1–2 learning needs), MEDIUM (3–5 learning needs), and HIGH (6–9 learning needs).',
          )}
          rows={report.byGapBand}
        />
      </div>

      <StratumTable
        isVi={isVi}
        title={copy('Phân tầng theo Lịch sử Bằng chứng (Evidence History Stratum)', 'Breakdown by Prior Evidence History')}
        description={copy(
          'BASELINE_ONLY (0% bằng chứng chính thức ban đầu), MIXED (~35% ngoài lỗ hổng) và OFFICIAL_RICH (~70% ngoài lỗ hổng).',
          'BASELINE_ONLY (0% prior official evidence), MIXED (~35% of non-gap skills), and OFFICIAL_RICH (~70% of non-gap skills).',
        )}
        rows={report.byEvidenceHistory}
      />

      <Card data-testid="rq3-secondary-outcomes">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {copy('Kết quả phụ, có cắt phải (right-censoring) tại ngân sách B', 'Secondary outcomes with right-censoring at budget B')}
          </CardTitle>
          <CardDescription>
            {copy(
              `Tính trên ${report.secondaryOutcomes[0]?.runs ?? 0} lượt (hồ sơ × lần lặp) mỗi chính sách. Chi phí trung bình có giới hạn tính B = ${report.budget} cho lượt chưa đóng lỗ hổng; chi phí trong nhóm đạt chỉ mang tính mô tả.`,
              `Over ${report.secondaryOutcomes[0]?.runs ?? 0} learner × replicate runs per policy. Restricted mean cost charges B = ${report.budget} to runs that never closed the gap; the attainer-only mean is descriptive.`,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">{copy('Chính sách', 'Policy')}</th>
                  <th className="px-3 py-2.5">{copy('Tỷ lệ D = 0', 'D = 0 rate')}</th>
                  <th className="px-3 py-2.5">{copy('Đóng lỗ hổng / bị cắt', 'Gap closed / censored')}</th>
                  <th className="px-3 py-2.5">{copy('Chi phí có giới hạn', 'Restricted mean cost')}</th>
                  <th className="px-3 py-2.5">{copy('Chi phí (nhóm đạt)', 'Cost (attainers)')}</th>
                  <th className="px-3 py-2.5">{copy('Học / Đánh giá / Làm lại', 'Learn / Assess / Retake')}</th>
                  <th className="px-3 py-2.5">{copy('Yêu cầu bổ sung / Module', 'Remedial reqs / Modules')}</th>
                  <th className="px-3 py-2.5">{copy('Lý do dừng', 'Stop reasons')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.secondaryOutcomes.map((row) => (
                  <tr key={row.policy} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.policy}</td>
                    <td className="px-3 py-2.5 font-mono">{(row.proportionTargetDistanceZero * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2.5 font-mono">
                      {row.gapClosedCount} / {row.gapCensoredCount}
                    </td>
                    <td className="px-3 py-2.5 font-mono">{row.restrictedMeanCostToGapClosure.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      {row.meanCostAmongGapAttainers === null ? '—' : row.meanCostAmongGapAttainers.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {row.meanLearningActions.toFixed(1)} / {row.meanAssessmentAttempts.toFixed(1)} / {row.meanRetakes.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {row.meanDistinctRemedialRequirements.toFixed(2)} / {row.meanDistinctAssignedModules.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {Object.entries(row.stopReasons).map(([reason, count]) => (
                        <div key={reason}>
                          {reason}: <span className="font-mono">{count}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {report.pairedCompleteCaseCost.map((row) => (
              <li key={row.comparison}>
                {copy(
                  `${row.comparison}: ${row.pairs}/${row.totalPairs} cặp cùng đóng lỗ hổng, chi phí ${row.meanCostFirst.toFixed(2)} vs ${row.meanCostSecond.toFixed(2)}.`,
                  `${row.comparison}: ${row.pairs}/${row.totalPairs} pairs both closed the gap, cost ${row.meanCostFirst.toFixed(2)} vs ${row.meanCostSecond.toFixed(2)}.`,
                )}
              </li>
            ))}
            <li>
              {copy('ΔD(B) A0 so với S1 (S1 − A0): ', 'ΔD(B) A0 vs S1 (S1 − A0): ')}
              <span className="font-mono font-semibold text-foreground">
                {formatSigned(report.deltaTargetDistanceA0vsS1.mean)}
              </span>{' '}
              (95% CI [{formatSigned(report.deltaTargetDistanceA0vsS1.ci95Low)}, {formatSigned(report.deltaTargetDistanceA0vsS1.ci95High)}])
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {copy('Phân tích Độ nhạy Tham số Mô phỏng (Sensitivity Analysis Grid)', 'Simulator Parameter Sensitivity Grid')}
              </CardTitle>
              <CardDescription>
                {copy(
                  'Thay đổi tốc độ tiếp thu η, hệ số phụ thuộc tiên quyết λ, chi phí đánh giá (0.5/1/2), ngân sách B (20/40/80) và đối chứng kiến thức ban đầu bằng nhau. D(B) là khoảng cách tại ngân sách của từng cấu hình.',
                  'Varies learning rate η, prerequisite item coupling λ, assessment cost (0.5/1/2), horizon B (20/40/80) and an equal-initial-knowledge control. D(B) is the distance at each configuration’s own budget.',
                )}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {copy(
                `${report.sensitivityGrid.length} cấu hình × ${report.replicates} lần lặp`,
                `${report.sensitivityGrid.length} configurations × ${report.replicates} replicates`,
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full whitespace-nowrap text-left text-sm" data-testid="rq3-sensitivity-table">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">{copy('Cấu hình độ nhạy', 'Sensitivity setting')}</th>
                  <th className="px-3 py-2.5">η</th>
                  <th className="px-3 py-2.5">λ</th>
                  <th className="px-3 py-2.5">{copy('Chi phí ĐG', 'Assess. cost')}</th>
                  <th className="px-3 py-2.5">B</th>
                  <th className="px-3 py-2.5">S0 D(B)</th>
                  <th className="px-3 py-2.5">A0 D(B)</th>
                  <th className="px-3 py-2.5">S1 D(B)</th>
                  <th className="px-3 py-2.5">ΔD (S0 − A0) [95% CI]</th>
                  <th className="px-3 py-2.5">ΔD (S1 − A0)</th>
                  <th className="px-3 py-2.5">ΔD_gap (S0 − A0)</th>
                  <th className="px-3 py-2.5">{copy('Hoàn tất S0 / A0 / S1', 'Release S0 / A0 / S1')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.sensitivityGrid.map((row) => (
                  <tr key={row.label} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                    <td className="px-3 py-2.5 font-mono">{row.eta.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">{row.lambda.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">{row.assessmentCost}</td>
                    <td className="px-3 py-2.5 font-mono">{row.budget}</td>
                    <td className="px-3 py-2.5 font-mono">{row.s0FinalTargetDistance.toFixed(4)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                      {row.a0FinalTargetDistance.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      {row.s1FinalTargetDistance.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {formatSigned(row.deltaTargetDistanceA0vsS0)}{' '}
                      <span className="font-normal text-muted-foreground">
                        [{formatSigned(row.deltaTargetCi95Low)}, {formatSigned(row.deltaTargetCi95High)}]
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{formatSigned(row.deltaTargetDistanceA0vsS1)}</td>
                    <td className="px-3 py-2.5 font-mono">{formatSigned(row.deltaGapDistanceA0vsS0)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {(row.s0ReleaseRate * 100).toFixed(1)}% /{' '}
                      <span className="font-semibold text-primary">{(row.a0ReleaseRate * 100).toFixed(1)}%</span> /{' '}
                      {(row.s1ReleaseRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
