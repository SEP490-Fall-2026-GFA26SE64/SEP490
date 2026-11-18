import * as React from 'react'
import { AlertTriangle, Building2, Check, ChevronRight, Download, FileSpreadsheet, Layers, MousePointerClick, Network, RefreshCw, Search, Trash2, Upload, Users } from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { StatCard } from '../../shared/components/ui/StatCard'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { useCopy } from '../subscription/SubscriptionFeedback.helpers'
import { CATALOG_LABEL_COPY } from './catalogSelection'
import { downloadStructureTemplate, MAX_STRUCTURE_ROWS, parseStructureFile, StructureFileError, type OrgStructureSheets, type StructureFileProblem } from './orgStructureFile'
import { distinctLevelCount, levelKey, ORGANIZATION_NODE_ID, StructureRejectedError, structureGraph, validateOrganizationStructure, type OrganizationStructure, type StructureRowError } from './orgStructureApi'
import { ORGANIZATION_STRUCTURE_LABELS, type CatalogNode } from './platformCatalogApi'
import { StarterCatalogGraph } from './StarterCatalogGraph'

type Copy = (en: string, vi: string) => string

/** A structure the Guest applied to the registration form; the sheets are re-validated by the server on submit. */
export interface AppliedOrgStructure { fileName: string; sheets: OrgStructureSheets; structure: OrganizationStructure }

type Draft =
  | { state: 'empty' }
  | { state: 'checking'; fileName: string }
  | { state: 'fileProblem'; fileName: string; problem: StructureFileProblem }
  | { state: 'rejected'; fileName: string; message: string; errors: StructureRowError[] }
  | { state: 'unavailable'; fileName: string; sheets: OrgStructureSheets }
  | ({ state: 'ready' } & AppliedOrgStructure)

const ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function problemText(problem: StructureFileProblem, c: Copy): string {
  switch (problem.code) {
    case 'unsupportedType': return c('Upload the .xlsx workbook made from the template.', 'Hãy tải lên tệp .xlsx tạo từ file mẫu.')
    case 'tooLarge': return c('The file is larger than 1 MB.', 'Tệp lớn hơn 1 MB.')
    case 'unreadable': return c('The file could not be read. Save it again as an Excel workbook (.xlsx).', 'Không đọc được tệp. Hãy lưu lại dưới dạng Excel Workbook (.xlsx).')
    case 'empty': return c('The workbook has no data rows.', 'Tệp không có dòng dữ liệu.')
    case 'tooManyRows': return c(`The ${problem.sheet} sheet has ${problem.count} data rows; at most ${MAX_STRUCTURE_ROWS} are allowed.`,
      `Tab ${problem.sheet} có ${problem.count} dòng dữ liệu; tối đa ${MAX_STRUCTURE_ROWS} dòng.`)
    case 'missingSheets': return c(`Missing sheets: ${problem.missing.join(', ')}. Download the template and keep its tabs.`,
      `Thiếu tab: ${problem.missing.join(', ')}. Hãy tải file mẫu và giữ nguyên các tab.`)
    case 'missingColumns': return c(`The ${problem.sheet} sheet is missing columns: ${problem.missing.join(', ')}. Keep the template header row.`,
      `Tab ${problem.sheet} thiếu cột: ${problem.missing.join(', ')}. Hãy giữ dòng tiêu đề của file mẫu.`)
  }
}

function Counts({ structure, c }: { structure: OrganizationStructure; c: Copy }) {
  const items: [string, number][] = [
    [c(...CATALOG_LABEL_COPY.Department), structure.departmentCount], [c(...CATALOG_LABEL_COPY.JobPosition), structure.jobPositionCount],
    [c(...CATALOG_LABEL_COPY.TargetRole), structure.targetRoleCount], [c(...CATALOG_LABEL_COPY.Level), distinctLevelCount(structure)],
  ]
  return <div className="flex flex-wrap gap-2" aria-label={c('Imported structure counts', 'Số lượng cấu trúc đã nhập')}>
    {items.map(([label, value]) => <Badge key={label} variant="outline">{label}: {value}</Badge>)}
  </div>
}

