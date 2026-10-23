import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical, Download, Play, RefreshCw, Clock3, Database } from 'lucide-react'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card } from '../../../shared/components/ui/Card'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Badge } from '../../../shared/components/ui/Badge'
import { Progress } from '../../../shared/components/ui/Progress'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Heading } from '../../../shared/components/typography/Heading'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Navigate } from 'react-router-dom'
import { researchIdentity } from './researchAccess'
import { ResearchApi, type ResearchRun } from './researchApi'
import './ResearchPage.css'

const active = (run?: ResearchRun) => !!run && ['QUEUED', 'RUNNING'].includes(run.status)
const ms = (value?: number | null) => value == null ? '—' : `${value.toFixed(3)} ms`
export function ResearchPage() {
  if (!localStorage.getItem('auth_user')) return <Navigate to="/login" replace />
  if (!researchIdentity()) {
    const actor = localStorage.getItem('active_actor')
    const home = actor === 'expert' ? '/expert/ontology' : actor === 'ld-manager' ? '/ld-manager/learning-outcomes' : '/employee/overview'
    return <Navigate to={home} replace />
  }
  return <ResearchWorkspace />
}

function ResearchWorkspace() {
  const { language } = useTranslation()
  const tx = (en: string, vi: string) => language === 'vi' ? vi : en
  const [api] = useState(() => new ResearchApi())
  const userId = researchIdentity()!.userId
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [datasetCountDraft, setDatasetCount] = useState<string | null>(null)
  const [pairDraft, setPairs] = useState<string | null>(null)
  const [roundDraft, setRounds] = useState<string | null>(null)
  const [sizes, setSizes] = useState([1000, 5000, 10000])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const catalog = useQuery({ queryKey: ['research', userId, 'catalog'], queryFn: () => api.catalog(), retry: false })
  const history = useQuery({ queryKey: ['research', userId, 'runs'], queryFn: () => api.runs(), retry: false, refetchInterval: 5000 })
  const pairs = pairDraft ?? String(catalog.data?.defaultPairsPerHop ?? 500)
  const rounds = roundDraft ?? String(catalog.data?.defaultRounds ?? 3)
  const maxPairs = catalog.data?.maxPairsPerHop ?? 10000
  const maxRounds = catalog.data?.maxRounds ?? 10
  const maxSeeds = catalog.data?.maxSeeds ?? 10
  const maxTotal = catalog.data?.maxTotalQueries ?? 1000000
  const datasetCountInput = datasetCountDraft ?? String(catalog.data?.defaultSeeds?.length ?? 5)
  const datasetCount = /^\d+$/.test(datasetCountInput) && Number.isSafeInteger(Number(datasetCountInput)) ? Number(datasetCountInput) : 0
  const validDatasetCount = datasetCount >= 1 && datasetCount <= maxSeeds
  const seedValues = validDatasetCount ? Array.from({ length: datasetCount }, (_, index) => index + 1) : []
  const pairCount = /^\d+$/.test(pairs) ? Number(pairs) : 0
  const roundCount = /^\d+$/.test(rounds) ? Number(rounds) : 0
  const upperTotal = pairCount * 3 * roundCount * seedValues.length * sizes.length
  const validProtocol = pairCount >= 1 && pairCount <= maxPairs && roundCount >= 1 && roundCount <= maxRounds && upperTotal <= maxTotal
  const runs = history.data || []
  const selected = runs.find(run => run.id === selectedId) || runs[0]
  const currentResult = selected?.results.at(-1)
  const totalQueries = selected?.totalQueries ?? (selected ? selected.sizes.length * selected.iterations : 0)
  const datasets = selected?.results.filter(r => !r.trial || r.trial.round === 1) ?? []
  const totalErrors = selected?.results.reduce((n, r) => n + (r.trial?.errors ?? 0), 0) ?? 0
  const running = runs.some(active)
  const status = (run: ResearchRun) => ({ QUEUED: tx('Queued', 'Đang chờ'), RUNNING: tx('Running', 'Đang chạy'), SUCCEEDED: tx('Completed', 'Hoàn tất'), FAILED: tx('Failed', 'Thất bại') })[run.status]
  const variant = (run: ResearchRun) => run.status === 'SUCCEEDED' ? 'success' : run.status === 'FAILED' ? 'destructive' : 'warning'
  const displayError = error || (catalog.error?.message ?? '') || (history.error?.message ?? '')
  async function start(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!validDatasetCount || sizes.length === 0) {
      setError(tx(`Choose at least one size and enter an integer dataset count from 1 to ${maxSeeds}.`, `Chọn ít nhất một quy mô và nhập số bộ dữ liệu là số nguyên từ 1 đến ${maxSeeds}.`)); return
    }
    if (!validProtocol) {
      setError(tx('Distinct pairs per hop: 1–10,000; measured rounds: 1–10; total at most 1,000,000 attempts.', 'Cặp khác nhau mỗi độ sâu: 1–10.000; vòng đo: 1–10; tổng tối đa 1.000.000 lượt.')); return
    }
    setBusy(true)
    try { const run = await api.startStudy(seedValues, sizes, pairCount, roundCount); setSelectedId(run.id); setPage(1); await history.refetch() }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function download(path: string, name: string) {
    setError(''); setDownloading(true)
    try { await api.download(path, name) } catch (e) { setError((e as Error).message) } finally { setDownloading(false) }
  }
  return <WorkspaceLayout mobileOverlay><div className="research-page">
    <PageHeader title={tx('Research workspace', 'Không gian nghiên cứu')} icon={<FlaskConical aria-hidden="true" size={25} />}
      description={tx('Generate ontology datasets, measure graph latency and retain reproducible evidence.', 'Tạo dữ liệu ontology, đo độ trễ truy vấn và lưu minh chứng có thể tái lập.')}
      actions={<Button variant="outline" leftIcon={<Download size={16} aria-hidden="true" />} disabled={downloading} onClick={() => download('/rules.md', 'rq2-rules.md')}>{tx('Research rules', 'Rule nghiên cứu (.md)')}</Button>} />
    <div className="research-scope" aria-label={tx('Research scope', 'Phạm vi nghiên cứu')}>
      <Badge variant="outline">RQ1 · {tx('Planned', 'Chưa triển khai')}</Badge>
      <Badge variant="primary">RQ2 · {tx('Graph latency', 'Độ trễ đồ thị')}</Badge>
      <Badge variant="outline">RQ3 · {tx('Deferred', 'Tạm hoãn')}</Badge>
    </div>
    {displayError && <div role="alert" className="research-error">{displayError}<Button variant="outline" size="sm" onClick={() => { setError(''); void catalog.refetch(); void history.refetch() }}>{tx('Retry', 'Thử lại')}</Button></div>}
    <>
      <div className="research-stats">
        <StatCard title={tx('Source ontology', 'Ontology nguồn')} value={catalog.data ? `v${catalog.data.sourceVersion}` : '—'} description={catalog.data ? `${Object.values(catalog.data.nodeCounts).reduce((a, b) => a + b, 0)} nodes · ${Object.values(catalog.data.edgeCounts).reduce((a, b) => a + b, 0)} edges` : tx('Loading source…', 'Đang đọc nguồn…')} icon={<Database size={16} />} />
        <StatCard title={selected?.protocol ? tx("Latest round Mean", "Mean vòng gần nhất") : "Mean"} value={ms(currentResult?.overall.count ? currentResult.overall.meanMs : undefined)} description={currentResult ? `${currentResult.nodeCount.toLocaleString()} nodes · ${currentResult.trial ? `seed ${currentResult.trial.seed} / ${tx("round", "vòng")} ${currentResult.trial.round} · ` : ""}${currentResult.overall.count} queries` : tx('Available after measurement', 'Có sau khi đo')} icon={<Clock3 size={16} />} />
        <StatCard title={selected?.protocol ? tx("Latest round P95", "P95 vòng gần nhất") : "P95"} value={ms(currentResult?.overall.count ? currentResult.overall.p95Ms : undefined)} description={tx('Nearest-rank percentile · milliseconds', 'Phân vị nearest-rank · mili giây')} />
        <StatCard title={selected ? tx('Selected run protocol', 'Quy trình lượt đang xem') : tx('Protocol', 'Quy trình')} value="3 / 4 / 5 hops" description={selected?.protocol ? `${selected.protocol.seeds.length} seeds · ${selected.protocol.pairsPerHop} ${tx('pairs/hop', 'cặp/hop')} · ${selected.protocol.rounds} ${tx('rounds', 'vòng')}` : selected ? `${selected.iterations.toLocaleString()} measured + ${selected.warmup} warm-up / size` : tx('Full workload warm-up excluded', 'Loại một vòng warm-up toàn bộ truy vấn')} />
      </div>
      <div className="research-grid">
        <Card className="research-panel"><Heading level={2} size="subsection">{tx('Configure RQ2', 'Cấu hình RQ2')}</Heading>
          <form onSubmit={start} className="research-form">
            <fieldset disabled={busy || running}><legend>{tx('Graph sizes · total ontology nodes', 'Quy mô · tổng node ontology')}</legend>
              <div className="research-size-options">{[1000, 5000, 10000].map(size => <label key={size}><input type="checkbox" checked={sizes.includes(size)} onChange={e => setSizes(previous => e.target.checked ? [...previous, size].sort((a, b) => a - b) : previous.filter(n => n !== size))} />{size.toLocaleString()}</label>)}</div>
            </fieldset>
            <label htmlFor="research-dataset-count">{tx('Datasets per graph size', 'Số bộ dữ liệu mỗi quy mô')}</label>
            <Input id="research-dataset-count" type="number" min={1} max={maxSeeds} step={1} value={datasetCountInput} onChange={e => setDatasetCount(e.target.value)} disabled={busy || running} required aria-describedby="research-dataset-count-help" />
            <p id="research-dataset-count-help" className="research-caption">{tx(`Generate 1–${maxSeeds} datasets for each selected graph size. Seeds 1 through the chosen count are assigned automatically and saved for reproducibility.`, `Tạo 1–${maxSeeds} bộ dữ liệu cho mỗi quy mô được chọn. Hệ thống tự gán seed từ 1 đến số lượng đã nhập và lưu lại để tái lập.`)}</p>
            <label htmlFor="research-pairs">{tx('Distinct pairs per hop', 'Số cặp khác nhau mỗi độ sâu')}</label>
            <Input id="research-pairs" type="number" min={1} max={maxPairs} step={1} required value={pairs} onChange={e => setPairs(e.target.value)} disabled={busy || running} aria-describedby="research-pairs-help" />
            <p id="research-pairs-help" className="research-caption">{tx('1–10,000 start/end pairs for each of 3 / 4 / 5 hops. If fewer exist, use the actual count; never repeat to fill the request.', '1–10.000 cặp đầu–cuối ở mỗi độ sâu 3 / 4 / 5 hop. Nếu không đủ cặp, dùng số thực tế; không lặp để bù.')}</p>
            <label htmlFor="research-rounds">{tx('Measured rounds', 'Số vòng đo')}</label>
            <Input id="research-rounds" type="number" min={1} max={maxRounds} step={1} required value={rounds} onChange={e => setRounds(e.target.value)} disabled={busy || running} aria-describedby="research-rounds-help" />
            <p id="research-rounds-help" className="research-caption">{tx('1–10 rounds of the same pairs, shuffled each round. One full workload warm-up is excluded per seed/size.', '1–10 vòng dùng cùng các cặp, xáo thứ tự mỗi vòng. Loại một vòng warm-up toàn bộ truy vấn cho mỗi seed/quy mô.')}</p>
            <p className="research-caption" aria-live="polite">{validDatasetCount && validProtocol && <>{tx('Up to', 'Tối đa')} <strong>{upperTotal.toLocaleString()}</strong> {tx('measured attempts', 'lượt đo')} = {pairCount.toLocaleString()} × 3 {tx('depths', 'độ sâu')} × {roundCount} {tx('rounds', 'vòng')} × {seedValues.length} {tx('datasets', 'bộ dữ liệu')} × {sizes.length} {tx('sizes', 'quy mô')}. {tx('The exact total is frozen after planning. Limit: 1,000,000.', 'Tổng thực tế được chốt sau khi lập bộ truy vấn. Giới hạn: 1.000.000.')}</>}</p>
            <Button type="submit" isLoading={busy} disabled={running || !catalog.data || !!history.error || history.isPending} leftIcon={<Play size={16} aria-hidden="true" />}>{running ? tx('Benchmark in progress', 'Benchmark đang chạy') : tx('Generate & run benchmark', 'Tạo dữ liệu và chạy benchmark')}</Button>
          </form>
          <div className="research-note"><strong>{tx('Measurement boundaries', 'Phạm vi phép đo')}</strong><p>{tx('Dedicated Neo4j instance. One query at a time. Warm-up, generation and import are excluded. Query time includes the driver and result consumption.', 'Neo4j riêng, mỗi lần một truy vấn. Loại thời gian sinh dữ liệu, import và warm-up. Thời gian đo gồm driver và đọc hết kết quả.')}</p></div>
        </Card>
        <Card className="research-panel"><div className="research-row"><Heading level={2} size="subsection">{tx('Selected experiment', 'Thí nghiệm đang xem')}</Heading>{selected && <Badge variant={variant(selected)}>{status(selected)}</Badge>}</div>
          {!selected ? <div className="research-empty"><FlaskConical size={32} aria-hidden="true" /><p>{history.isPending ? tx('Loading history…', 'Đang tải lịch sử…') : tx('No experiments yet. Generate a dataset and run your first benchmark.', 'Chưa có thí nghiệm. Tạo dữ liệu và chạy benchmark đầu tiên.')}</p></div> : <>
            <p className="research-mono">{selected.id}</p><p className="research-caption">{new Date(selected.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} · {selected.protocol ? `seeds ${selected.protocol.seeds.join(", ")} · ${selected.protocol.rounds} ${tx("rounds", "vòng")}` : `seed ${selected.seed} · N = ${selected.iterations.toLocaleString()} / size`} · {selected.createdBy}</p>
            <div role="status" aria-live="polite"><p>{selected.phase}</p>{selected.protocol && !selected.planReady && <p className="research-caption">{tx("Planning workload; denominator is an upper bound.", "Đang lập bộ truy vấn; tổng lượt hiện là giới hạn trên.")}</p>}<Progress role="progressbar" aria-label={tx("Measured queries", "Truy vấn đã đo")} aria-valuemin={0} aria-valuemax={totalQueries} aria-valuenow={selected.completedQueries} value={selected.completedQueries} max={totalQueries} label={`${selected.completedQueries.toLocaleString()} / ${(totalQueries).toLocaleString()} ${tx('queries', 'truy vấn')}`} /></div>
            {selected.protocol && <p className="research-caption">{tx('Measured attempts', 'Lượt đã đo')}: {selected.completedQueries.toLocaleString()} · {tx('Recorded failures', 'Lượt lỗi đã lưu')}: {totalErrors.toLocaleString()}. {tx('Latency metrics include successful samples only; see each round below.', 'Độ trễ chỉ tính mẫu thành công; xem từng vòng bên dưới.')}</p>}
            {selected.failure && <p className="research-error">{selected.failure}</p>}
            {selected.status === 'FAILED' && <p>{tx('Partial results are retained; this run is not a completed benchmark.', 'Kết quả một phần được giữ lại; lượt này chưa phải benchmark hoàn tất.')}</p>}
            <div className="research-downloads">
              <Button disabled={selected.status !== 'SUCCEEDED' || downloading} leftIcon={<Download size={16} aria-hidden="true" />} onClick={() => download(`/runs/${selected.id}/report.pdf`, `rq2-${selected.id}.pdf`)}>{tx('Export PDF report', 'Xuất báo cáo PDF')}</Button>
              <Button variant="outline" disabled={downloading} onClick={() => download(`/runs/${selected.id}/raw`, `rq2-${selected.id}.json`)}>JSON</Button>
              <Button variant="outline" disabled={!selected.results.length || downloading} onClick={() => download(`/runs/${selected.id}/samples.csv`, `rq2-${selected.id}.csv`)}>CSV</Button>
              <Button variant="outline" disabled={downloading} onClick={() => download(`/runs/${selected.id}/rules.md`, `rq2-${selected.id}-rules.md`)}>{tx('Frozen rules', 'Rule của lượt chạy')}</Button>
            </div>
            <p className="research-caption">{tx('150 ms is a reference only; no automatic NFR pass/fail decision.', '150 ms là mốc tham khảo; chưa tự kết luận đạt/trượt NFR.')}</p>
          </>}
        </Card>
      </div>
      {selected && selected.results.length > 0 && <Card className="research-panel">
        <LatencyTable key={selected.id} run={selected} language={language} />
        {selected.protocol && <><Heading level={3} size="card">{tx('Variation between seeds and rounds', 'Dao động giữa các seed và vòng')}</Heading>
          <p className="research-caption">{tx('Across all seeds: descriptive variation of round Mean values; not a confidence interval. P95 remains separate per seed/round.', 'Trên tất cả seed: thống kê mô tả các giá trị Mean từng vòng; không phải khoảng tin cậy. P95 giữ riêng theo seed/vòng.')}</p>
          <div className="research-table-wrap"><table><thead><tr>{['Nodes', tx('Seed / round observations', 'Số quan sát seed / vòng'), 'Mean of means (ms)', 'SD (ms)', 'Min / Max mean (ms)'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{selected.sizes.map(size => {
            const values = selected.results.filter(r => r.nodeCount === size && r.overall.count > 0).map(r => r.overall.meanMs)
            if (!values.length) return null
            const mean = values.reduce((a,b) => a+b, 0) / values.length
            const sd = values.length > 1 ? Math.sqrt(values.reduce((n,v) => n+(v-mean)**2,0)/(values.length-1)) : null
            return <tr key={size}><td>{size.toLocaleString()}</td><td>{values.length}</td><td>{mean.toFixed(3)}</td><td>{sd?.toFixed(3) ?? '—'}</td><td>{Math.min(...values).toFixed(3)} / {Math.max(...values).toFixed(3)}</td></tr>
          })}</tbody></table></div></>}
        <details><summary>{tx('Dataset counts and generation timings', 'Số lượng dữ liệu và thời gian tạo')}</summary>{datasets.map(r => <div key={`${r.trial?.seed ?? selected.seed}-${r.nodeCount}`} className="research-counts"><Heading level={3} size="card">{r.nodeCount.toLocaleString()} nodes · seed {r.trial?.seed ?? selected.seed}</Heading>{r.trial && <><p>{tx('Actual distinct pairs by hop', 'Cặp khác nhau thực tế mỗi độ sâu')}: {Object.entries(r.trial.uniqueByHop).map(([h,n]) => `${h} hops: ${n}`).join(' · ')} / {tx('requested per hop', 'yêu cầu mỗi độ sâu')}: {selected.protocol?.pairsPerHop}</p><p>{tx('Excluded warm-up queries', 'Truy vấn warm-up đã loại')}: {r.trial.warmupQueries} · {tx('Average / maximum degree (in + out)', 'Bậc trung bình / lớn nhất (vào + ra)')}: {r.trial.structure.averageDegree.toFixed(3)} / {r.trial.structure.maxDegree}</p></>}
            <p>{Object.entries(r.nodeCounts).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p><p>{Object.entries(r.edgeCounts).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p><p>{tx('Generation', 'Sinh dữ liệu')}: {ms(r.generationMs)} · Import: {ms(r.importMs)}</p><Button variant="outline" size="sm" disabled={downloading} onClick={() => download(`/runs/${selected.id}/datasets/${r.nodeCount}?seed=${r.trial?.seed ?? selected.seed}`, `rq2-${selected.id}-${r.trial?.seed ?? selected.seed}-${r.nodeCount}.json`)}>{tx('Download dataset', 'Tải bộ dữ liệu')}</Button></div>)}</details>
      </Card>}
      {selected && <Card className="research-panel"><details><summary>{tx('Reproducibility and environment', 'Thông tin tái lập và môi trường')}</summary><dl className="research-metadata"><dt>Source SHA-256</dt><dd>{selected.sourceHash}</dd><dt>Rules / catalog</dt><dd>{selected.rulesVersion} / {selected.sourceVersion}</dd>{Object.entries(selected.environment).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details></Card>}
      <Card className="research-panel"><div className="research-row"><Heading level={2} size="subsection">{tx('Run history', 'Lịch sử chạy')}</Heading><Button variant="ghost" size="sm" leftIcon={<RefreshCw size={15} aria-hidden="true" />} onClick={() => void history.refetch()}>{tx('Refresh', 'Làm mới')}</Button></div>
        <p className="research-caption">{tx('Latest 50 runs. Earlier run URLs and saved artifacts remain accessible.', 'Hiển thị 50 lượt mới nhất. URL và dữ liệu của các lượt trước vẫn được giữ.')}</p>
        <div className="research-table-wrap"><table><thead><tr>{[tx('Created', 'Thời điểm'), 'Seed', tx('Pairs/hop × rounds', 'Cặp/hop × vòng'), tx('Sizes', 'Quy mô'), tx('Status', 'Trạng thái'), tx('Action', 'Thao tác')].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{runs.slice((page - 1) * 5, page * 5).map(run => <tr key={run.id}><td>{new Date(run.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</td><td>{run.protocol?.seeds.join(", ") ?? run.seed}</td><td>{run.protocol ? `${run.protocol.pairsPerHop} × ${run.protocol.rounds}` : `${run.iterations.toLocaleString()} / size`}</td><td>{run.sizes.join(' / ')}</td><td><Badge variant={variant(run)}>{status(run)}</Badge></td><td><Button variant={selected?.id === run.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setSelectedId(run.id)} aria-label={`${tx('View run', 'Xem lượt chạy')} ${run.id}`}>{tx('View', 'Xem')}</Button></td></tr>)}</tbody></table></div>
        <Pagination className="research-pagination" currentPage={page} totalPages={Math.ceil(runs.length / 5)} totalItems={runs.length} pageSize={5} onPageChange={setPage} />
      </Card>
    </>
  </div></WorkspaceLayout>
}

function LatencyTable({ run, language }: { run: ResearchRun; language: string }) {
  const tx = (en: string, vi: string) => language === 'vi' ? vi : en
  const [seedPage, setSeedPage] = useState(1)
  const resultSeeds = [...new Set(run.results.map(result => result.trial?.seed ?? run.seed))]
  const currentPage = Math.max(1, Math.min(seedPage, resultSeeds.length))
  const currentSeed = resultSeeds[currentPage - 1]
  const visibleResults = run.results.filter(result => (result.trial?.seed ?? run.seed) === currentSeed)
  return <section className="research-latency-section" aria-label={tx('Latency results by seed', 'Kết quả độ trễ theo seed')}>
        <Heading level={2} size="subsection">{tx('Latency by graph size and depth', 'Độ trễ theo quy mô và độ sâu')}</Heading>
        <p className="research-caption">{tx('Each row belongs to one seed and measured round. N counts successful queries. Errors include timeouts; no retries. Median is unavailable for historical runs that did not record it.', 'Mỗi dòng thuộc một seed và vòng đo. N là số truy vấn thành công. Lỗi gồm timeout; không thử lại. Median không có ở lượt cũ chưa lưu chỉ số này.')}</p>
        <div className="research-row"><p className="research-caption" role="status" aria-live="polite"><strong>Seed {currentSeed}</strong> · {tx("Page", "Trang")} {currentPage} / {resultSeeds.length}</p></div>
        <div className="research-table-wrap"><table><caption className="sr-only">{tx('Measured graph latency in milliseconds', 'Độ trễ đồ thị tính bằng mili giây')} · seed {currentSeed}</caption><thead><tr>{['Seed', tx('Round', 'Vòng'), 'Nodes', 'Edges', 'Hops', 'Success N', 'Mean (ms)', 'Median (ms)', 'P95 (ms)', tx('Errors / attempts', 'Lỗi / lượt'), 'Timeout'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>
          {visibleResults.flatMap(result => [['all', result.overall] as const, ...Object.entries(result.byHop)].map(([hop, metric]) => <tr key={`${result.trial?.seed ?? run.seed}-${result.trial?.round ?? 1}-${result.nodeCount}-${hop}`} className={hop === 'all' ? 'research-aggregate' : ''}>
            <td>{result.trial?.seed ?? run.seed}</td><td>{result.trial?.round ?? '—'}</td><td>{result.nodeCount.toLocaleString()}</td><td>{result.edgeCount.toLocaleString()}</td><td>{hop === 'all' ? tx('All', 'Tất cả') : hop}</td><td>{metric.count}</td><td>{metric.count ? metric.meanMs.toFixed(3) : '—'}</td><td>{metric.count && metric.medianMs != null ? metric.medianMs.toFixed(3) : '—'}</td><td>{metric.count ? metric.p95Ms.toFixed(3) : '—'}</td><td>{hop === 'all' && result.trial ? `${result.trial.errors} / ${result.trial.attempted} (${(100 * result.trial.errors / Math.max(1, result.trial.attempted)).toFixed(1)}%)` : '—'}</td><td>{hop === 'all' ? result.trial?.timeouts ?? '—' : '—'}</td>
          </tr>))}</tbody></table></div>
        {resultSeeds.length > 1 && <div role="region" aria-label={tx('Latency seed pagination', 'Phân trang seed độ trễ')}>
          <Pagination className="research-pagination" currentPage={currentPage} totalPages={resultSeeds.length} totalItems={resultSeeds.length} pageSize={1} showItemRange={false} itemLabel="seeds" onPageChange={setSeedPage} />
        </div>}
  </section>
}

