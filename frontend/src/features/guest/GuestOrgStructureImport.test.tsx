import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { GuestOrgStructureImport, type AppliedOrgStructure } from './GuestOrgStructureImport'
import * as structureApi from './orgStructureApi'
import { buildStructureTemplate } from './orgStructureFile'

vi.mock('./StarterCatalogGraph', () => ({
  StarterCatalogGraph: ({ catalog, onFocus }: { catalog: { nodes: { id: string; name: string }[] }; onFocus: (id: string) => void }) =>
    <div data-testid="catalog-graph">{catalog.nodes.map(node => <button key={node.id} type="button" onClick={() => onFocus(node.id)}>node {node.name}</button>)}</div>,
}))
vi.mock('./orgStructureApi', async importOriginal => ({
  ...await importOriginal<typeof import('./orgStructureApi')>(),
  validateOrganizationStructure: vi.fn(),
}))

const structure: structureApi.OrganizationStructure = {
  departmentCount: 1, jobPositionCount: 1, targetRoleCount: 2, levelCount: 3,
  departments: [{ code: 'ENG', name: 'Engineering', description: 'Builds products', jobPositions: [{ code: 'DEV', name: 'Developer',
    targetRoles: [{ code: 'BE', name: 'Backend Developer', scope: 'Server code', levels: [
      { code: 'L1', name: 'Junior', rank: 1 }, { code: 'L2', name: 'Senior', rank: 2 }] },
    { code: 'FE', name: 'Frontend Developer', scope: 'Web UI', levels: [{ code: 'L2', name: 'junior', rank: 2 }] }] }] }],
}
const workbook = async () => new File([await (await buildStructureTemplate()).xlsx.writeBuffer()], 'org.xlsx')

function renderImport(value: AppliedOrgStructure | null = null) {
  const onChange = vi.fn()
  render(<LanguageProvider><GuestOrgStructureImport value={value} onChange={onChange} /></LanguageProvider>)
  return onChange
}

beforeEach(() => { vi.mocked(structureApi.validateOrganizationStructure).mockResolvedValue(structure) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('GuestOrgStructureImport', () => {
  it('opens with an empty structure and only the organization root, then shows the tree, merged-level graph, root node and counts, and applies only on Apply', async () => {
    const user = userEvent.setup()
    const onChange = renderImport()
    await user.click(screen.getByRole('button', { name: /Import structure/ }))
    expect(screen.getByRole('dialog').className).toContain('max-w-[96vw]')
    expect(screen.getByText('No structure yet. Upload your workbook to see it here.')).toBeTruthy()
    expect(within(screen.getByTestId('catalog-graph')).getAllByRole('button').map(node => node.textContent)).toEqual(['node My organization'])
    expect(within(screen.getByLabelText('Imported structure counts')).getAllByText(/: 0$/)).toHaveLength(4)
    expect(screen.getByRole('button', { name: /Apply structure/ }).hasAttribute('disabled')).toBe(true)
    await user.upload(screen.getByTestId('org-structure-file'), await workbook())
    const tree = await screen.findByRole('tree', {}, { timeout: 15_000 })
    expect(screen.getByRole('dialog').className).toContain('max-w-[96vw]')
    expect(within(tree).getAllByRole('treeitem').map(item => item.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'true', null, null, 'true', null])
    const graph = screen.getByTestId('catalog-graph')
    expect(within(graph).getAllByRole('button').map(node => node.textContent))
      .toEqual(['node My organization', 'node Engineering', 'node Developer', 'node Backend Developer', 'node Junior', 'node Senior', 'node Frontend Developer'])
    expect(screen.getAllByText('2', { selector: '*' }).length).toBeGreaterThan(0)
    await user.click(within(graph).getByRole('button', { name: 'node Junior' }))
    const levelDetail = within(screen.getByRole('list', { name: 'Roles using this level' })).getAllByRole('listitem').map(item => item.textContent)
    expect(levelDetail).toEqual(['Backend Developer · rank 1', 'Frontend Developer · rank 2'])
    await user.click(within(graph).getByRole('button', { name: 'node My organization' }))
    expect(screen.getByTestId('org-structure-detail').textContent).toContain('1 × department')
    await user.type(screen.getByPlaceholderText('Name or code'), 'senior')
    expect(within(tree).getByText('Senior')).toBeTruthy()
    expect(within(tree).queryByText('Junior')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'node Backend Developer' }))
    const detail = screen.getByTestId('org-structure-detail')
    expect(detail.textContent).toContain('BE')
    expect(detail.textContent).toContain('Server code')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Apply structure/ }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'org.xlsx', structure,
      sheets: expect.objectContaining({ departments: [expect.objectContaining({ row: 2, code: 'ENG' }), expect.objectContaining({ row: 3, code: 'QA' })] }) }))
  }, 30_000)

  it('lists server row errors in a focused summary and keeps Apply disabled', async () => {
    vi.mocked(structureApi.validateOrganizationStructure).mockRejectedValue(new structureApi.StructureRejectedError('File has errors',
      [{ sheet: 'Levels', row: 3, column: 'Level rank', message: 'Rank 1 of role BE is already used by level "Junior" (row 2).' }]))
    const user = userEvent.setup()
    renderImport()
    await user.click(screen.getByRole('button', { name: /Import structure/ }))
    await user.upload(screen.getByTestId('org-structure-file'), await workbook())
    const table = await screen.findByTestId('org-structure-errors')
    expect(within(table).getByText('Level rank')).toBeTruthy()
    expect(within(table).getByText('Levels')).toBeTruthy()
    expect(document.activeElement?.getAttribute('role')).toBe('alert')
    expect(screen.getByRole('button', { name: /Apply structure/ }).hasAttribute('disabled')).toBe(true)
  })

  it('reports local file problems without calling the server and cancel keeps the applied structure', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const applied = { fileName: 'old.xlsx', sheets: { departments: [], jobPositions: [], targetRoles: [], levels: [] }, structure }
    const onChange = renderImport(applied)
    expect(screen.getByText(/Imported from old.xlsx/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /View structure/ }))
    await user.upload(screen.getByTestId('org-structure-file'), new File(['a,b'], 'org.csv', { type: 'text/csv' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Upload the .xlsx workbook made from the template.')
    expect(structureApi.validateOrganizationStructure).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Remove/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('offers a retry when the server cannot be reached', async () => {
    vi.mocked(structureApi.validateOrganizationStructure).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(structure)
    const user = userEvent.setup()
    renderImport()
    await user.click(screen.getByRole('button', { name: /Import structure/ }))
    await user.upload(screen.getByTestId('org-structure-file'), await workbook())
    await user.click(await screen.findByRole('button', { name: /Retry check/ }))
    expect(await screen.findByRole('tree')).toBeTruthy()
  })
})
