import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import type { PlatformCatalog } from '../../guest/platformCatalogApi'
import { DEFAULT_FILTERS, knowledgeGraphView } from './knowledgeGraphFilters'
import { OrganizationKnowledgeGraphExplorer } from './OrganizationKnowledgeGraphExplorer'
import { fetchOrganizationKnowledgeGraph, KnowledgeGraphApiError, parseOrganizationKnowledgeGraph } from './organizationKnowledgeGraphApi'

vi.mock('../../guest/StarterCatalogGraph', () => ({
  StarterCatalogGraph: ({ ids, selected, onFocus, onExplore }: {
    ids: Set<string>; selected: Set<string>; onFocus: (id: string) => void; onExplore: (id: string) => void
  }) => <div data-testid="graph" data-hits={[...selected].sort().join(',')}>{[...ids].sort().map(id =>
    <button key={id} type="button" onClick={() => onFocus(id)} onDoubleClick={() => onExplore(id)}>node:{id}</button>)}</div>,
}))
vi.mock('./organizationKnowledgeGraphApi', async importOriginal => ({
  ...await importOriginal<typeof import('./organizationKnowledgeGraphApi')>(), fetchOrganizationKnowledgeGraph: vi.fn(),
}))

const edge = (id: string, from: string, to: string, type: PlatformCatalog['edges'][number]['type']) => ({ id, from, to, type, properties: {} })
const graph: PlatformCatalog = {
  version: 'organization',
  nodes: [
    { id: 'job', label: 'JobPosition', name: 'Software Engineering', code: 'SWE' },
    { id: 'job2', label: 'JobPosition', name: 'Data', code: 'DATA' },
    { id: 'role', label: 'TargetRole', name: 'Backend Developer', code: 'BE' },
    { id: 'level', label: 'Level', name: 'Junior', code: 'J' },
    { id: 'comp', label: 'Competency', name: 'Databases', code: 'DB' },
    { id: 'skill', label: 'MicroSkill', name: 'SQL Joins', code: 'SQL', status: 'ACTIVE', reviewStatus: 'APPROVED', description: 'Join tables' },
    { id: 'prereq', label: 'MicroSkill', name: 'SQL Basics', code: 'BASIC' },
    { id: 'other', label: 'MicroSkill', name: 'Pandas', code: 'PD' },
    { id: 'module', label: 'LearningModule', name: 'SQL Course', code: null },
    { id: 'cert', label: 'Certificate', name: 'SQL Certificate', code: null },
  ],
  edges: [
    edge('e1', 'job', 'role', 'HAS_ROLE'), edge('e2', 'role', 'level', 'HAS_LEVEL'), edge('e3', 'level', 'comp', 'HAS_COMPETENCY'),
    edge('e4', 'comp', 'skill', 'HAS_SKILL'), edge('e5', 'skill', 'prereq', 'HAS_SKILL_PREREQUISITE'),
    edge('e6', 'module', 'skill', 'TEACHES'), edge('e7', 'skill', 'cert', 'REQUIRES_CERTIFICATE'),
  ],
}
const fetchGraph = vi.mocked(fetchOrganizationKnowledgeGraph)

describe('parseOrganizationKnowledgeGraph', () => {
  it('keeps all seven node types and nullable fields, and drops dangling relationships', () => {
    const parsed = parseOrganizationKnowledgeGraph({
      nodes: graph.nodes.map(node => ({ ...node, code: node.code ?? null, description: node.description ?? null, status: node.status ?? null, reviewStatus: null })),
      edges: [...graph.edges.map(({ id, from, to, type }) => ({ id, from, to, type })), { id: 'x', from: 'skill', to: 'missing', type: 'TEACHES' }],
    })
    expect(new Set(parsed.nodes.map(node => node.label))).toEqual(new Set(['JobPosition', 'TargetRole', 'Level', 'Competency', 'MicroSkill', 'LearningModule', 'Certificate']))
    expect(parsed.nodes.find(node => node.id === 'module')).toMatchObject({ code: null, description: null, reviewStatus: null })
    expect(parsed.edges.map(item => item.id)).toEqual(graph.edges.map(item => item.id))
  })

  it('rejects unknown node types and relationships', () => {
    expect(() => parseOrganizationKnowledgeGraph({ nodes: [{ id: 'd', label: 'Department', name: 'IT' }], edges: [] })).toThrow(/node type/)
    expect(() => parseOrganizationKnowledgeGraph({ nodes: [], edges: [{ id: 'e', from: 'a', to: 'b', type: 'MEMBER_OF' }] })).toThrow(/relationship/)
  })
})

