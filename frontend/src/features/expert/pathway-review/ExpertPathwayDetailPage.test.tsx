import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import * as api from '../../../shared/api/initialPathway'
import { en } from '../../../shared/i18n/translations/en'
import { vi as vietnamese } from '../../../shared/i18n/translations/vi'
import { ExpertPathwayDetailPage } from './ExpertPathwayDetailPage'
import { reviewFixture } from './reviewTestFixtures'

const language = vi.hoisted(() => ({ value: 'en' }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: language.value, t: (key: string) => key.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown>)?.[k], language.value === 'vi' ? vietnamese : en) ?? key }) }))
vi.mock('../../../shared/hooks/useInitialPathwaySession', () => ({ useInitialPathwaySession: () => ({ scope: 'ORG-A:expert-a:DOMAIN_EXPERT', data: { role: 'DOMAIN_EXPERT' } }) }))
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }))
vi.mock('../../../shared/api/initialPathway', async importOriginal => ({ ...await importOriginal<typeof api>(), readReviewDetail: vi.fn(), checkReview: vi.fn(), sendPathwayCommand: vi.fn() }))
// Visualization owners are isolated; actual preview projection is separately tested.
vi.mock('./ReviewPathwayPreview', () => ({ ReviewPathwayPreview: () => <div>Draft visualization</div> }))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/expert/pathway-review/00000000-0000-0000-0000-000000000019']}><Routes><Route path="/expert/pathway-review/:pathwayId" element={<ExpertPathwayDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}
const checkButton = () => screen.getAllByRole('button', { name: 'Check again' })[0]!
const reply = (hash = 'a'.repeat(64), status = 'VALID', diagnostics: string[] = []) => ({ revisionContentHash: hash, validationStatus: status, diagnostics, warnings: [] })
beforeEach(() => {
  language.value = 'en'
  vi.mocked(api.readReviewDetail).mockResolvedValue(reviewFixture())
  vi.mocked(api.checkReview).mockResolvedValue(reply())
  vi.mocked(api.sendPathwayCommand).mockResolvedValue({ requestId: reviewFixture().summary.id })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(callback, 0))
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.resetAllMocks() })