export function GuestOrgStructureImport({ value, onChange }: { value: AppliedOrgStructure | null; onChange: (next: AppliedOrgStructure | null) => void }) {
  const c = useCopy()
  const [open, setOpen] = React.useState(false)
  return <section aria-labelledby="org-structure-title" className="rounded-xl border border-border bg-background p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <Heading level={3} size="card" id="org-structure-title" className="flex items-center gap-2"><Network size={18} aria-hidden="true" />
          {c('Organization structure', 'Cấu trúc tổ chức')}
        </Heading>
        <Text variant="body-sm" className="text-muted-foreground">{value
          ? c(`Imported from ${value.fileName}. It is created in your workspace after payment.`, `Đã nhập từ ${value.fileName}. Cấu trúc được tạo trong workspace sau khi thanh toán.`)
          : c('Import your departments, job positions, target roles and levels from a spreadsheet, or start empty.',
            'Nhập phòng ban, vị trí công việc, vai trò mục tiêu và cấp độ từ bảng tính, hoặc bắt đầu trống.')}</Text>
      </div>
      <div className="flex flex-wrap gap-2">
        {value && <Button type="button" variant="ghost" onClick={() => onChange(null)}><Trash2 size={16} aria-hidden="true" />{c('Remove', 'Gỡ bỏ')}</Button>}
        <Button type="button" variant={value ? 'outline' : 'primary'} onClick={() => setOpen(true)}>
          {value ? c('View structure', 'Xem cấu trúc') : c('Import structure', 'Nhập cấu trúc')}<ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
    {value && <div className="mt-3"><Counts structure={value.structure} c={c} /></div>}
    <Dialog open={open} onOpenChange={setOpen} ariaLabel={c('Import organization structure', 'Nhập cấu trúc tổ chức')} size="wide"
      className="h-[94dvh] max-h-[94dvh] max-w-[96vw] gap-0 p-3 sm:p-5" containerClassName="p-2 sm:p-3">
      {open && <ImportWorkspace value={value} onApply={next => { onChange(next); setOpen(false) }} onCancel={() => setOpen(false)} c={c} />}
    </Dialog>
  </section>
}

