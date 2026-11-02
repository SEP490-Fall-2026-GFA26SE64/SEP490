import { useState } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { GuestCatalogPicker } from './GuestCatalogPicker'
import { getPlatformCatalog, parsePlatformCatalog, previewCatalogClosure, type PlatformCatalog } from './platformCatalogApi'

vi.mock('vis-network', () => ({
  Network: vi.fn(function Network() { return { on: vi.fn(), once: vi.fn(), destroy: vi.fn() } }),
}))
vi.mock('./platformCatalogApi', async importOriginal => ({
  ...await importOriginal<typeof import('./platformCatalogApi')>(),
  getPlatformCatalog: vi.fn(),
  previewCatalogClosure: vi.fn(),
}))

const catalog: PlatformCatalog = {
  version: 'v1',
  nodes: [
    { id: 'occ', label: 'Occupation', name: 'Software Engineering', code: 'SWE' },
    { id: 'role', label: 'TargetRole', name: 'Backend Developer', code: 'BE' },
    { id: 'skill', label: 'MicroSkill', name: 'SQL Joins', code: 'SQL' },
    { id: 'module', label: 'LearningModule', name: 'Relational Queries', code: null },
  ],
  edges: [{ from: 'occ', to: 'role', type: 'HAS_ROLE' }, { from: 'role', to: 'skill', type: 'REQUIRES' }],
}
let selection: string[] = []
function Harness() {
  const [value, setValue] = useState<string[]>([])
  selection = value
  return <GuestCatalogPicker value={value} onChange={setValue} />
}
function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LanguageProvider><Harness /></LanguageProvider>
  </QueryClientProvider>)
}
beforeEach(() => {
  selection = []
  vi.mocked(getPlatformCatalog).mockResolvedValue(catalog)
  vi.mocked(previewCatalogClosure).mockImplementation(async ids => ({
    templateVersion: 'v1', selected: ids, nodeCount: 7, relationshipCount: 9, nodesByLabel: { TargetRole: 1, MicroSkill: 4 },
  }))
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('guest catalog picker', () => {
  it('starts empty and explains that no selection creates an empty catalog', async () => {
    show()
    expect(await screen.findByText('Backend Developer')).toBeTruthy()
    expect(screen.getByText('Nothing selected. Your workspace will start with an empty catalog.')).toBeTruthy()
    expect(screen.getByTestId('catalog-graph')).toBeTruthy()
    expect(previewCatalogClosure).not.toHaveBeenCalled()
  })

  it('adds and removes items and shows the server-computed copy closure', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add Backend Developer' }))
    expect(selection).toEqual(['role'])
    expect((await screen.findByTestId('catalog-closure-summary')).textContent).toBe('7 items and 9 relationships will be copied')
    expect(previewCatalogClosure).toHaveBeenCalledWith(['role'])
    expect(screen.getByRole('button', { name: 'Add Backend Developer' })).toHaveProperty('disabled', true)

    await user.click(screen.getByRole('tab', { name: 'Micro-skills' }))
    await user.click(screen.getByRole('button', { name: 'Add SQL Joins' }))
    expect(selection).toEqual(['role', 'skill'])
    const selected = screen.getByRole('list', { name: 'Selected catalog items' })
    expect(within(selected).getAllByRole('listitem')).toHaveLength(2)

    await user.click(within(selected).getByRole('button', { name: /Remove Backend Developer/ }))
    expect(selection).toEqual(['skill'])
  })

  it('accepts an item dropped onto Your catalog', async () => {
    show()
    await screen.findByText('Backend Developer')
    const zone = screen.getByTestId('catalog-drop-zone')
    const data = { types: ['application/x-adapt-catalog-node'], getData: () => 'role' }
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: data })
    zone.dispatchEvent(drop)
    await waitFor(() => expect(selection).toEqual(['role']))
  })

  it('keeps registration usable when the platform catalog is unavailable', async () => {
    vi.mocked(getPlatformCatalog).mockRejectedValue(new Error('down'))
    show()
    expect(await screen.findByText('The platform catalog is unavailable. You can continue with an empty catalog.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('platform catalog parsing', () => {
  it('rejects unknown labels and drops edges to unknown nodes', () => {
    expect(() => parsePlatformCatalog({ version: 'v', nodes: [{ id: 'a', label: 'Secret', name: 'x' }], edges: [] })).toThrow()
    const parsed = parsePlatformCatalog({ version: 'v', nodes: [{ id: 'a', label: 'MicroSkill', name: 'A', code: null }],
      edges: [{ from: 'a', to: 'missing', type: 'PREREQUISITE' }] })
    expect(parsed.edges).toEqual([])
  })
})