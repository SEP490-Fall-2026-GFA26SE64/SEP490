import { CheckCircle2, Lock, Trophy, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Progress } from '../../shared/components/ui/Progress'
import type { Rq1FullEvaluationSummary } from './rq1BenchmarkEngine'

interface Rq1ComparisonOverviewTabProps {
  summary: Rq1FullEvaluationSummary | null
  onTriggerStep2Upload: () => void
  onSelectProfileToInspect: (profileId: string) => void
  isVi: boolean
}

function fmtPct(val: number): string {
  return `${(val * 100).toFixed(1)}%`
}

export function Rq1ComparisonOverviewTab({
  summary,
  onTriggerStep2Upload,
  onSelectProfileToInspect,
  isVi,
}: Rq1ComparisonOverviewTabProps) {
  if (!summary) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 px-6 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary text-primary flex items-center justify-center mx-auto">
            <Lock size={22} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">
              {isVi
                ? 'Chưa nạp Phiếu Đánh Giá Module của Chuyên Gia (Bước 2)'
                : 'Expert Golden Set Evaluation File Not Uploaded Yet (Step 2)'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isVi
                ? 'Theo đúng quy tắc độc lập dữ liệu của RQ1, hệ thống đã hoàn tất Bước 1 (sinh kỹ năng cần học và lộ trình module cho 50 hồ sơ). Vui lòng tải lên file Phiếu chấm Module của Chuyên gia (.xlsx hoặc .jsonl) ở Bước 2 phía trên để mở khóa bảng tính điểm Hit Rate@5, Precision@5, Recall@5 và nDCG@5.'
                : 'Following RQ1 evaluation protocol, Step 1 has generated learning needs and module recommendations for all profiles. Upload the Expert Evaluation file (.xlsx or .jsonl) in Step 2 above to compute Hit Rate@5, Precision@5, Recall@5, and nDCG@5.'}
            </p>
          </div>
          <div>
            <Button variant="primary" onClick={onTriggerStep2Upload}>
              <Upload size={15} className="mr-2" />
              {isVi
                ? 'Tải lên Phiếu Đánh Giá Chuyên Gia (Bước 2)'
                : 'Upload Expert Evaluation File (Step 2)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const metricBars = [
    {
      label: 'Hit Rate@5 (HR@5 — Primary Metric)',
      g0: summary.g0MeanHitRateAt5,
      c0: summary.c0MeanHitRateAt5,
      delta: summary.deltaHitRateAt5,
      desc: isVi
        ? 'Tỷ lệ hồ sơ có ít nhất 1 học phần trong Top-5 đạt chuẩn Grade 2 của Chuyên gia'
        : 'Fraction of profiles with at least 1 expert Grade-2 module in Top-5',
    },
    {
      label: 'Precision@5',
      g0: summary.g0MeanPrecisionAt5,
      c0: summary.c0MeanPrecisionAt5,
      delta: summary.deltaPrecisionAt5,
      desc: isVi
        ? 'Tỷ lệ học phần thuộc nhóm Grade 2 trên 5 vị trí đầu tiên được gợi ý'
        : 'Proportion of Top-5 recommended slots matching expert Grade-2 modules',
    },
    {
      label: 'Recall@5',
      g0: summary.g0MeanRecallAt5,
      c0: summary.c0MeanRecallAt5,
      delta: summary.deltaRecallAt5,
      desc: isVi
        ? 'Tỷ lệ bao phủ số học phần Grade 2 của chuyên gia trong Top-5'
        : 'Coverage of all expert Grade-2 modules within the Top-5 recommendations',
    },
    {
      label: 'Graded nDCG@5 (Linear Gain)',
      g0: summary.g0MeanNdcgAt5,
      c0: summary.c0MeanNdcgAt5,
      delta: summary.deltaNdcgAt5,
      desc: isVi
        ? 'Chất lượng thứ tự xếp hạng từ Top 1 đến Top 5 (tính điểm cả Grade 2 và Grade 1)'
        : 'Ranking quality from position 1 to 5 accounting for Grade 2 and Grade 1 gains',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Visual Metric Comparison Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy size={17} className="text-primary" />
                <span>
                  {isVi
                    ? `Kết Quả Thực Nghiệm RQ1 Trên ${summary.evaluatedProfileCount} Hồ Sơ Golden Set: Graph-Traversal (G0) vs Content-Based Filtering (C0)`
                    : `RQ1 Benchmark Results Across ${summary.evaluatedProfileCount} Golden Set Profiles: Graph-Traversal (G0) vs Content-Based Filtering (C0)`}
                </span>
              </CardTitle>
              <CardDescription className="mt-1">
                {isVi
                  ? `Đối chiếu trực tiếp với nhãn của Chuyên gia • Graph thắng: ${summary.graphWins}/${summary.evaluatedProfileCount} hồ sơ • Hòa: ${summary.ties} • CBF thắng: ${summary.cbfWins}`
                  : `Evaluated against Expert Golden Set annotations • Graph Wins: ${summary.graphWins}/${summary.evaluatedProfileCount} • Ties: ${summary.ties} • CBF Wins: ${summary.cbfWins}`}
              </CardDescription>
            </div>
            <Badge variant="success" className="py-1 px-2.5">
              <CheckCircle2 size={13} className="mr-1.5" />
              {isVi
                ? `Chênh lệch Graph − CBF: ${(summary.deltaNdcgAt5 * 100).toFixed(1)} điểm % nDCG@5`
                : `Graph − CBF: ${(summary.deltaNdcgAt5 * 100).toFixed(1)} percentage points nDCG@5`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
            {metricBars.map((m) => (
              <div key={m.label} className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{m.label}</span>
                  <Badge variant="primary" className="text-[11px]">
                    +{ (m.delta * 100).toFixed(1) }%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{m.desc}</p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Graph-Traversal (G0)
                    </span>
                    <span className="font-mono font-bold text-success">{fmtPct(m.g0)}</span>
                  </div>
                  <Progress value={Math.round(m.g0 * 100)} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      Content-Based Filtering (C0 TF-IDF)
                    </span>
                    <span className="font-mono font-semibold text-muted-foreground">{fmtPct(m.c0)}</span>
                  </div>
                  <Progress value={Math.round(m.c0 * 100)} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stratum Breakdown Tables: By Role Level & By Gap Band */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isVi
                ? 'Phân Tích Theo Cấp Độ Vai Trò (Junior / Middle / Senior)'
                : 'Breakdown by Target Role Level (Junior / Middle / Senior)'}
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-y border-border text-muted-foreground uppercase">
                  <th className="py-2.5 px-3 font-semibold">{isVi ? 'Cấp độ' : 'Role Level'}</th>
                  <th className="py-2.5 px-2 font-semibold text-center">{isVi ? 'Số HS' : 'Count'}</th>
                  <th className="py-2.5 px-2 font-semibold text-center">HR@5 (G0 / C0)</th>
                  <th className="py-2.5 px-2 font-semibold text-center">Prec@5 (G0 / C0)</th>
                  <th className="py-2.5 px-2 font-semibold text-center">nDCG@5 (G0 / C0)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Win / Tie / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.byRoleLevel.map((row) => (
                  <tr key={row.stratumKey} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{row.stratumLabel}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{row.profileCount}</td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-success">{fmtPct(row.g0HitRateAt5)}</span> /{' '}
                      <span className="text-muted-foreground">{fmtPct(row.c0HitRateAt5)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-success">{fmtPct(row.g0PrecisionAt5)}</span> /{' '}
                      <span className="text-muted-foreground">{fmtPct(row.c0PrecisionAt5)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-success">{fmtPct(row.g0NdcgAt5)}</span> /{' '}
                      <span className="text-muted-foreground">{fmtPct(row.c0NdcgAt5)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {row.graphWins}W - {row.ties}T - {row.cbfWins}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isVi
                ? 'Phân Tích Theo Mức Độ Thiếu Hụt Kỹ Năng (LOW / MEDIUM / HIGH)'
                : 'Breakdown by Skill Gap Band (LOW / MEDIUM / HIGH)'}
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-y border-border text-muted-foreground uppercase">
                  <th className="py-2.5 px-3 font-semibold">{isVi ? 'Mức Lỗ Hổng' : 'Gap Band'}</th>
                  <th className="py-2.5 px-2 font-semibold text-center">{isVi ? 'Số HS' : 'Count'}</th>
                  <th className="py-2.5 px-2 font-semibold text-center">HR@5 (G0 / C0)</th>
                  <th className="py-2.5 px-2 font-semibold text-center">Prec@5 (G0 / C0)</th>
                  <th className="py-2.5 px-2 font-semibold text-center">nDCG@5 (G0 / C0)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Win / Tie / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.byGapBand.map((row) => (
                  <tr key={row.stratumKey} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{row.stratumLabel}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{row.profileCount}</td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-success">{fmtPct(row.g0HitRateAt5)}</span> /{' '}
                      <span className="text-muted-foreground">{fmtPct(row.c0HitRateAt5)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-success">{fmtPct(row.g0PrecisionAt5)}</span> /{' '}
                      <span className="text-muted-foreground">{fmtPct(row.c0PrecisionAt5)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      <span className="font-bold text-success">{fmtPct(row.g0NdcgAt5)}</span> /{' '}
                      <span className="text-muted-foreground">{fmtPct(row.c0NdcgAt5)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {row.graphWins}W - {row.ties}T - {row.cbfWins}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Full 50 Golden Set Comparison Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {isVi
              ? `Bảng Đối Chiếu Chi Tiết Từng Hồ Sơ Trong ${summary.evaluatedProfileCount} Golden Set (Click vào hồ sơ để xem lộ trình chi tiết)`
              : `Detailed Per-Profile Comparison Across ${summary.evaluatedProfileCount} Golden Set Profiles (Click any row to inspect pathway)`}
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto max-h-[540px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-muted border-y border-border text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Profile ID</th>
                <th className="py-2.5 px-2 font-semibold">{isVi ? 'Cấp độ' : 'Level'}</th>
                <th className="py-2.5 px-2 font-semibold text-center">{isVi ? 'Số Lỗ hổng' : 'Gaps'}</th>
                <th className="py-2.5 px-3 font-semibold">
                  {isVi ? 'Kỹ năng cần học' : 'Skills to Learn'}
                </th>
                <th className="py-2.5 px-2 font-semibold text-center">G0 Hit@5</th>
                <th className="py-2.5 px-2 font-semibold text-center">C0 Hit@5</th>
                <th className="py-2.5 px-2 font-semibold text-center">G0 Prec@5</th>
                <th className="py-2.5 px-2 font-semibold text-center">C0 Prec@5</th>
                <th className="py-2.5 px-2 font-semibold text-center">G0 nDCG@5</th>
                <th className="py-2.5 px-2 font-semibold text-center">C0 nDCG@5</th>
                <th className="py-2.5 px-3 font-semibold text-center">{isVi ? 'Kết quả' : 'Outcome'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.profileComparisons.map((item, idx) => (
                <tr
                  key={item.profile.profileId}
                  onClick={() => onSelectProfileToInspect(item.profile.profileId)}
                  className="hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-primary">
                    {item.profile.profileId}
                  </td>
                  <td className="py-2.5 px-2">{item.profile.roleLevel}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-semibold">
                    {item.profile.gapCount} ({item.profile.gapBand})
                  </td>
                  <td className="py-2.5 px-3 max-w-xs truncate font-mono text-[11px]">
                    {item.profile.pathwaySteps
                      .map((s) => `${s.skillId}(${s.knowledgeLevel[0]})`)
                      .join(', ')}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-success">
                    {fmtPct(item.g0Metrics.hitAt5)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-muted-foreground">
                    {fmtPct(item.c0Metrics.hitAt5)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-success">
                    {fmtPct(item.g0Metrics.precisionAt5)} ({item.g0Metrics.grade2HitsInTop5}/5)
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-muted-foreground">
                    {fmtPct(item.c0Metrics.precisionAt5)} ({item.c0Metrics.grade2HitsInTop5}/5)
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-success">
                    {fmtPct(item.g0Metrics.ndcgAt5)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-muted-foreground">
                    {fmtPct(item.c0Metrics.ndcgAt5)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge
                      variant={
                        item.outcome === 'GRAPH_WIN'
                          ? 'success'
                          : item.outcome === 'TIE'
                            ? 'secondary'
                            : 'warning'
                      }
                      className="text-[10px]"
                    >
                      {item.outcome === 'GRAPH_WIN'
                        ? isVi
                          ? 'Graph Thắng'
                          : 'Graph Win'
                        : item.outcome === 'TIE'
                          ? isVi
                            ? 'Hòa'
                            : 'Tie'
                          : isVi
                            ? 'CBF Thắng'
                            : 'CBF Win'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