describe('knowledgeGraphView', () => {
  it('shows everything by default and highlights only search hits', () => {
    expect(knowledgeGraphView(graph, DEFAULT_FILTERS).ids.size).toBe(graph.nodes.length)
    const view = knowledgeGraphView(graph, { ...DEFAULT_FILTERS, query: 'joins' })
    expect([...view.hits]).toEqual(['skill'])
    expect(view.ids).toEqual(new Set(['skill', 'comp', 'level', 'role', 'job', 'prereq', 'module', 'cert']))
  })

  it('limits a scope to its branch with prerequisites, modules and certificates', () => {
    const view = knowledgeGraphView(graph, { ...DEFAULT_FILTERS, scopes: { JobPosition: 'job' } })
    expect(view.ids.has('job2')).toBe(false)
    expect(view.ids.has('other')).toBe(false)
    expect(['prereq', 'module', 'cert'].every(id => view.ids.has(id))).toBe(true)
  })

  it('removes hidden layers even as context', () => {
    const view = knowledgeGraphView(graph, { ...DEFAULT_FILTERS, hidden: new Set(['Competency', 'LearningModule', 'Certificate']) })
    expect(['comp', 'module', 'cert'].some(id => view.ids.has(id))).toBe(false)
    expect(view.ids.has('skill')).toBe(true)
  })
})

describe('OrganizationKnowledgeGraphExplorer', () => {
  beforeEach(() => { fetchGraph.mockReset() })
  afterEach(cleanup)
  const show = (organizationId: string | null = 'org-1') => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LanguageProvider><OrganizationKnowledgeGraphExplorer organizationId={organizationId} /></LanguageProvider>
    </QueryClientProvider>)

  it('renders the organization graph, filters it and inspects a node', async () => {
    fetchGraph.mockResolvedValue(graph)
    show()
    expect(screen.getByRole('status').textContent).toMatch(/loading/i)
    const canvas = await screen.findByTestId('graph')
    expect(fetchGraph).toHaveBeenCalledWith('org-1', expect.anything())
    expect(within(canvas).getAllByRole('button')).toHaveLength(graph.nodes.length)

    await userEvent.type(screen.getByPlaceholderText(/name or code/i), 'pandas')
    expect(screen.getByTestId('graph').dataset.hits).toBe('other')
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }))

    await userEvent.click(screen.getByLabelText(/learning modules/i))
    expect(screen.queryByText('node:module')).toBeNull()

    await userEvent.click(screen.getByText('node:skill'))
    const details = screen.getByTestId('knowledge-graph-details')
    expect(within(details).getByText('SQL Joins')).toBeTruthy()
    expect(within(details).getByText('APPROVED')).toBeTruthy()
    expect(within(details).getByRole('button', { name: 'SQL Basics' })).toBeTruthy()
    expect(within(details).getByRole('button', { name: 'SQL Certificate' })).toBeTruthy()

    await userEvent.dblClick(screen.getByText('node:job'))
    expect(screen.queryByText('node:job2')).toBeNull()
  })

  it('shows access denied without retry for a forbidden response', async () => {
    fetchGraph.mockRejectedValue(new KnowledgeGraphApiError(403, 'Forbidden'))
    show()
    expect((await screen.findByRole('alert')).textContent).toMatch(/access denied/i)
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })

  it('retries after a server failure', async () => {
    fetchGraph.mockRejectedValueOnce(new KnowledgeGraphApiError(503, 'Down')).mockResolvedValueOnce(graph)
    show()
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByTestId('graph')).toBeTruthy())
  })

  it('explains an empty graph and a missing organization', async () => {
    fetchGraph.mockResolvedValue({ version: 'organization', nodes: [], edges: [] })
    show()
    expect(await screen.findByText(/knowledge graph is empty/i)).toBeTruthy()
    cleanup()
    show(null)
    expect(screen.getByRole('alert').textContent).toMatch(/no organization selected/i)
    expect(fetchGraph).toHaveBeenCalledTimes(1)
  })
})