describe('REQ-019/020 C3 component: ORG-A assigned Expert, independent fixture', () => {
  it('R09 every Check is fresh; equal hash avoids detail reload', async () => {
    mount(); await screen.findByText('Employee A')
    const user = userEvent.setup()
    await user.click(checkButton()); await waitFor(() => expect(api.checkReview).toHaveBeenCalledTimes(1))
    await user.click(checkButton()); await waitFor(() => expect(api.checkReview).toHaveBeenCalledTimes(2))
    expect(api.readReviewDetail).toHaveBeenCalledTimes(1)
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
  })
  it('R09 hash drift reloads detail and cannot approve unseen content', async () => {
    vi.mocked(api.checkReview).mockResolvedValue(reply('b'.repeat(64)))
    mount(); await screen.findByText('Employee A'); await userEvent.click(checkButton())
    await waitFor(() => expect(api.readReviewDetail).toHaveBeenCalledTimes(2))
    expect((screen.getByRole('button', { name: 'Confirm this plan' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
  })
  it('R09 preview open/close sends zero mutations; final double click sends exact captured tuple once', async () => {
    mount(); await screen.findByText('Employee A'); await userEvent.click(checkButton())
    await userEvent.click(screen.getByRole('button', { name: 'Confirm this plan' }))
    let dialog = await screen.findByRole('dialog', { name: 'Review pathway before approval' })
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Back to editing' })[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm this plan' }))
    dialog = await screen.findByRole('dialog', { name: 'Review pathway before approval' })
    vi.mocked(api.sendPathwayCommand).mockImplementation(() => new Promise(() => {}))
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Confirm and approve' }))
    expect(api.sendPathwayCommand).toHaveBeenCalledTimes(1)
    expect(JSON.parse(vi.mocked(api.sendPathwayCommand).mock.calls[0]![0].body)).toEqual({ expectedRevision: 4, expectedContentHash: 'a'.repeat(64) })
  })
  it('R11 ambiguous edit retry retains key/body; busy locks conflicting edits', async () => {
    vi.mocked(api.sendPathwayCommand).mockRejectedValueOnce(new api.PathwayError('NETWORK_ERROR'))
    mount(); await screen.findByText('Employee A')
    await userEvent.click(screen.getAllByRole('button', { name: 'Exclude' })[0]!)
    await waitFor(() => expect(api.sendPathwayCommand).toHaveBeenCalledTimes(1))
    const first = vi.mocked(api.sendPathwayCommand).mock.calls[0]![0]
    expect((screen.getAllByRole('button', { name: 'Exclude' })[0] as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(api.sendPathwayCommand).toHaveBeenCalledTimes(2))
    expect(vi.mocked(api.sendPathwayCommand).mock.calls[1]![0]).toEqual(first)
  })
  it('R11 committed Include with failed follow-up Check never resends the edit', async () => {
    vi.mocked(api.checkReview).mockRejectedValue(new api.PathwayError('DEPENDENCY_UNAVAILABLE', 503))
    mount(); await screen.findByText('Employee A')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Pathway' }))
    await screen.findByRole('dialog', { name: 'Check pathway and resolve issues' })
    expect(api.sendPathwayCommand).toHaveBeenCalledTimes(1)
    await userEvent.click(checkButton())
    expect(api.sendPathwayCommand).toHaveBeenCalledTimes(1)
  })
  it.each(['APPROVED', 'ARCHIVED'])('R12 %s disables arrows/trash/membership/final approval', async state => {
    vi.mocked(api.readReviewDetail).mockResolvedValue(reviewFixture(state))
    mount(); await screen.findByText('Employee A')
    for (const label of ['Exclude', 'Move module up', 'Move module down', 'Remove module', 'Confirm this plan']) {
      for (const button of screen.getAllByRole('button', { name: label })) expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })
  it('R14 first/last arrows lock; external and same-list drops issue no mutation', async () => {
    mount(); await screen.findByText('Employee A')
    expect((screen.getAllByRole('button', { name: 'Move module up' })[0] as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getAllByRole('button', { name: 'Move module down' })[1] as HTMLButtonElement).disabled).toBe(true)
    const zone = screen.getByRole('region', { name: 'Pathway Learning Modules' })
    fireEvent.drop(zone, { dataTransfer: { getData: () => 'foreign' } })
    const row = within(zone).getAllByRole('listitem')[0]!, transfer = { effectAllowed: '', setData: vi.fn(), getData: () => 'M-A' }
    fireEvent.dragStart(row, { dataTransfer: transfer }); fireEvent.drop(zone, { dataTransfer: transfer })
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
  })
  it('R14 archived unresolved matching-hash Check must lock repair Include (conditional component reproducer)', async () => {
    // Valid wire lifecycle fixture; reachability on the real stack is NOT established by this test.
    vi.mocked(api.readReviewDetail).mockResolvedValue(reviewFixture('ARCHIVED', true))
    vi.mocked(api.checkReview).mockResolvedValue(reply('a'.repeat(64), 'UNRESOLVED', ['MISSING_PROVIDER:S']))
    mount(); await screen.findByText('Employee A'); await userEvent.click(checkButton())
    const dialog = await screen.findByRole('dialog', { name: 'Check pathway and resolve issues' })
    const include = within(dialog).getByRole('button', { name: 'Include' }) as HTMLButtonElement
    expect(include.disabled).toBe(true)
    await act(async () => { include.click() })
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
  })
  it('R14 stale archived Check suppresses repair suggestions', async () => {
    vi.mocked(api.readReviewDetail).mockResolvedValue(reviewFixture('ARCHIVED', true))
    vi.mocked(api.checkReview).mockResolvedValue(reply('b'.repeat(64), 'UNRESOLVED', ['MISSING_PROVIDER:S']))
    mount(); await screen.findByText('Employee A'); await userEvent.click(checkButton())
    const dialog = await screen.findByRole('dialog', { name: 'Check pathway and resolve issues' })
    expect(within(dialog).queryByRole('button', { name: 'Include' })).toBeNull()
  })
  it('R02 natural Vietnamese labels preserve the same disabled lifecycle behavior', async () => {
    language.value = 'vi'; vi.mocked(api.readReviewDetail).mockResolvedValue(reviewFixture('APPROVED'))
    mount(); await screen.findByText('Employee A')
    const button = screen.getByRole('button', { name: vietnamese.initialPathway.approve }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.queryByText('initialPathway.approve')).toBeNull()
  })
  it('R09 fresh detail drift immediately before preview requires a new review and sends no approval', async () => {
    mount(); await screen.findByText('Employee A'); await userEvent.click(checkButton())
    const changed = reviewFixture(); changed.summary.revision = 5; changed.summary.contentHash = 'b'.repeat(64)
    changed.revision.revision = 5; changed.revision.contentHash = changed.summary.contentHash
    vi.mocked(api.readReviewDetail).mockResolvedValue(changed); vi.mocked(api.checkReview).mockResolvedValue(reply('b'.repeat(64)))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm this plan' }))
    await waitFor(() => expect(api.checkReview).toHaveBeenCalledTimes(2))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Confirm this plan' }) as HTMLButtonElement).disabled).toBe(true))
    expect(screen.queryByRole('dialog', { name: 'Review pathway before approval' })).toBeNull()
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
  })
  it.each([true, false])('R06 Remove from Excluded returns to Catalog only while eligible=%s', async eligible => {
    const excluded = reviewFixture(); excluded.revision.overrides = [{ action: 'EXCLUDE', moduleId: 'M-REPAIR', reason: 'earlier exclusion' }]
    if (!eligible) excluded.candidates[0]!.preferredDifficulty = null
    vi.mocked(api.readReviewDetail).mockResolvedValue(excluded)
    mount(); await screen.findByText('Employee A')
    const zone = screen.getByRole('region', { name: 'Excluded Modules' })
    expect((within(zone).getByRole('button', { name: 'Include' }) as HTMLButtonElement).disabled).toBe(!eligible)
    const neutral = structuredClone(excluded); neutral.summary.revision = 5; neutral.revision.revision = 5
    neutral.revision.overrides.push({ action: 'REMOVE', moduleId: 'M-REPAIR', reason: '' })
    vi.mocked(api.readReviewDetail).mockResolvedValue(neutral)
    await userEvent.click(within(zone).getByRole('button', { name: 'Remove module' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Excluded Modules' })).queryByText('M-REPAIR')).toBeNull())
    expect(screen.queryAllByRole('button', { name: 'Add to Pathway' })).toHaveLength(eligible ? 1 : 0)
    expect(vi.mocked(api.sendPathwayCommand).mock.calls[0]![0].path).toMatch(/\/removals$/)
    expect(neutral.revision.overrides.map(o => o.action)).toEqual(['EXCLUDE', 'REMOVE'])
  })
  it('R14 valid cross-list drag expresses Exclude intent with exact current tuple', async () => {
    mount(); await screen.findByText('Employee A')
    const included = screen.getByRole('region', { name: 'Pathway Learning Modules' })
    const transfer = { effectAllowed: '', setData: vi.fn(), getData: () => 'M-A' }
    fireEvent.dragStart(within(included).getAllByRole('listitem')[0]!, { dataTransfer: transfer })
    fireEvent.drop(screen.getByRole('region', { name: 'Excluded Modules' }), { dataTransfer: transfer })
    await waitFor(() => expect(api.checkReview).toHaveBeenCalledTimes(1))
    expect(api.sendPathwayCommand).toHaveBeenCalledTimes(1)
    const command = vi.mocked(api.sendPathwayCommand).mock.calls[0]![0]
    expect(command.path).toMatch(/\/exclusions$/)
    expect(JSON.parse(command.body)).toEqual({ moduleId: 'M-A', expectedRevision: 4, expectedContentHash: 'a'.repeat(64), reason: null })
  })
  it('R14 changed payload and stale drag hash issue no command', async () => {
    mount(); await screen.findByText('Employee A')
    const included = screen.getByRole('region', { name: 'Pathway Learning Modules' })
    const transfer = { effectAllowed: '', setData: vi.fn(), getData: () => 'foreign-payload' }
    fireEvent.dragStart(within(included).getAllByRole('listitem')[0]!, { dataTransfer: transfer })
    fireEvent.drop(screen.getByRole('region', { name: 'Excluded Modules' }), { dataTransfer: transfer })
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
    const oldTransfer = { effectAllowed: '', setData: vi.fn(), getData: () => 'M-A' }
    fireEvent.dragStart(within(included).getAllByRole('listitem')[0]!, { dataTransfer: oldTransfer })
    const changed = reviewFixture(); changed.summary.contentHash = 'b'.repeat(64); changed.revision.contentHash = changed.summary.contentHash
    vi.mocked(api.readReviewDetail).mockResolvedValue(changed); vi.mocked(api.checkReview).mockResolvedValue(reply('b'.repeat(64)))
    await userEvent.click(checkButton()); await waitFor(() => expect(api.readReviewDetail).toHaveBeenCalledTimes(2))
    fireEvent.drop(screen.getByRole('region', { name: 'Excluded Modules' }), { dataTransfer: oldTransfer })
    expect(api.sendPathwayCommand).not.toHaveBeenCalled()
  })
})
