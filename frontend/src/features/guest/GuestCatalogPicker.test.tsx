import { useState } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { GuestCatalogPicker } from './GuestCatalogPicker'
import { branchIds, removeBranch } from './catalogSelection'
import { getPlatformCatalog, parsePlatformCatalog, previewCatalogClosure, type CatalogClosure, type PlatformCatalog } from './platformCatalogApi'

vi.mock('./StarterCatalogGraph', () => ({
  StarterCatalogGraph: ({ ids }: { ids: Set<string> }) => <div data-testid="catalog-graph">{[...ids].join(',')}</div>,
}))
vi.mock('./platformCatalogApi', async importOriginal => ({
  ...await importOriginal<typeof import('./platformCatalogApi')>(), getPlatformCatalog: vi.fn(), previewCatalogClosure: vi.fn(),
}))
const catalog: PlatformCatalog = {
  version: 'v1',
  nodes: [
    { id: 'job', label: 'JobPosition', name: 'Software Engineering', code: 'SWE' },
    { id: 'role', label: 'TargetRole', name: 'Backend Developer', code: 'BE' },
    { id: 'level', label: 'Level', name: 'Junior', code: 'J' },
    { id: 'comp', label: 'Competency', name: 'Databases', code: 'DB' },
    { id: 'skill', label: 'MicroSkill', name: 'SQL Joins', code: 'SQL' },
    { id: 'prereq', label: 'MicroSkill', name: 'SQL Basics', code: 'BASIC' },
  ],
  edges: [
    { id: 'e1', from: 'job', to: 'role', type: 'HAS_ROLE', properties: {} },
    { id: 'e2', from: 'role', to: 'level', type: 'HAS_LEVEL', properties: {} },
    { id: 'e3', from: 'level', to: 'comp', type: 'HAS_COMPETENCY', properties: {} },
    { id: 'e4', from: 'comp', to: 'skill', type: 'HAS_SKILL', properties: {} },
    { id: 'e5', from: 'skill', to: 'prereq', type: 'HAS_SKILL_PREREQUISITE', properties: {} },
  ],
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
async function open() {
  show()
  await userEvent.click(screen.getByRole('button', { name: 'Choose catalog' }))
  await screen.findByRole('button', { name: 'Add Software Engineering' })
  return userEvent.setup()
}
beforeEach(() => {
  localStorage.clear()
  selection = []
  vi.mocked(getPlatformCatalog).mockResolvedValue(catalog)
  vi.mocked(previewCatalogClosure).mockImplementation(async ids => {
    const nodeIds = [...new Set([...ids, ...(ids.includes('skill') ? ['prereq'] : [])])]
    return { templateVersion: 'v1', selected: ids, nodeCount: nodeIds.length, relationshipCount: catalog.edges.filter(e => nodeIds.includes(e.from) && nodeIds.includes(e.to)).length,
      nodesByLabel: {}, nodeIds, edges: [], inclusions: ids.includes('skill') ? [{ nodeId: 'prereq', reason: 'PREREQUISITE', requiredBy: 'skill' }] : [] } satisfies CatalogClosure
  })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('guided starter catalog', () => {
  it('groups selected items by type with collapsible counts and hides display codes', async () => {
    const user = await open()
    expect(screen.queryByText('Job position · SWE')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Add Software Engineering' }))
    await screen.findByText('Will copy 1 job position, 1 target role, 1 competency and 2 micro skills')
    const list = screen.getByRole('list', { name: 'Selected catalog items' })
    expect(list.querySelectorAll('details')).toHaveLength(5)
    const summary = list.querySelector('summary')!
    expect(summary.textContent).toBe('Job position 1')
    await user.click(summary)
    expect(summary.parentElement?.hasAttribute('open')).toBe(false)
    expect(within(list).getAllByText('SQL Basics')).toHaveLength(1)
  })
  it('collapses repeated level names into one row and removes them together', async () => {
    const role2 = { id: 'role2', label: 'TargetRole' as const, name: 'Frontend Developer', code: 'FE' }
    const level2 = { id: 'level2', label: 'Level' as const, name: ' junior ', code: 'J2' }
    vi.mocked(getPlatformCatalog).mockResolvedValue({ ...catalog, nodes: [...catalog.nodes, role2, level2], edges: [...catalog.edges,
      { id: 'e6', from: 'job', to: 'role2', type: 'HAS_ROLE', properties: {} }, { id: 'e7', from: 'role2', to: 'level2', type: 'HAS_LEVEL', properties: {} }] })
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Add Software Engineering' }))
    const list = within(screen.getByRole('list', { name: 'Selected catalog items' }))
    await screen.findByText('2 target roles: Backend Developer, Frontend Developer')
    expect(list.getAllByRole('button', { name: /^Remove .*junior/i })).toHaveLength(1)
    expect(list.queryByText(/across roles|×\d/)).toBeNull()
    await user.click(list.getByRole('button', { name: 'Remove Junior' }))
    await screen.findByText('Will copy 1 job position, 2 target roles, 0 competencies and 0 micro skills')
    await user.click(screen.getByRole('button', { name: 'Apply catalog' }))
    expect([...selection].sort()).toEqual(['job', 'role', 'role2'])
  })

  it('keeps previously shown graph nodes when drilling into a competency', async () => {
    const comp2 = { id: 'comp2', label: 'Competency' as const, name: 'Caching', code: 'CA' }
    vi.mocked(getPlatformCatalog).mockResolvedValue({ ...catalog, nodes: [...catalog.nodes, comp2],
      edges: [...catalog.edges, { id: 'e8', from: 'level', to: 'comp2', type: 'HAS_COMPETENCY', properties: {} }] })
    const user = await open()
    for (const name of ['Software Engineering', 'Backend Developer', 'Junior', 'Databases'])
      await user.click(screen.getByRole('button', { name: `Explore ${name}` }))
    const shown = () => screen.getByTestId('catalog-graph').textContent!.split(',')
    expect(shown()).toEqual(expect.arrayContaining(['comp', 'comp2', 'skill', 'prereq']))
    await user.click(screen.getByRole('button', { name: 'Show current branch only' }))
    expect(shown()).toEqual(expect.arrayContaining(['comp', 'skill']))
    expect(shown()).not.toContain('comp2')
  })

  it('keeps draft edits isolated, applies explicitly and discards cancelled edits', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Add Software Engineering' }))
    await screen.findByText('Will copy 1 job position, 1 target role, 1 competency and 2 micro skills')
    expect(selection).toEqual([])
    expect(screen.getByRole('button', { name: 'Remove SQL Basics' })).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: 'Apply catalog' }))
    expect(selection).toEqual(['job', 'role', 'level', 'comp', 'skill'])
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Edit catalog' }))
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(selection).toHaveLength(5)
  })

  it('prunes children without re-adding them and releases unused prerequisites', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Add Software Engineering' }))
    await screen.findByText('Will copy 1 job position, 1 target role, 1 competency and 2 micro skills')
    await user.click(screen.getByRole('button', { name: 'Remove SQL Joins' }))
    await screen.findByText('Will copy 1 job position, 1 target role, 1 competency and 0 micro skills')
    expect(within(screen.getByRole('list', { name: 'Selected catalog items' })).queryByText('SQL Basics')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Apply catalog' }))
    expect(selection).toEqual(['job', 'role', 'level', 'comp'])
  })

  it('guides into a branch and filters graph/list without changing selection', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Explore Software Engineering' }))
    expect(screen.getByLabelText('Item type')).toHaveProperty('value', 'TargetRole')
    await user.click(screen.getByRole('button', { name: 'Add Backend Developer' }))
    await screen.findByText('Will copy 0 job positions, 1 target role, 1 competency and 2 micro skills')
    await user.type(screen.getByRole('textbox', { name: 'Search catalog items' }), 'no-match')
    expect(screen.getByText('No matching items. Try clearing filters.')).toBeTruthy()
    expect(screen.getByTestId('catalog-graph').textContent).toBe('')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByTestId('catalog-graph').textContent).toContain('skill')
    expect(selection).toEqual([])
  })

  it('keeps a failed preview unapplied and recovers by retry', async () => {
    vi.mocked(previewCatalogClosure).mockRejectedValueOnce(new Error('down'))
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Add Software Engineering' }))
    await screen.findByText('Could not preview this selection. Retry or clear it before applying.')
    expect(screen.getByRole('button', { name: 'Apply catalog' })).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: 'Retry preview' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply catalog' })).toHaveProperty('disabled', false))
  })

  it('reports a catalog failure without destroying the optional empty registration', async () => {
    vi.mocked(getPlatformCatalog).mockRejectedValue(new Error('down'))
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Choose catalog' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Back to registration' }))
    expect(selection).toEqual([])
  })

  it('rejects an oversized branch rather than partially adding it', async () => {
    vi.mocked(getPlatformCatalog).mockResolvedValue({ ...catalog,
      nodes: [...catalog.nodes, ...Array.from({ length: 301 }, (_, i) => ({ id: `s${i}`, label: 'MicroSkill' as const, name: `Skill ${i}`, code: null }))],
      edges: [...catalog.edges, ...Array.from({ length: 301 }, (_, i) => ({ id: `r${i}`, from: 'comp', to: `s${i}`, type: 'HAS_SKILL' as const, properties: {} }))],
    })
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Add Software Engineering' }))
    expect(screen.getByText(/This branch exceeds/)).toBeTruthy()
    expect(previewCatalogClosure).not.toHaveBeenCalled()
    expect(selection).toEqual([])
  })

  it('keeps results beyond the former 60-item cutoff reachable', async () => {
    vi.mocked(getPlatformCatalog).mockResolvedValue({ ...catalog,
      nodes: [...catalog.nodes, ...Array.from({ length: 75 }, (_, i) => ({ id: `extra-${i}`, label: 'MicroSkill' as const, name: `Extra skill ${i}`, code: null }))],
    })
    const user = await open()
    await user.selectOptions(screen.getByLabelText('Item type'), 'MicroSkill')
    expect(screen.queryByRole('button', { name: 'Add Extra skill 65' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getByRole('button', { name: 'Add Extra skill 65' })).toBeTruthy()
  })
})

describe('catalog contracts', () => {
  it('expands branches without learning prerequisite selections and supports explicit pruning', () => {
    expect([...branchIds(catalog, 'job')]).toEqual(['job', 'role', 'level', 'comp', 'skill'])
    expect(removeBranch(catalog, ['job', 'role', 'level', 'comp', 'skill'], 'comp')).toEqual(['job', 'role', 'level'])
  })
  it('rejects excluded labels and drops edges with missing endpoints', () => {
    expect(() => parsePlatformCatalog({ version: 'v', nodes: [{ id: 'a', label: 'LearningModule', name: 'x' }], edges: [] })).toThrow()
    expect(() => parsePlatformCatalog({ version: 'v', nodes: [{ id: 'a', label: 'Certificate', name: 'x' }], edges: [] })).toThrow()
    expect(parsePlatformCatalog({ version: 'v', nodes: [{ id: 'a', label: 'Level', name: 'Junior' }],
      edges: [{ id: 'e', from: 'a', to: 'missing', type: 'HAS_LEVEL', properties: {} }] }).edges).toEqual([])
  })
})
