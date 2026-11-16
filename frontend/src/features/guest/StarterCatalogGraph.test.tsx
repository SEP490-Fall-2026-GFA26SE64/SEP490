import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSet } from 'vis-data'
import type { Edge, Node } from 'vis-network'
import { StarterCatalogGraph } from './StarterCatalogGraph'
import { layoutCatalog, placeNewNodes } from './catalogSelection'
import { nodeLook, readPalette } from './catalogGraphRenderer'
import type { PlatformCatalog } from './platformCatalogApi'

const state = vi.hoisted(() => ({
  data: undefined as { nodes: DataSet<Node>; edges: DataSet<Edge> } | undefined,
  fit: vi.fn(), focus: vi.fn(), selectNodes: vi.fn(), destroy: vi.fn(),
}))
vi.mock('vis-network', () => ({
  Network: class {
    constructor(_container: unknown, data: { nodes: DataSet<Node>; edges: DataSet<Edge> }) { state.data = data }
    on = vi.fn()
    redraw = vi.fn()
    storePositions = vi.fn()
    fit = state.fit
    focus = state.focus
    selectNodes = state.selectNodes
    destroy = state.destroy
  },
}))
const catalog: PlatformCatalog = {
  version: 'test',
  nodes: (['JobPosition', 'TargetRole', 'Level', 'Competency', 'MicroSkill'] as const)
    .map((label, index) => ({ id: `${index}`, name: `Name ${index}`, code: `CODE-${index}`, label })),
  edges: [],
}
const copy = (en: string) => en
beforeEach(() => {
  for (const [index, token] of ['primary', 'secondary', 'muted', 'foreground', 'card', 'success', 'muted-foreground'].entries()) {
    document.documentElement.style.setProperty(`--${token}`, `${index * 40} 50% 50%`)
  }
})
afterEach(() => { cleanup(); document.documentElement.removeAttribute('style'); vi.clearAllMocks(); vi.unstubAllGlobals() })
describe('starter graph updates', () => {
  it('lays types out left to right and orders children by their parent position', () => {
    const tree: PlatformCatalog = { version: 't', nodes: [
      { id: 'jobA', label: 'JobPosition', name: 'A', code: null }, { id: 'jobB', label: 'JobPosition', name: 'B', code: null },
      { id: 'roleOfA', label: 'TargetRole', name: 'Z role', code: null }, { id: 'roleOfB', label: 'TargetRole', name: 'A role', code: null },
    ], edges: [
      { id: 'x', from: 'jobA', to: 'roleOfA', type: 'HAS_ROLE', properties: {} },
      { id: 'y', from: 'jobB', to: 'roleOfB', type: 'HAS_ROLE', properties: {} },
    ] }
    const positions = layoutCatalog(tree, new Set(tree.nodes.map(node => node.id)))
    expect(positions.get('roleOfA')!.x).toBeGreaterThan(positions.get('jobA')!.x)
    expect(positions.get('roleOfA')!.y).toBeLessThan(positions.get('roleOfB')!.y)
  })

  it('renders typed cards with tooltips and restyles selection without rebuilding nodes', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    const linked = { ...catalog, edges: [{ id: 'e', from: '0', to: '1', type: 'HAS_ROLE' as const, properties: {} }] }
    const ids = new Set(catalog.nodes.map(node => node.id))
    const props = { catalog: linked, ids, focused: undefined, onFocus: vi.fn(), copy }
    const view = render(<StarterCatalogGraph {...props} selected={new Set(['0', '1'])} />)
    const { nodes, edges } = state.data!
    expect(nodes.get().every(node => node.shape === 'custom')).toBe(true)
    expect(nodes.get('2')?.title).toBe('Name 2 · Level')
    expect(nodes.get().some(node => String(node.title).includes('CODE-'))).toBe(false)
    expect(edges.get('e')?.width).toBe(1.6)
    const before = nodes.get()
    view.rerender(<StarterCatalogGraph {...props} selected={new Set()} focused={catalog.nodes[1]} />)
    expect(nodes.get()).toEqual(before)
    expect(edges.get('e')?.width).toBe(2.4)
    expect(state.selectNodes).toHaveBeenCalledWith(['1'])
    expect(state.focus).not.toHaveBeenCalled()
    expect(state.fit).not.toHaveBeenCalled()
  })

  it('separates catalog membership, focus and dimming visually', () => {
    const palette = readPalette()
    const base = { inCatalog: false, dimmed: false, focused: false, hover: false }
    const plain = nodeLook('Competency', base, palette)
    const chosen = nodeLook('Competency', { ...base, inCatalog: true }, palette)
    expect(chosen.fill).not.toBe(plain.fill)
    expect([chosen.check, plain.check]).toEqual([true, false])
    expect(nodeLook('Competency', { ...base, dimmed: true }, palette).alpha).toBeLessThan(0.5)
    expect(nodeLook('Competency', { ...base, dimmed: true, hover: true }, palette).alpha).toBe(1)
    expect(nodeLook('Competency', { ...base, focused: true }, palette).halo).toBe(true)
  })

  it('opens new children beside their parent without moving or overlapping existing nodes', () => {
    const tree: PlatformCatalog = { version: 't', nodes: [
      { id: 'lvl', label: 'Level', name: 'L', code: null },
      { id: 'comp', label: 'Competency', name: 'C', code: null }, { id: 'other', label: 'MicroSkill', name: 'O', code: null },
      { id: 's1', label: 'MicroSkill', name: 'S1', code: null }, { id: 's2', label: 'MicroSkill', name: 'S2', code: null },
    ], edges: [
      { id: 'r1', from: 'lvl', to: 's1', type: 'REQUIRES_SKILL', properties: {} }, { id: 'r2', from: 'lvl', to: 's2', type: 'REQUIRES_SKILL', properties: {} },
      { id: 'a', from: 'comp', to: 's1', type: 'HAS_SKILL', properties: {} }, { id: 'b', from: 'comp', to: 's2', type: 'HAS_SKILL', properties: {} },
    ] }
    const existing = new Map([['lvl', { x: -300, y: 0 }], ['comp', { x: 0, y: 0 }], ['other', { x: 300, y: 0 }]])
    const placed = placeNewNodes(tree, new Set(tree.nodes.map(node => node.id)), existing)
    expect([...placed.keys()].sort()).toEqual(['s1', 's2'])
    for (const point of placed.values()) expect(point.x).toBeGreaterThan(0)
    const [first, second] = [...placed.values()]
    expect(first.y).not.toBe(second.y)
    for (const point of placed.values()) expect(Math.hypot(point.x - 300, point.y)).toBeGreaterThan(40)
  })
  it('preserves dragged coordinates and viewport when the visible set changes', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    const props = { catalog, focused: undefined, onFocus: vi.fn(), copy, selected: new Set<string>() }
    const view = render(<StarterCatalogGraph {...props} ids={new Set(['0'])} />)
    state.data!.nodes.update({ id: '0', x: 123, y: 456 })
    view.rerender(<StarterCatalogGraph {...props} ids={new Set(['0', '1'])} />)
    expect(state.data!.nodes.get('0')).toMatchObject({ x: 123, y: 456 })
    expect(state.fit).not.toHaveBeenCalled()
    expect(state.destroy).not.toHaveBeenCalled()
  })
})