function ImportWorkspace({ value, onApply, onCancel, c }: {
  value: AppliedOrgStructure | null; onApply: (next: AppliedOrgStructure) => void; onCancel: () => void; c: Copy
}) {
  const [draft, setDraft] = React.useState<Draft>(value ? { state: 'ready', ...value } : { state: 'empty' })
  const [templateError, setTemplateError] = React.useState(false)
  const input = React.useRef<HTMLInputElement>(null)
  const request = React.useRef<AbortController | null>(null)
  React.useEffect(() => () => request.current?.abort(), [])

  async function check(fileName: string, sheets: OrgStructureSheets) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setDraft({ state: 'checking', fileName })
    try {
      const structure = await validateOrganizationStructure(sheets, controller.signal)
      if (!controller.signal.aborted) setDraft({ state: 'ready', fileName, sheets, structure })
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof StructureRejectedError) setDraft({ state: 'rejected', fileName, message: error.message, errors: error.rowErrors })
      else setDraft({ state: 'unavailable', fileName, sheets })
    }
  }

  async function choose(file: File | undefined) {
    if (!file) return
    setDraft({ state: 'checking', fileName: file.name })
    try {
      await check(file.name, await parseStructureFile(file))
    } catch (error) {
      if (error instanceof StructureFileError) setDraft({ state: 'fileProblem', fileName: file.name, problem: error.problem })
      else setDraft({ state: 'fileProblem', fileName: file.name, problem: { code: 'unreadable' } })
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function template() {
    setTemplateError(false)
    try { await downloadStructureTemplate() } catch (error) { console.error('Structure template failed', error); setTemplateError(true) }
  }

  const fileName = draft.state === 'empty' ? null : draft.fileName
  return <>
    <DialogHeader className="mb-3">
      <DialogTitle><Network size={20} aria-hidden="true" />{c('Import your organization structure', 'Nhập cấu trúc tổ chức của bạn')}</DialogTitle>
      <Text variant="body-sm" className="text-muted-foreground">{c('Upload the Excel workbook made from the template. Its Instructions tab explains how to fill it.',
        'Tải lên workbook Excel tạo từ file mẫu. Tab Instructions trong file hướng dẫn cách điền.')}</Text>
    </DialogHeader>
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-2">
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" id="org-structure-file" data-testid="org-structure-file"
        onChange={event => void choose(event.target.files?.[0])} />
      <Button type="button" size="sm" disabled={draft.state === 'checking'} onClick={() => input.current?.click()}>
        <Upload size={14} aria-hidden="true" />{fileName ? c('Replace file', 'Thay tệp') : c('Upload workbook (.xlsx)', 'Tải lên workbook (.xlsx)')}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void template()}><Download size={14} aria-hidden="true" />{c('Download template', 'Tải file mẫu')}</Button>
      {fileName && <span className="inline-flex min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground">
        <FileSpreadsheet size={14} aria-hidden="true" /><span className="truncate" data-testid="org-structure-file-name">{fileName}</span></span>}
      {templateError && <span role="alert" className="text-caption text-destructive">{c('The template could not be generated. Retry.', 'Chưa tạo được file mẫu. Hãy thử lại.')}</span>}
    </div>
    <div className="flex min-h-0 flex-1 flex-col">
      {draft.state === 'empty' && <StructureView structure={EMPTY_STRUCTURE} c={c} />}
      {draft.state === 'checking' && <p role="status" className="flex flex-1 items-center justify-center gap-2 p-6 text-body-sm text-muted-foreground">
        <RefreshCw size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />{c('Reading and checking your file...', 'Đang đọc và kiểm tra tệp...')}</p>}
      {draft.state === 'fileProblem' && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 bg-card p-4">
        <Heading level={4} size="card" className="flex items-center gap-2 text-destructive"><AlertTriangle size={16} aria-hidden="true" />{c('This file cannot be imported', 'Không thể nhập tệp này')}</Heading>
        <Text variant="body-sm">{problemText(draft.problem, c)}</Text>
      </div>}
      {draft.state === 'rejected' && <RowErrors errors={draft.errors} c={c} />}
      {draft.state === 'unavailable' && <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-card p-4">
        <Text>{c('The structure could not be checked right now. Your applied structure has not changed.', 'Chưa kiểm tra được cấu trúc. Cấu trúc đã áp dụng không thay đổi.')}</Text>
        <Button type="button" variant="outline" onClick={() => void check(draft.fileName, draft.sheets)}><RefreshCw size={14} aria-hidden="true" />{c('Retry check', 'Kiểm tra lại')}</Button>
      </div>}
      {draft.state === 'ready' && <StructureView structure={draft.structure} c={c} />}
    </div>
    <DialogFooter className="mt-2 pt-3">
      <Button type="button" variant="outline" onClick={onCancel}>{c('Cancel', 'Hủy')}</Button>
      <Button type="button" disabled={draft.state !== 'ready'}
        onClick={() => { if (draft.state === 'ready') onApply({ fileName: draft.fileName, sheets: draft.sheets, structure: draft.structure }) }}>
        {c('Apply structure', 'Áp dụng cấu trúc')}<Check size={16} aria-hidden="true" />
      </Button>
    </DialogFooter>
  </>
}

