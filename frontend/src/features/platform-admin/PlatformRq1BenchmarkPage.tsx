import { readTop5Reference } from './rq1Top5Reference'
import * as React from 'react'
import {
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  GitFork,
  Lock,
  Network,
  RotateCcw,
  Target,
  Trophy,
  Upload,
} from 'lucide-react'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { StatCard } from '../../shared/components/ui/StatCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/Tabs'
import { PageLoader } from '../../shared/components/ui/PageLoader'
import { useTranslation } from '../../shared/i18n/LanguageContext'
import { useToast } from '../../shared/hooks/useToast'
import {
  exportRq1EvaluationToExcel,
  exportRq1ExpertTemplate,
  fetchBuiltInRq1Catalog,
  parseExpertEvaluationsFromExcelBuffer,
  parseExpertEvaluationsFromText,
  parseProfilesFromExcelBuffer,
  parseProfilesFromText,
  runStep1PathwayAndRanking,
  runStep2ExpertComparison,
  type Rq1CatalogStore,
  type Rq1FullEvaluationSummary,
  type Rq1ProfileComparisonResult,
  type Rq1ProfilePathwayResult,
} from './rq1BenchmarkEngine'
import { Rq1CatalogRepositoryTab } from './Rq1CatalogRepositoryTab'
import { Rq1ProfilePathwayInspector } from './Rq1ProfilePathwayInspector'
import { Rq1ComparisonOverviewTab } from './Rq1ComparisonOverviewTab'

