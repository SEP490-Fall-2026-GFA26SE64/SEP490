import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResearchPage } from './ResearchPage'
import { ResearchApi, type ResearchRun } from './researchApi'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
const catalog = { sourceVersion: '0.9.0', sourceHash: 'source', nodeCounts: { MicroSkill: 79 }, edgeCounts: { TEACHES: 181 }, sizes: [1000, 5000, 10000], iterations: 1000, minIterations: 3, maxIterations: 100000, warmup: 30, rulesVersion: 'rq2-v2' }
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/admin/research"]}><Routes><Route path="/admin/research" element={<ResearchPage />} /><Route path="/login" element={<p>Portal login</p>} /><Route path="/employee/overview" element={<p>Employee portal</p>} /></Routes></MemoryRouter></QueryClientProvider>) }
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })
beforeEach(() => {
  localStorage.setItem('auth_user', 'admin@portal.local')
  localStorage.setItem('active_actor', 'admin')
})
describe('Research workspace', () => {
  it('opens for the signed-in admin without a second access form and orders RQs', async () => {
    vi.spyOn(ResearchApi.prototype, 'catalog').mockResolvedValue(catalog)
    vi.spyOn(ResearchApi.prototype, 'runs').mockResolvedValue([])
    renderPage()
    await screen.findByText('Configure RQ2')
    expect(screen.queryByText('Administrator access')).toBeNull()
    expect(screen.queryByLabelText('Username')).toBeNull()
    expect(screen.queryByText('Lock access')).toBeNull()
    const scope = screen.getByLabelText('Research scope').textContent!
    expect(scope.indexOf('RQ1')).toBeLessThan(scope.indexOf('RQ2'))
    expect(scope.indexOf('RQ2')).toBeLessThan(scope.indexOf('RQ3'))
  })
  it('redirects anonymous users to the existing portal login', () => {
    localStorage.removeItem('auth_user'); renderPage()
    expect(screen.getByText('Portal login')).toBeTruthy()
  })
  it('blocks another portal role before rendering Research or changing the actor', () => {
    localStorage.setItem('active_actor', 'employee'); renderPage()
    expect(screen.getByText('Employee portal')).toBeTruthy()
    expect(localStorage.getItem('active_actor')).toBe('employee')
  })
  it('shows real empty state, validates dataset count and submits sequential seeds', async () => {
    vi.spyOn(ResearchApi.prototype, 'catalog').mockResolvedValue(catalog)
    vi.spyOn(ResearchApi.prototype, 'runs').mockResolvedValue([])
    const start = vi.spyOn(ResearchApi.prototype, 'startStudy').mockRejectedValue(new Error('Another benchmark is active'))
    renderPage()
    await screen.findByText('No experiments yet. Generate a dataset and run your first benchmark.')
    fireEvent.change(screen.getByLabelText('Datasets per graph size'), { target: { value: '-1' } })
    fireEvent.submit(screen.getByLabelText('Datasets per graph size').closest('form')!)
    expect(screen.getByRole('alert').textContent).toContain('dataset count')
    expect(start).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Datasets per graph size'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Distinct pairs per hop'), { target: { value: '5000' } })
    fireEvent.click(screen.getByLabelText('5,000')); fireEvent.click(screen.getByLabelText('10,000'))
    fireEvent.click(screen.getByRole('button', { name: 'Generate & run benchmark' }))
    await waitFor(() => expect(start).toHaveBeenCalledWith([1, 2], [1000], 5000, 3))
    expect(await screen.findByText('Another benchmark is active')).toBeTruthy()
  })
  it('does not expose PDF export as available for an incomplete run', async () => {
    vi.spyOn(ResearchApi.prototype, 'catalog').mockResolvedValue(catalog)
    vi.spyOn(ResearchApi.prototype, 'runs').mockResolvedValue([{ id: 'test-run', createdBy: 'admin', status: 'FAILED', createdAt: '2026-10-21T00:00:00Z', finishedAt: null, seed: 42, sizes: [1000], sourceHash: 'source', sourceVersion: '0.9.0', rulesVersion: 'rq2-v1', iterations: 1000, warmup: 30, completedQueries: 0, phase: 'Stopped', failure: 'Database unavailable', environment: {}, results: [] }])
    renderPage()
    await screen.findByText('Database unavailable')
    expect((screen.getByRole('button', { name: 'Export PDF report' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Partial results are retained; this run is not a completed benchmark.')).toBeTruthy()
  })
  it('validates distinct pairs, rounds, dataset count and total budget', async () => {
    vi.spyOn(ResearchApi.prototype, 'catalog').mockResolvedValue(catalog)
    vi.spyOn(ResearchApi.prototype, 'runs').mockResolvedValue([])
    const start = vi.spyOn(ResearchApi.prototype, 'startStudy').mockResolvedValue({} as never)
    renderPage(); await screen.findByText('No experiments yet. Generate a dataset and run your first benchmark.')
    const input = screen.getByLabelText('Distinct pairs per hop') as HTMLInputElement
    for (const value of ['0', '3.5', '10001', '']) {
      fireEvent.change(input, { target: { value } }); fireEvent.submit(input.closest('form')!)
      expect(screen.getByRole('alert').textContent).toContain('Distinct pairs per hop')
    }
    fireEvent.change(input, { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Measured rounds'), { target: { value: '11' } })
    fireEvent.submit(input.closest('form')!)
    expect(start).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Measured rounds'), { target: { value: '3' } })
    for (const value of ['0', '-1', '1.5', '11', '1,2,3', '']) {
      fireEvent.change(screen.getByLabelText('Datasets per graph size'), { target: { value } }); fireEvent.submit(input.closest('form')!)
      expect(screen.getByRole('alert').textContent).toContain('dataset count')
    }
    expect(start).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Datasets per graph size'), { target: { value: '5' } })
    expect(screen.getByText('67,500')).toBeTruthy()
  })

  it('uses backend catalog defaults before the administrator edits the configuration', async () => {
    vi.spyOn(ResearchApi.prototype, 'catalog').mockResolvedValue({ ...catalog, defaultSeeds: [9, 10], defaultPairsPerHop: 4, defaultRounds: 2, maxPairsPerHop: 10000, maxRounds: 10, maxSeeds: 10, maxTotalQueries: 1000000 })
    vi.spyOn(ResearchApi.prototype, 'runs').mockResolvedValue([])
    const start = vi.spyOn(ResearchApi.prototype, 'startStudy').mockRejectedValue(new Error('test stopped'))
    renderPage(); await screen.findByText('No experiments yet. Generate a dataset and run your first benchmark.')
    expect((screen.getByLabelText('Datasets per graph size') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('Distinct pairs per hop') as HTMLInputElement).value).toBe('4')
    expect((screen.getByLabelText('Measured rounds') as HTMLInputElement).value).toBe('2')
    expect(screen.getByText('144')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Generate & run benchmark' }))
    await waitFor(() => expect(start).toHaveBeenCalledWith([1, 2], [1000, 5000, 10000], 4, 2))
  })

  it('paginates complete seeds, keeps all sizes/rounds and resets on run changes', async () => {
    const metric = { count: 7, meanMs: 2, medianMs: 1, p95Ms: 4, minMs: 1, maxMs: 5 }
    const study: ResearchRun = { id: 'seed-study', createdBy: 'admin', status: 'SUCCEEDED', createdAt: '2026-10-21T00:00:00Z', finishedAt: '2026-10-21T00:01:00Z', seed: 0, sizes: [1000, 5000], sourceHash: 'hash', sourceVersion: '0.9.0', rulesVersion: 'rq2-v3', iterations: 42, warmup: 0, completedQueries: 168, totalQueries: 168, planReady: true, phase: 'Completed', failure: null, environment: {}, protocol: { seeds: [0, 100000000], pairsPerHop: 7, rounds: 2 }, results: [0, 100000000].flatMap(seed => [1000, 5000].flatMap(nodeCount => [1,2].map(round => ({ nodeCount, edgeCount: 5000, nodeCounts: {}, edgeCounts: {}, generationMs: 1, importMs: 2, overall: metric, byHop: { 3: metric, 4: metric, 5: metric }, trial: { seed, round, uniqueByHop: { 3: 7, 4: 7, 5: 7 }, warmupQueries: 21, structure: { averageDegree: 10, maxDegree: 20 }, attempted: 21, errors: 0, timeouts: 0 } })))) }
    const legacy: ResearchRun = { ...study, id: 'legacy-study', seed: 42, protocol: null, results: [{ ...study.results[0], trial: null }] }
    vi.spyOn(ResearchApi.prototype, 'catalog').mockResolvedValue(catalog)
    vi.spyOn(ResearchApi.prototype, 'runs').mockResolvedValue([study, legacy])
    renderPage()
    const section = await screen.findByRole('region', { name: 'Latency results by seed' })
    const rows = () => within(section).getAllByRole('row').slice(1)
    expect(rows()).toHaveLength(16)
    expect(rows().every(row => within(row).getAllByRole('cell')[0].textContent === '0')).toBe(true)
    expect((within(section).getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(section).getByRole('button', { name: 'Next page' }))
    expect(rows()).toHaveLength(16)
    expect(rows().every(row => within(row).getAllByRole('cell')[0].textContent === '100000000')).toBe(true)
    expect((within(section).getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'View run legacy-study' }))
    expect(within(screen.getByRole('region', { name: 'Latency results by seed' })).queryByRole('region', { name: 'Latency seed pagination' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View run seed-study' }))
    expect(within(screen.getByRole('region', { name: 'Latency results by seed' })).getByText('Seed 0')).toBeTruthy()
  })

})