function RowErrors({ errors, c }: { errors: StructureRowError[]; c: Copy }) {
  const summary = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => { summary.current?.focus() }, [errors])
  return <div ref={summary} tabIndex={-1} role="alert" aria-labelledby="org-structure-errors-title"
    className="flex min-h-0 flex-1 flex-col gap-2 rounded-lg border border-destructive/30 bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Heading level={4} size="card" id="org-structure-errors-title" className="flex items-center gap-2 text-destructive">
      <AlertTriangle size={16} aria-hidden="true" />{c(`${errors.length} problem${errors.length === 1 ? '' : 's'} found. Nothing was imported.`, `Phát hiện ${errors.length} lỗi. Chưa nhập dữ liệu nào.`)}
    </Heading>
    <Text variant="body-sm" className="text-muted-foreground">{c('Fix these cells in your workbook and upload it again.', 'Sửa các ô này trong workbook rồi tải lên lại.')}</Text>
    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-body-sm" data-testid="org-structure-errors">
        <thead className="sticky top-0 bg-muted text-caption uppercase text-muted-foreground"><tr>
          <th scope="col" className="px-3 py-2">{c('Sheet', 'Tab')}</th>
          <th scope="col" className="hidden px-3 py-2 sm:table-cell">{c('Row', 'Dòng')}</th>
          <th scope="col" className="hidden px-3 py-2 sm:table-cell">{c('Column', 'Cột')}</th>
          <th scope="col" className="px-3 py-2">{c('Problem', 'Vấn đề')}</th>
        </tr></thead>
        <tbody>{errors.map((error, index) => <tr key={index} className="border-t border-border align-top">
          <td className="px-3 py-2 font-medium">{error.sheet ?? c('Workbook', 'Workbook')}
            {/* Small screens fold row and column into the sheet cell so the message keeps a readable width. */}
            <span className="block text-caption font-normal text-muted-foreground sm:hidden">
              {[error.row > 0 ? c(`Row ${error.row}`, `Dòng ${error.row}`) : null, error.column].filter(Boolean).join(' · ')}</span></td>
          <td className="hidden px-3 py-2 sm:table-cell">{error.row > 0 ? error.row : '—'}</td>
          <td className="hidden px-3 py-2 sm:table-cell">{error.column ?? '—'}</td><td className="px-3 py-2">{error.message}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>
}

/** Shown before a workbook is uploaded: zero counts, an empty tree and only the organization root in the graph. */
const EMPTY_STRUCTURE: OrganizationStructure = { departmentCount: 0, jobPositionCount: 0, targetRoleCount: 0, levelCount: 0, departments: [] }

type TreeItem = { node: CatalogNode; children: TreeItem[]; detail: string | null; rank?: number }
type LevelUse = { role: string; code: string; rank: number }

function treeOf(structure: OrganizationStructure, graph: ReturnType<typeof structureGraph>): TreeItem[] {
  const byId = new Map(graph.nodes.map(node => [node.id, node]))
  return structure.departments.map(d => ({ node: byId.get(`department:${d.code}`)!, detail: d.description,
    children: d.jobPositions.map(j => ({ node: byId.get(`job:${j.code}`)!, detail: null,
      children: j.targetRoles.map(r => ({ node: byId.get(`role:${r.code}`)!, detail: r.scope,
        children: r.levels.map(l => ({ node: byId.get(levelKey(l.name))!, detail: null, rank: l.rank, children: [] })) })) })) }))
}

function matches(item: TreeItem, query: string): boolean {
  return !query || `${item.node.name} ${item.node.code ?? ''}`.toLowerCase().includes(query) || item.children.some(child => matches(child, query))
}

function StructureView({ structure, c }: { structure: OrganizationStructure; c: Copy }) {
  const organizationName = c('My organization', 'Tổ chức của tôi')
  const graph = React.useMemo(() => structureGraph(structure, organizationName), [structure, organizationName])
  const tree = React.useMemo(() => treeOf(structure, graph), [structure, graph])
  const details = React.useMemo(() => {
    const map = new Map<string, TreeItem>()
    const walk = (items: TreeItem[]) => items.forEach(item => { map.set(item.node.id, item); walk(item.children) })
    walk(tree)
    map.set(ORGANIZATION_NODE_ID, { node: graph.nodes[0], children: tree, detail: null })
    return map
  }, [tree, graph])
  // A merged level node lists every target role that uses the level name, with that role's rank.
  const levelUses = React.useMemo(() => {
    const uses = new Map<string, LevelUse[]>()
    for (const r of structure.departments.flatMap(d => d.jobPositions.flatMap(j => j.targetRoles)))
      for (const l of r.levels) uses.set(levelKey(l.name), [...(uses.get(levelKey(l.name)) ?? []), { role: r.name, code: r.code, rank: l.rank }])
    return uses
  }, [structure])
  const ids = React.useMemo(() => new Set(graph.nodes.map(node => node.id)), [graph])
  const none = React.useMemo(() => new Set<string>(), [])
  const [focusedId, setFocusedId] = React.useState<string>()
  const [query, setQuery] = React.useState('')
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [mobileView, setMobileView] = React.useState<'tree' | 'graph'>('tree')
  const focused = focusedId ? details.get(focusedId) : undefined
  const needle = query.trim().toLowerCase()
  const toggle = (id: string) => setCollapsed(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const panel = (key: 'tree' | 'graph') => `${mobileView === key ? 'flex' : 'hidden'} min-h-0 flex-col lg:flex`

  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="md:hidden"><Counts structure={structure} c={c} /></div>
    <div className="hidden grid-cols-4 gap-2 md:grid">
      <StatCard title={c(...CATALOG_LABEL_COPY.Department)} value={structure.departmentCount} icon={<Building2 size={14} aria-hidden="true" />} />
      <StatCard title={c(...CATALOG_LABEL_COPY.JobPosition)} value={structure.jobPositionCount} icon={<Users size={14} aria-hidden="true" />} />
      <StatCard title={c(...CATALOG_LABEL_COPY.TargetRole)} value={structure.targetRoleCount} icon={<Network size={14} aria-hidden="true" />} />
      <StatCard title={c(...CATALOG_LABEL_COPY.Level)} value={distinctLevelCount(structure)} icon={<Layers size={14} aria-hidden="true" />} />
    </div>
    <div role="group" aria-label={c('Structure panels', 'Khu vực cấu trúc')} className="flex gap-1 rounded-lg bg-muted p-1 lg:hidden">
      {(['tree', 'graph'] as const).map(key => <Button key={key} type="button" size="sm" variant={mobileView === key ? 'primary' : 'ghost'}
        aria-pressed={mobileView === key} className="flex-1" onClick={() => setMobileView(key)}>{key === 'tree' ? c('Structure', 'Cấu trúc') : c('Graph', 'Graph')}</Button>)}
    </div>
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
      <aside className={`${panel('tree')} gap-2 overflow-hidden rounded-lg border border-border bg-background p-3`}>
        <label className="relative block"><span className="sr-only">{c('Search structure', 'Tìm trong cấu trúc')}</span>
          <Search size={16} aria-hidden="true" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={c('Name or code', 'Tên hoặc mã')} className="pl-8" />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ul role="tree" aria-label={c('Imported organization structure', 'Cấu trúc tổ chức đã nhập')} className="space-y-0.5">
            {tree.filter(item => matches(item, needle)).map(item => <TreeRow key={item.node.id} item={item} depth={0} needle={needle}
              collapsed={collapsed} toggle={toggle} focusedId={focusedId} onFocus={setFocusedId} c={c} />)}
          </ul>
          {!tree.length ? <Text variant="body-sm" className="py-4 text-muted-foreground">{c('No structure yet. Upload your workbook to see it here.', 'Chưa có cấu trúc. Hãy tải workbook lên để xem tại đây.')}</Text>
            : !tree.some(item => matches(item, needle)) && <Text variant="body-sm" className="py-4 text-muted-foreground">{c('No matching items.', 'Không có mục phù hợp.')}</Text>}
        </div>
      </aside>
      <div className={`${panel('graph')} gap-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level={3} size="card" className="flex items-center gap-2"><Network size={16} aria-hidden="true" />{c('Structure graph', 'Graph cấu trúc')}</Heading>
          <Text variant="caption" className="hidden items-center gap-1 text-muted-foreground xl:inline-flex"><MousePointerClick size={14} aria-hidden="true" />
            {c('Click a node to inspect it · scroll to zoom', 'Nhấn node để xem chi tiết · cuộn để phóng to')}</Text>
        </div>
        <StarterCatalogGraph catalog={graph} ids={ids} selected={none} focused={focused?.node} onFocus={setFocusedId}
          onClearFocus={() => setFocusedId(undefined)} copy={c} labels={ORGANIZATION_STRUCTURE_LABELS} readOnly showPrerequisiteLegend={false}
          ariaLabel={c('Imported organization structure graph. Arrow keys pan, plus and minus zoom. Use the structure list for keyboard navigation.',
            'Graph cấu trúc tổ chức đã nhập. Phím mũi tên để di chuyển, cộng/trừ để phóng to. Dùng danh sách cấu trúc để thao tác bằng bàn phím.')} />
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-sm" data-testid="org-structure-detail">
          {focused ? <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2"><Heading level={4} size="card" className="break-words">{focused.node.name}</Heading>
              <Badge variant="outline">{c(...CATALOG_LABEL_COPY[focused.node.label])}</Badge>
              {focused.node.code && <Badge variant="secondary">{focused.node.code}</Badge>}
</div>
            {focused.detail && <Text variant="body-sm" className="whitespace-pre-line text-muted-foreground">{focused.detail}</Text>}
            {focused.node.label === 'Level' && <ul aria-label={c('Target roles using this level', 'Vai trò mục tiêu dùng cấp độ này')} className="flex flex-wrap gap-1.5">
              {(levelUses.get(focused.node.id) ?? []).map(use => <li key={use.code}><Badge variant="secondary">{use.role} · {c(`rank ${use.rank}`, `hạng ${use.rank}`)}</Badge></li>)}</ul>}
            {focused.children.length > 0 && <Text variant="caption" className="text-muted-foreground">
              {c(`${focused.children.length} × ${CATALOG_LABEL_COPY[focused.children[0].node.label][0].toLowerCase()}`,
                `${focused.children.length} × ${CATALOG_LABEL_COPY[focused.children[0].node.label][1].toLowerCase()}`)}</Text>}
          </div> : <Text variant="body-sm" className="text-muted-foreground">{c('Select a node or a structure item to see its code, description and levels.',
            'Chọn node hoặc mục trong cấu trúc để xem mã, mô tả và cấp độ.')}</Text>}
        </div>
      </div>
    </div>
  </div>
}

function TreeRow({ item, depth, needle, collapsed, toggle, focusedId, onFocus, c }: {
  item: TreeItem; depth: number; needle: string; collapsed: Set<string>; toggle: (id: string) => void
  focusedId: string | undefined; onFocus: (id: string) => void; c: Copy
}) {
  const children = item.children.filter(child => matches(child, needle))
  // Searching always reveals matching descendants.
  const open = !!needle || !collapsed.has(item.node.id)
  const selected = focusedId === item.node.id
  return <li role="treeitem" aria-expanded={item.children.length ? open : undefined} aria-selected={selected}>
    <div className={`flex items-center gap-1 rounded-md pr-1 ${selected ? 'bg-secondary' : 'hover:bg-muted'}`} style={{ paddingLeft: `${depth * 14}px` }}>
      {item.children.length ? <Button type="button" size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" aria-expanded={open}
        aria-label={open ? c(`Collapse ${item.node.name}`, `Thu gọn ${item.node.name}`) : c(`Expand ${item.node.name}`, `Mở rộng ${item.node.name}`)}
        onClick={() => toggle(item.node.id)}><ChevronRight size={14} aria-hidden="true" className={open ? 'rotate-90 transition-transform motion-reduce:transition-none' : 'transition-transform motion-reduce:transition-none'} /></Button>
        : <span className="w-7 shrink-0" aria-hidden="true" />}
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onFocus(item.node.id)}>
        <span className="min-w-0 flex-1 truncate"><span className="font-medium text-foreground">{item.node.name}</span>
          {item.rank !== undefined ? <span className="ml-1 text-caption text-muted-foreground">· {c(`rank ${item.rank}`, `hạng ${item.rank}`)}</span>
            : item.node.code && <span className="ml-1 text-caption text-muted-foreground">· {item.node.code}</span>}</span>
        <span className="shrink-0 text-caption text-muted-foreground">{c(...CATALOG_LABEL_COPY[item.node.label])}</span>
      </button>
    </div>
    {open && children.length > 0 && <ul role="group" className="space-y-0.5">
      {children.map(child => <TreeRow key={child.node.id} item={child} depth={depth + 1} needle={needle} collapsed={collapsed}
        toggle={toggle} focusedId={focusedId} onFocus={onFocus} c={c} />)}
    </ul>}
  </li>
}