export function PlatformRq1BenchmarkPage() {
  const { language } = useTranslation()
  const isVi = language === 'vi'
  const { toast } = useToast()

  const [catalog, setCatalog] = React.useState<Rq1CatalogStore | null>(null)
  const [loadingCatalog, setLoadingCatalog] = React.useState(true)
  const [catalogError, setCatalogError] = React.useState<string | null>(null)

  const [step1FileName, setStep1FileName] = React.useState<string | null>(null)
  const [pathwayResults, setPathwayResults] = React.useState<Rq1ProfilePathwayResult[]>([])
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>('')

  const [step2FileName, setStep2FileName] = React.useState<string | null>(null)
  const [top5Reference, setTop5Reference] = React.useState<Awaited<ReturnType<typeof readTop5Reference>>>(null)
  const [evaluationSummary, setEvaluationSummary] = React.useState<Rq1FullEvaluationSummary | null>(null)

  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const uploadRevision = React.useRef(0)

  const [activeTab, setActiveTab] = React.useState<string>('pathway-inspector')

  const step1InputRef = React.useRef<HTMLInputElement>(null)
  const step2InputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let mounted = true
    fetchBuiltInRq1Catalog()
      .then((data) => {
        if (!mounted) return
        setCatalog(data)
        setLoadingCatalog(false)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setCatalogError(err instanceof Error ? err.message : 'Failed to load RQ1 catalog')
        setLoadingCatalog(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const comparisonsByProfileId = React.useMemo(() => {
    const map = new Map<string, Rq1ProfileComparisonResult>()
    if (evaluationSummary) {
      for (const item of evaluationSummary.profileComparisons) {
        map.set(item.profile.profileId, item)
      }
    }
    return map
  }, [evaluationSummary])

  const handleStep1FileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !catalog) return
    const revision = ++uploadRevision.current
    setUploadError(null)
    setPathwayResults([])
    setEvaluationSummary(null)
    setTop5Reference(null)
    setStep1FileName(null)
    setStep2FileName(null)
    setSelectedProfileId('')

    try {
      const lower = file.name.toLowerCase()
      const parsedProfiles =
        lower.endsWith('.xlsx') || lower.endsWith('.xls')
          ? parseProfilesFromExcelBuffer(await file.arrayBuffer(), catalog)
          : parseProfilesFromText(await file.text(), catalog)

      if (revision !== uploadRevision.current) return
      const generated = runStep1PathwayAndRanking(parsedProfiles, catalog)
      setPathwayResults(generated)
      setStep1FileName(file.name)
      setSelectedProfileId(generated[0]?.profileId ?? '')
      // Reset step 2 when a new profile set is uploaded
      setEvaluationSummary(null)
      setTop5Reference(null)
      setStep2FileName(null)
      setActiveTab('pathway-inspector')

      toast({
        title: isVi
          ? `Đã nạp ${generated.length} hồ sơ & sinh lộ trình học tập`
          : `Loaded ${generated.length} profiles & generated learning pathways`,
        description: isVi
          ? `Tệp "${file.name}" đã được phân tích kết quả Baseline, suy ra kỹ năng cần học và gợi ý Module cho Graph-Traversal (G0) & Content-Based Filtering (C0).`
          : `Analyzed baseline outcomes from "${file.name}" and generated skill gaps & module recommendations for G0 and C0.`,
        variant: 'success',
      })
    } catch (err: unknown) {
      if (revision !== uploadRevision.current) return
      setUploadError(err instanceof Error ? err.message : 'Không thể đọc file đầu vào.')
      toast({
        title: isVi ? 'Không thể đọc file Hồ sơ Bước 1' : 'Failed to parse Step-1 Profile file',
        description:
          err instanceof Error
            ? err.message
            : isVi
              ? 'Vui lòng kiểm tra định dạng file Excel (.xlsx) hoặc JSON/JSONL.'
              : 'Please verify the uploaded Excel (.xlsx) or JSON/JSONL file format.',
        variant: 'destructive',
      })
    } finally {
      event.target.value = ''
    }
  }

  const handleStep2FileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !catalog) return

    if (pathwayResults.length === 0) {
      toast({
        title: isVi ? 'Cần thực hiện Bước 1 trước' : 'Complete Step 1 first',
        description: isVi
          ? 'Vui lòng tải lên file 50 Hồ sơ kết quả Baseline ở Bước 1 trước khi tải lên phiếu chấm của Chuyên gia.'
          : 'Please upload the 50 Baseline Profiles file in Step 1 before uploading the Expert Evaluation file.',
        variant: 'destructive',
      })
      event.target.value = ''
      return
    }

    const revision = ++uploadRevision.current
    setUploadError(null)
    setEvaluationSummary(null)
    setTop5Reference(null)
    setStep2FileName(null)
    try {
      const lower = file.name.toLowerCase()
      const excel = lower.endsWith('.xlsx') || lower.endsWith('.xls')
      const bytes = excel ? await file.arrayBuffer() : null
      if (bytes) {
        const reference = await readTop5Reference(bytes, pathwayResults, catalog)
        if (revision !== uploadRevision.current) return
        if (reference) {
          setActiveTab('pathway-inspector')
          setTop5Reference(reference)
          setStep2FileName(file.name)
          return
        }
      }
      const expertMap = bytes
        ? parseExpertEvaluationsFromExcelBuffer(bytes, catalog)
        : parseExpertEvaluationsFromText(await file.text(), catalog)

      if (revision !== uploadRevision.current) return
      const summary = runStep2ExpertComparison(pathwayResults, expertMap)
      setEvaluationSummary(summary)
      setStep2FileName(file.name)

      toast({
        title: summary.isDemo ? (isVi ? 'Đã tính điểm demo' : 'Demo scores calculated') : isVi
          ? `Đã đối chiếu ${summary.evaluatedProfileCount} hồ sơ với Phiếu Chuyên Gia`
          : `Compared ${summary.evaluatedProfileCount} profiles against Expert Evaluations`,
        description: isVi
          ? `Hit Rate@5: Graph đạt ${(summary.g0MeanHitRateAt5 * 100).toFixed(1)}% vs CBF đạt ${(summary.c0MeanHitRateAt5 * 100).toFixed(1)}% (nDCG@5: ${(summary.g0MeanNdcgAt5 * 100).toFixed(1)}% vs ${(summary.c0MeanNdcgAt5 * 100).toFixed(1)}%).`
          : `Hit Rate@5: Graph ${(summary.g0MeanHitRateAt5 * 100).toFixed(1)}% vs CBF ${(summary.c0MeanHitRateAt5 * 100).toFixed(1)}%.`,
        variant: 'success',
      })
    } catch (err: unknown) {
      if (revision !== uploadRevision.current) return
      setUploadError(err instanceof Error ? err.message : 'Không thể đọc file đầu vào.')
      toast({
        title: isVi ? 'Không thể đọc Phiếu đánh giá Chuyên gia' : 'Failed to parse Expert Evaluation file',
        description:
          err instanceof Error
            ? err.message
            : isVi
              ? 'Vui lòng kiểm tra file phiếu chấm chuyên gia (.xlsx hoặc .jsonl).'
              : 'Please verify the Expert Evaluation file (.xlsx or .jsonl).',
        variant: 'destructive',
      })
    } finally {
      event.target.value = ''
    }
  }

  const handleReset = () => {
    uploadRevision.current++
    setUploadError(null)
    setPathwayResults([])
    setStep1FileName(null)
    setEvaluationSummary(null)
    setTop5Reference(null)
    setStep2FileName(null)
    setSelectedProfileId('')
  }

  if (loadingCatalog) {
    return (
      <WorkspaceLayout>
        <PageLoader />
      </WorkspaceLayout>
    )
  }

  if (catalogError || !catalog) {
    return (
      <WorkspaceLayout>
        <div className="p-6">
          <Card className="bg-card border-destructive/40">
            <CardContent className="p-6 text-sm text-destructive">
              {catalogError ?? 'Catalog load error'}
            </CardContent>
          </Card>
        </div>
      </WorkspaceLayout>
    )
  }

  const totalGapsAcrossProfiles = pathwayResults.reduce((acc, p) => acc + p.needsLearningCount, 0)

  return (
    <WorkspaceLayout>
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5">
        <PageHeader
          forceShowTitle
          icon={<Target size={24} />}
          title={
            isVi
              ? 'Thực Nghiệm RQ1: Đánh Giá Độ Phù Hợp Gợi Ý Lộ Trình Học Tập (Graph-Traversal vs Content-Based Filtering)'
              : 'RQ1 Benchmark: Learning Pathway Recommendation Relevance (Graph-Traversal vs Content-Based Filtering)'
          }
          description={
            isVi
              ? 'Hệ thống lưu trữ sẵn kho 20 Kỹ năng & 72 Học phần (Application Developer). Nộp file 50 hồ sơ có kết quả Baseline (Bước 1) để sinh lộ trình kỹ năng cần học và học phần gợi ý, sau đó nộp Phiếu đánh giá của Chuyên gia (Bước 2) để đối chiếu Hit Rate@5.'
              : 'Built-in repository of 20 Micro-Skills & 72 Learning Modules. Upload the 50 Baseline Profiles file (Step 1) to derive skill gaps and module pathways, then upload the Expert Evaluation file (Step 2) to score Hit Rate@5.'
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {pathwayResults.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={evaluationSummary?.isDemo || !!top5Reference}
                    onClick={() => exportRq1EvaluationToExcel(pathwayResults, evaluationSummary)}
                  >
                    <Download size={14} className="mr-1.5" />
                    {isVi ? 'Xuất kết quả Excel' : 'Export Results (.xlsx)'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw size={14} className="mr-1.5" />
                    {isVi ? 'Làm mới' : 'Reset'}
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Hidden File Inputs */}
        <input
          ref={step1InputRef}
          type="file"
          accept=".xlsx,.xls,.json,.jsonl"
          data-testid="rq1-step1-file-input"
          className="hidden"
          onChange={handleStep1FileUpload}
        />
        <input
          ref={step2InputRef}
          type="file"
          accept=".xlsx,.xls,.json,.jsonl"
          data-testid="rq1-step2-file-input"
          className="hidden"
          onChange={handleStep2FileUpload}
        />

        {/* Two-Step Upload Workflow Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Step 1 Card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </span>
                  <CardTitle className="text-sm font-bold">
                    {isVi
                      ? 'Bước 1: Nộp File 50 Hồ Sơ Kết Quả Baseline (Excel / JSONL)'
                      : 'Step 1: Upload 50 Baseline Learner Profiles (Excel / JSONL)'}
                  </CardTitle>
                </div>
                {step1FileName ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>{pathwayResults.length} Profiles</span>
                  </Badge>
                ) : (
                  <Badge variant="outline">{isVi ? 'Chưa nạp file' : 'Awaiting Upload'}</Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1">
                {isVi
                  ? 'Đọc kết quả thi Baseline (PASSED / FAILED) và thành tích có sẵn trong từng hồ sơ để xác định Kỹ năng cần học và sinh Lộ trình Học phần cho cả Graph-Traversal (G0) và Content-Based Filtering (C0).'
                  : 'Reads pre-recorded baseline test outcomes and prior achievements to derive skills to learn and generate module pathways for Graph-Traversal (G0) and Content-Based Filtering (C0).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="rq1-step1-upload-btn"
                  className="max-w-full whitespace-normal h-auto min-h-9 py-2 text-left"
                  onClick={() => step1InputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  {step1FileName
                    ? isVi
                      ? 'Chọn lại File 50 Hồ sơ'
                      : 'Re-upload 50 Profiles File'
                    : isVi
                      ? 'Upload File 50 Hồ sơ (.xlsx / .jsonl)'
                      : 'Upload 50 Profiles (.xlsx / .jsonl)'}
                </Button>
                <a
                  href="/fixtures/rq1-samples/RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx"
                  download="RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx"
                  className="inline-flex items-center text-xs font-medium text-primary hover:underline px-2 py-1"
                >
                  <FileSpreadsheet size={13} className="mr-1" />
                  {isVi ? 'Tải file Excel mẫu Bước 1' : 'Download Step-1 Sample Excel'}
                </a>
              </div>
              {step1FileName && (
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[220px]" title={step1FileName}>
                  {step1FileName}
                </span>
              )}
            </CardContent>
          </Card>

          {/* Step 2 Card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </span>
                  <CardTitle className="text-sm font-bold">
                    {isVi
                      ? 'Bước 2: Nộp danh sách Golden Set'
                      : 'Step 2: Upload the Golden Set'}
                  </CardTitle>
                </div>
                {top5Reference ? (
                  <Badge variant="success">{isVi ? `Đã đối chiếu ${top5Reference.profiles} hồ sơ` : `${top5Reference.profiles} profiles compared`}</Badge>
                ) : evaluationSummary ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>
                      {isVi
                        ? `Đã chấm ${evaluationSummary.evaluatedProfileCount} hồ sơ`
                        : `Scored ${evaluationSummary.evaluatedProfileCount} profiles`}
                    </span>
                  </Badge>
                ) : (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <Lock size={11} />
                    <span>{isVi ? 'Chờ nộp phiếu chuyên gia' : 'Awaiting Expert File'}</span>
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1">
                {isVi
                  ? 'Nộp file đồng thuận có sheet Golden Set 50 để so Top 5. Phiếu chấm đầy đủ Grade 0/1/2 vẫn được hỗ trợ để tính các chỉ số độ phù hợp.'
                  : 'Upload the Golden Set 50 consensus sheet for Top-5 overlap. Full Grade 0/1/2 annotations remain supported for relevance metrics.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={pathwayResults.length > 0 ? 'primary' : 'outline'}
                  size="sm"
                  disabled={pathwayResults.length === 0}
                  data-testid="rq1-step2-upload-btn"
                  className="max-w-full whitespace-normal h-auto min-h-9 py-2 text-left"
                  onClick={() => step2InputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  {step2FileName
                    ? isVi
                      ? 'Chọn lại Phiếu Chuyên gia'
                      : 'Re-upload Expert File'
                    : isVi
                      ? 'Upload Phiếu Chuyên gia (.xlsx / .jsonl)'
                      : 'Upload Expert Evaluation (.xlsx / .jsonl)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pathwayResults.length === 0}
                  data-testid="rq1-step2-template-btn"
                  className="max-w-full whitespace-normal h-auto min-h-9 py-2 text-left"
                  onClick={() => exportRq1ExpertTemplate(pathwayResults, catalog)}
                >
                  <FileSpreadsheet size={13} className="mr-1" />
                  {isVi ? 'Tải mẫu chuyên gia trống từ Bước 1' : 'Download blank expert template from Step 1'}
                </Button>
              </div>
              {(top5Reference || evaluationSummary) && (
                <Button variant="outline" size="sm" onClick={() => {
                  setActiveTab('expert-comparison')
                  document.getElementById('rq1-comparison-tab')?.focus()
                }}>
                  <Trophy size={14} className="mr-1.5" />
                  {isVi ? 'Xem kết quả so sánh' : 'View comparison'}
                </Button>
              )}
              {step2FileName && (
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[220px]" title={step2FileName}>
                  {step2FileName}
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        {evaluationSummary?.isDemo && (
          <div role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            {isVi ? 'Kết quả demo từ nhãn mô phỏng. Chỉ dùng để kiểm tra luồng RQ1.' : 'Simulated demo labels. Results are for RQ1 workflow testing only.'}
          </div>
        )}
        {uploadError && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive break-words">
            {uploadError}
          </div>
        )}

        {/* 4 KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isVi ? 'Kho Lưu Trữ Hệ Thống' : 'Stored System Catalog'}
            value={`${catalog.skills.length} Skills • ${catalog.modules.length} Modules`}
            icon={<Database size={15} />}
            description={
              isVi
                ? `${catalog.role.name} (${catalog.requirements.length} yêu cầu 3 cấp • ${catalog.prerequisites.length} cạnh tiên quyết)`
                : `${catalog.role.name} (${catalog.requirements.length} role requirements • ${catalog.prerequisites.length} prerequisites)`
            }
          />
          <StatCard
            title={isVi ? 'Hồ Sơ Đã Phân Tích (Bước 1)' : 'Analyzed Profiles (Step 1)'}
            value={
              pathwayResults.length > 0
                ? isVi
                  ? `${pathwayResults.length} Hồ sơ (${totalGapsAcrossProfiles} Lỗ hổng)`
                  : `${pathwayResults.length} Profiles (${totalGapsAcrossProfiles} Gaps)`
                : isVi
                  ? '0 Hồ sơ (Chờ Bước 1)'
                  : '0 Profiles (Pending Step 1)'
            }
            icon={<GitFork size={15} />}
            description={
              pathwayResults.length > 0
                ? isVi
                  ? `Đã sinh lộ trình kỹ năng & học phần cho G0 (Graph) và C0 (CBF)`
                  : `Generated skill pathways & module rankings for G0 and C0`
                : isVi
                  ? 'Tải lên file 50 hồ sơ ở Bước 1 để sinh lộ trình học'
                  : 'Upload the 50 profiles file in Step 1 to generate pathways'
            }
          />
          {evaluationSummary && <>
          <StatCard
            title="Hit Rate@5 (Graph G0 vs CBF C0)"
            value={
              evaluationSummary
                ? `${(evaluationSummary.g0MeanHitRateAt5 * 100).toFixed(1)}% vs ${(evaluationSummary.c0MeanHitRateAt5 * 100).toFixed(1)}%`
                : isVi
                  ? 'Chờ Bước 2'
                  : 'Pending Step 2'
            }
            icon={<Trophy size={15} />}
            variant={evaluationSummary ? 'gradient' : 'default'}
            description={
              evaluationSummary
                ? isVi
                  ? `Chênh lệch Graph − CBF: ${(evaluationSummary.deltaHitRateAt5 * 100).toFixed(1)} điểm % trên ${evaluationSummary.evaluatedProfileCount} hồ sơ Golden Set`
                  : `Graph − CBF: ${(evaluationSummary.deltaHitRateAt5 * 100).toFixed(1)} percentage points across ${evaluationSummary.evaluatedProfileCount} Golden Set profiles`
                : isVi
                  ? 'Tải lên Phiếu chấm Chuyên gia ở Bước 2 để tính Hit Rate@5'
                  : 'Upload Expert Evaluation in Step 2 to compute Hit Rate@5'
            }
          />
          <StatCard
            title="Graded nDCG@5 & Precision@5"
            value={
              evaluationSummary
                ? `${(evaluationSummary.g0MeanNdcgAt5 * 100).toFixed(1)}% vs ${(evaluationSummary.c0MeanNdcgAt5 * 100).toFixed(1)}%`
                : isVi
                  ? 'Chờ Bước 2'
                  : 'Pending Step 2'
            }
            icon={<Network size={15} />}
            variant={evaluationSummary ? 'gradient' : 'default'}
            description={
              evaluationSummary
                ? isVi
                  ? `Precision@5: Graph ${(evaluationSummary.g0MeanPrecisionAt5 * 100).toFixed(1)}% vs CBF ${(evaluationSummary.c0MeanPrecisionAt5 * 100).toFixed(1)}% (${evaluationSummary.graphWins} trận Graph thắng)`
                  : `Precision@5: Graph ${(evaluationSummary.g0MeanPrecisionAt5 * 100).toFixed(1)}% vs CBF ${(evaluationSummary.c0MeanPrecisionAt5 * 100).toFixed(1)}% (${evaluationSummary.graphWins} Graph wins)`
                : isVi
                  ? 'Đánh giá chất lượng thứ hạng Top 1..5 với nhãn Grade 2 & Grade 1'
                  : 'Evaluates Top 1..5 ranking quality against Grade 2 & Grade 1 labels'
            }
          />
          </>}
        </div>

        {/* Main Workspace Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
            <TabsTrigger value="pathway-inspector" className="text-xs sm:text-sm">
              <GitFork size={14} className="mr-1.5" />
              {isVi
                ? `1. Lộ Trình Kỹ Năng & Học Phần Gợi Ý (${pathwayResults.length} Hồ sơ)`
                : `1. Skill Gaps & Generated Module Pathways (${pathwayResults.length} Profiles)`}
            </TabsTrigger>
            <TabsTrigger id="rq1-comparison-tab" value="expert-comparison" className="text-xs sm:text-sm">
              <Trophy size={14} className="mr-1.5" />
              {isVi
                ? '2. So sánh G0 và CBF'
                : '2. Compare G0 and CBF'}
            </TabsTrigger>
            <TabsTrigger value="catalog-store" className="text-xs sm:text-sm">
              <BookOpen size={14} className="mr-1.5" />
              {isVi
                ? '3. Kho Học Liệu & Kỹ Năng Lưu Trữ (20 Skills & 72 Modules)'
                : '3. Stored Catalog Repository (20 Skills & 72 Modules)'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pathway-inspector">
            {pathwayResults.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 px-6 text-center max-w-xl mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-full bg-secondary text-primary flex items-center justify-center mx-auto">
                    <Upload size={22} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-foreground">
                      {isVi
                        ? 'Bắt đầu Bước 1: Nộp File 50 Hồ Sơ Kết Quả Baseline'
                        : 'Start Step 1: Upload the 50 Baseline Profiles File'}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isVi
                        ? 'Kho học liệu (20 Kỹ năng & 72 Học phần) đã sẵn sàng trên hệ thống. Hãy tải lên file Excel (.xlsx) hoặc JSONL (.jsonl) chứa 50 hồ sơ Golden Set để hệ thống suy ra các kỹ năng cần học và gợi ý lộ trình học phần theo cả Graph-Traversal (G0) và Content-Based Filtering (C0).'
                        : 'The built-in catalog (20 Skills & 72 Modules) is ready. Upload the Excel (.xlsx) or JSONL (.jsonl) file containing the 50 Golden Set profiles to derive skills to learn and generate module pathways for both Graph-Traversal (G0) and Content-Based Filtering (C0).'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button variant="primary" onClick={() => step1InputRef.current?.click()}>
                      <Upload size={15} className="mr-2" />
                      {isVi
                        ? 'Tải lên File 50 Hồ sơ (.xlsx / .jsonl)'
                        : 'Upload 50 Profiles File (.xlsx / .jsonl)'}
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('catalog-store')}>
                      <BookOpen size={15} className="mr-2" />
                      {isVi ? 'Xem Kho 20 Skills & 72 Modules' : 'View Stored 20 Skills & 72 Modules'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Rq1ProfilePathwayInspector
                profiles={pathwayResults}
                comparisonsByProfileId={comparisonsByProfileId}
                selectedProfileId={selectedProfileId}
                onSelectProfileId={setSelectedProfileId}
                isVi={isVi}
              />
            )}
          </TabsContent>

          <TabsContent value="expert-comparison">
            {top5Reference ? (
              <Card role="status">
                <CardHeader>
                  <CardTitle>{isVi ? 'Kết quả đối chiếu Top 5' : 'Top-5 comparison'}</CardTitle>
                  <CardDescription>{isVi
                    ? `Cùng ${top5Reference.profiles} hồ sơ và cùng catalog. So tối đa 5 gợi ý của mỗi phương pháp với các module mà hai phiếu chuyên gia cùng chọn.`
                    : `Same ${top5Reference.profiles} profiles and catalog. Each method’s top five are compared with the modules selected on both expert forms.`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([['G0 · Graph', top5Reference.graph], ['C0 · CBF', top5Reference.cbf]] as const).map(([name, score]) => (
                      <StatCard key={name} title={`${name} · Hit Rate@5`}
                        value={`${score.profilesWithMatch}/${top5Reference.profiles} · ${(100 * score.profilesWithMatch / top5Reference.profiles).toFixed(0)}%`}
                        description={isVi ? 'Tỷ lệ hồ sơ có ít nhất 1 gợi ý Top 5 trùng mã với danh sách đồng thuận.' : 'Share of profiles with at least one exact Top-5 match to the consensus list.'}>
                        <p className="text-sm"><strong>{score.meanMatches.toFixed(2)}/5</strong> {isVi ? 'mã trùng trung bình mỗi hồ sơ' : 'mean matches per profile'}</p>
                      </StatCard>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{isVi
                    ? 'Hit Rate@5 = số hồ sơ có ít nhất 1 mã trùng ÷ tổng số hồ sơ. Ví dụ: Top 5 trùng 2 mã thì hồ sơ đóng góp 1 hit và 2 mã vào số trùng trung bình. Lượt này chỉ so đúng mã, chưa tính module tương đương, Recall hay nDCG.'
                    : 'Hit Rate@5 = profiles with at least one match ÷ all profiles. Two shared IDs contribute one hit and two matches to the average. This view uses exact IDs and excludes equivalent modules, Recall and nDCG.'}</p>
                </CardContent>
              </Card>
            ) : (
              <Rq1ComparisonOverviewTab
                summary={evaluationSummary}
                onTriggerStep2Upload={() => step2InputRef.current?.click()}
                onSelectProfileToInspect={(pid) => {
                  setSelectedProfileId(pid)
                  document.getElementById('rq1-profile-comparison')?.scrollIntoView({ block: 'start' })
                }}
                isVi={isVi}
              />
            )}
            {pathwayResults.length > 0 && (
              <div id="rq1-profile-comparison" className="mt-4 scroll-mt-28">
                <Rq1ProfilePathwayInspector
                  mode="comparison"
                  hasTop5Reference={!!top5Reference}
                  profiles={pathwayResults}
                  comparisonsByProfileId={comparisonsByProfileId}
                  selectedProfileId={selectedProfileId}
                  onSelectProfileId={setSelectedProfileId}
                  isVi={isVi}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="catalog-store">
            <Rq1CatalogRepositoryTab catalog={catalog} isVi={isVi} />
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceLayout>
  )
}
