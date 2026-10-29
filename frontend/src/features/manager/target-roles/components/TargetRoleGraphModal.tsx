import {
  AlertCircle,
  Eye,
  Filter,
  GitBranch,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as React from 'react'
import { Network, type Options, type Node, type Edge } from 'vis-network'
import { fetchTargetRoleGraph, type TargetRoleGraphDto, type TargetRoleGraphSkillDto } from '../../../../shared/api/prerequisiteApi'
import { fetchCompetencies, type CompetencyDto } from '../../../../shared/api/competencyApi'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import { Dialog } from '../../../../shared/components/ui/Dialog'
import { getActiveCompany } from '../../../../shared/stores/companyStore'
import {
  type SkillTargetConfig,
  type TargetRoleModel,
} from '../../data/ldManagerMockData'

interface TargetRoleGraphModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string | null
  organizationId: string
  roleTitle?: string
  levels?: string[]
  role?: TargetRoleModel | null
  skillTargets?: SkillTargetConfig[]
}

export interface RoleNodeData {
  category: 'TargetRole'
  code: string
  title: string
  levels?: string
  track?: string
  seniority?: string
  status: string
}

export interface LevelNodeData {
  category: 'Level'
  code: string
  title: string
  status: string
  rank?: number
}

export interface CompetencyNodeData {
  category: 'Competency'
  code: string
  name: string
  description?: string
  status: string
  memberSkillCount?: number
}

export interface SkillNodeData {
  category: 'MicroSkill'
  skillId: string
  code: string
  name: string
  macroCompetencyCode: string
  targetMastery: number
  status: string
  level?: string
}

export type GraphElementNodeData = RoleNodeData | LevelNodeData | CompetencyNodeData | SkillNodeData

interface GraphCustomNode extends Node {
  data?: GraphElementNodeData
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class GraphModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TargetRoleGraphModal ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4 bg-background h-full w-full">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Graph Rendering Error</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {this.state.error?.message || 'Unable to display visual graph for the current configuration.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </Button>
            <Button variant="primary" size="sm" onClick={this.props.onClose}>
              Close
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export const extractCleanRoleCode = (raw?: string | null): string => {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  return trimmed.split('#')[0].trim() || trimmed
}

export function TargetRoleGraphModal({
  open,
  onOpenChange,
  roleId,
  organizationId,
  roleTitle,
  levels: propLevels,
  role,
  skillTargets,
}: TargetRoleGraphModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [graphData, setGraphData] = React.useState<TargetRoleGraphDto | null>(null)
  const [selectedNode, setSelectedNode] = React.useState<GraphElementNodeData | null>(null)
  const [allCompetencies, setAllCompetencies] = React.useState<CompetencyDto[]>([])
  const [layoutMode, setLayoutMode] = React.useState<'hierarchical' | 'organic'>('hierarchical')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [selectedLevelFilter, setSelectedLevelFilter] = React.useState<string>('ALL')
  const [searchQuery, setSearchQuery] = React.useState<string>('')

  const containerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)
  const currentNodesRef = React.useRef<GraphCustomNode[]>([])

  const activeCompany = getActiveCompany()
  const currentRole =
    role ||
    activeCompany?.targetRoles?.find((r) => r.id === roleId || r.code === roleId)

  const effectiveLevels =
    propLevels && propLevels.length > 0
      ? propLevels
      : currentRole?.levels && currentRole.levels.length > 0
      ? currentRole.levels
      : ['Junior', 'Middle', 'Senior']

  const handleSearchFocus = React.useCallback(() => {
    if (!networkRef.current || !searchQuery.trim()) return
    const q = searchQuery.toLowerCase().trim()
    const matched = currentNodesRef.current.find((n) => {
      const code = n.data?.code?.toLowerCase() || ''
      const titleOrName = (
        n.data && 'title' in n.data
          ? (n.data as { title?: string }).title
          : n.data && 'name' in n.data
          ? (n.data as { name?: string }).name
          : ''
      )?.toLowerCase() || ''
      const idStr = n.id !== undefined && n.id !== null ? n.id.toString().toLowerCase() : ''
      return code.includes(q) || titleOrName.includes(q) || idStr.includes(q)
    })
    if (matched && matched.id !== undefined) {
      networkRef.current.selectNodes([matched.id])
      networkRef.current.focus(matched.id, {
        scale: 1.25,
        animation: { duration: 400, easingFunction: 'easeInOutQuad' },
      })
      if (matched.data) {
        setSelectedNode(matched.data)
      }
    }
  }, [searchQuery])

  const loadGraph = React.useCallback(async () => {
    if (!roleId || !organizationId) return
    setLoading(true)
    setError(null)
    setSelectedNode(null)
    setSelectedLevelFilter('ALL')
    setSearchQuery('')
    try {
      const [backendData, comps] = await Promise.all([
        fetchTargetRoleGraph(organizationId, roleId).catch(() => null),
        fetchCompetencies(organizationId).catch(() => []),
      ])

      const fetchedComps = comps || []
      setAllCompetencies(fetchedComps)

      const activeCompany = getActiveCompany()
      const currentRole =
        role ||
        activeCompany?.targetRoles?.find((r) => r.id === roleId || r.code === roleId)

      // Primary source of truth for assigned skills and their levels is the configured skillTargets
      const rawTargets =
        skillTargets && skillTargets.length > 0
          ? skillTargets
          : (currentRole?.skillTargets || [])

      let requiredSkills: TargetRoleGraphSkillDto[] = []

      if (rawTargets.length > 0) {
        requiredSkills = rawTargets.map((st: SkillTargetConfig, sIdx: number) => {
          const rawSkillId = st.skillId || st.skillCode || `skill-${sIdx}`
          const matchedC = fetchedComps.find(
            (c) =>
              c.skillIds?.includes(rawSkillId) ||
              c.skillIds?.includes(st.skillCode || '') ||
              c.code === rawSkillId ||
              c.id === rawSkillId
          )
          const backendSkill = backendData?.requiredSkills?.find(
            (bs) => bs.skillId === rawSkillId || (st.skillCode && bs.skillCode === st.skillCode)
          )
          return {
            skillId: rawSkillId,
            skillCode: st.skillCode || rawSkillId,
            skillName: st.skillName || backendSkill?.skillName || rawSkillId,
            macroCompetencyCode: backendSkill?.macroCompetencyCode || matchedC?.id || matchedC?.code || 'KNOWLEDGE',
            targetMastery: (st.threshold || 80) / 100,
            status: backendSkill?.status || 'ACTIVE',
            level: st.level || backendSkill?.level,
          }
        })
      } else if (backendData && Array.isArray(backendData.requiredSkills) && backendData.requiredSkills.length > 0) {
        requiredSkills = backendData.requiredSkills
      }

      const resolvedRoleCode = extractCleanRoleCode(backendData?.roleCode || currentRole?.code || roleId)
      setGraphData({
        roleId: backendData?.roleId || currentRole?.id || roleId,
        roleCode: resolvedRoleCode,
        roleName: backendData?.roleName || currentRole?.title || roleTitle || 'Target Role',
        track: backendData?.track || currentRole?.track || 'PROFESSIONAL',
        seniority: backendData?.seniority || currentRole?.seniority || 'P3',
        status: (backendData?.status || currentRole?.status || 'DRAFT').toUpperCase(),
        requiredSkills,
        prerequisites: backendData && Array.isArray(backendData.prerequisites) ? backendData.prerequisites : [],
      })
    } catch (err) {
      console.error('Failed to load target role graph:', err)
      setError('Target role graph could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [roleId, organizationId, role, skillTargets, roleTitle])

  React.useEffect(() => {
    if (open && roleId) {
      loadGraph()
    } else {
      setGraphData(null)
      setSelectedNode(null)
    }
  }, [open, roleId, loadGraph])

  // Initialize or update vis-network
  React.useEffect(() => {
    if (!graphData || !containerRef.current || loading) return

    const nodes: GraphCustomNode[] = []
    const edges: Edge[] = []
    const seenNodeIds = new Set<string>()
    const seenEdgeIds = new Set<string>()

    const addNodeSafely = (node: GraphCustomNode) => {
      if (!node || node.id === undefined || node.id === null) return
      const idStr = String(node.id).trim()
      if (!idStr || seenNodeIds.has(idStr)) return
      seenNodeIds.add(idStr)
      nodes.push({ ...node, id: idStr })
    }

    const addEdgeSafely = (edge: Edge) => {
      if (!edge || edge.id === undefined || edge.id === null || !edge.from || !edge.to) return
      const edgeIdStr = String(edge.id).trim()
      if (!edgeIdStr || seenEdgeIds.has(edgeIdStr)) return
      seenEdgeIds.add(edgeIdStr)
      edges.push({ ...edge, id: edgeIdStr })
    }

    const reqSkills = Array.isArray(graphData.requiredSkills) ? graphData.requiredSkills : []
    const prereqs = Array.isArray(graphData.prerequisites) ? graphData.prerequisites : []

    // 1. Role root node - only show the role code (no organization or version)
    addNodeSafely({
      id: `role-${graphData.roleId}`,
      label: `<b>${extractCleanRoleCode(graphData.roleCode || graphData.roleId)}</b>`,
      shape: 'box',
      shapeProperties: { borderRadius: 8 },
      margin: { top: 12, right: 16, bottom: 12, left: 16 },
      widthConstraint: { maximum: 200 },
      level: 0,
      color: {
        background: '#FFF7ED',
        border: '#EA580C',
        highlight: { background: '#FFEDD5', border: '#C2410C' },
        hover: { background: '#FFEDD5', border: '#EA580C' },
      },
      font: {
        multi: 'html',
        color: '#0F172A',
        size: 13,
        face: 'IBM Plex Sans, sans-serif',
      },
      borderWidth: 2,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.08)', size: 6, x: 0, y: 3 },
      data: {
        category: 'TargetRole',
        code: graphData.roleCode,
        title: graphData.roleName,
        track: graphData.track,
        seniority: graphData.seniority,
        status: graphData.status,
      },
    })

    // 2. Proficiency Level nodes connected to TargetRole
    const activeComp = getActiveCompany()
    const currentRole =
      role ||
      activeComp?.targetRoles?.find((r) => r.id === roleId || r.code === roleId)

    const effectiveLevels =
      propLevels && propLevels.length > 0
        ? propLevels
        : currentRole?.levels && currentRole.levels.length > 0
        ? currentRole.levels
        : ['Junior', 'Middle', 'Senior']

    const isLevelFiltered = selectedLevelFilter !== 'ALL' && selectedLevelFilter !== ''
    const displayedLevels = isLevelFiltered
      ? (effectiveLevels as string[]).filter((lvl) => lvl.toLowerCase() === selectedLevelFilter.toLowerCase())
      : (effectiveLevels as string[])

    const levelNodeIds: string[] = []
    const levelMap: Record<string, string> = {}
    displayedLevels.forEach((lvlName: string, idx: number) => {
      const origIdx = (effectiveLevels as string[]).indexOf(lvlName)
      const rankIdx = origIdx !== -1 ? origIdx + 1 : idx + 1
      const lvlId = `level-${graphData.roleId}-${rankIdx}`
      levelNodeIds.push(lvlId)
      levelMap[lvlName.toLowerCase()] = lvlId

      addNodeSafely({
        id: lvlId,
        label: `<b>${lvlName}</b>`,
        shape: 'box',
        shapeProperties: { borderRadius: 10 },
        margin: { top: 8, right: 14, bottom: 8, left: 14 },
        widthConstraint: { maximum: 160 },
        level: 1,
        color: {
          background: '#EEF2FF',
          border: '#4F46E5',
          highlight: { background: '#E0E7FF', border: '#4338CA' },
          hover: { background: '#E0E7FF', border: '#4F46E5' },
        },
        font: {
          multi: 'html',
          color: '#1E1B4B',
          size: 11,
          face: 'IBM Plex Sans, sans-serif',
        },
        borderWidth: 1.5,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.05)', size: 4, x: 0, y: 2 },
        data: {
          category: 'Level',
          code: `LEVEL-${rankIdx}`,
          title: `${lvlName} (Rank ${rankIdx})`,
          status: 'ACTIVE',
          rank: rankIdx,
        },
      })

      // Directed edge: (:TargetRole)-[:HAS_LEVEL]->(:Level)
      addEdgeSafely({
        id: `has-level-${graphData.roleId}-${lvlId}`,
        from: `role-${graphData.roleId}`,
        to: lvlId,
        label: 'HAS_LEVEL',
        font: { size: 9, color: '#4F46E5', align: 'horizontal' },
        color: { color: '#818CF8', highlight: '#4F46E5', hover: '#4338CA' },
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        dashes: false,
        width: 1.5,
      })
    })

    // 3. Competency nodes connected to Level nodes
    const roleCompIds = new Set<string>()
    if (isLevelFiltered) {
      const matchedKey = Object.keys(currentRole?.levelCompetencies || {}).find(
        (k) => k.toLowerCase() === selectedLevelFilter.toLowerCase()
      )
      const lvlComps = matchedKey ? currentRole?.levelCompetencies?.[matchedKey] || [] : []
      lvlComps.forEach((cid: string) => roleCompIds.add(cid))

      // If no explicit level-specific competencies exist, fall back to currentRole.competencyIds
      if (roleCompIds.size === 0 && (currentRole?.competencyIds || []).length > 0) {
        ;(currentRole?.competencyIds || []).forEach((cid: string) => roleCompIds.add(cid))
      }
    } else {
      ;(currentRole?.competencyIds || []).forEach((cid: string) => roleCompIds.add(cid))
      Object.values(currentRole?.levelCompetencies || {}).flat().forEach((cid) => roleCompIds.add(cid as string))
    }

    const relevantComps = allCompetencies.filter((c) => {
      // 1. Strictly match competencies explicitly assigned to this role (or level filter)
      if (roleCompIds.size > 0) {
        return roleCompIds.has(c.id) || (c.code && roleCompIds.has(c.code))
      }
      // 2. Fallback: only include the macro-competencies directly tagged on the required skills
      if (reqSkills.some((s) => s.macroCompetencyCode === c.code || s.macroCompetencyCode === c.id)) {
        return true
      }
      return false
    })

    if (relevantComps.length === 0 && reqSkills.length > 0) {
      relevantComps.push({
        id: 'comp-core',
        code: 'CORE-COMP',
        name: `${graphData.roleName} Core Competency`,
        description: `Core professional competencies required for ${graphData.roleName}.`,
        status: 'ACTIVE',
      })
    }

    const compNodeIds: string[] = []
    relevantComps.forEach((comp) => {
      const compNodeId = `comp-${comp.id}`
      compNodeIds.push(compNodeId)

      addNodeSafely({
        id: compNodeId,
        label: `<b>${comp.code || comp.id}</b>\n${comp.name}`,
        shape: 'box',
        shapeProperties: { borderRadius: 10 },
        margin: { top: 8, right: 14, bottom: 8, left: 14 },
        widthConstraint: { maximum: 220 },
        level: 2,
        color: {
          background: '#FAF5FF',
          border: '#9333EA',
          highlight: { background: '#F3E8FF', border: '#7E22CE' },
          hover: { background: '#F3E8FF', border: '#9333EA' },
        },
        font: {
          multi: 'html',
          color: '#581C87',
          size: 11,
          face: 'IBM Plex Sans, sans-serif',
        },
        borderWidth: 1.5,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.05)', size: 4, x: 0, y: 2 },
        data: {
          category: 'Competency',
          code: comp.code || comp.id,
          name: comp.name,
          description: comp.description,
          status: comp.status || 'ACTIVE',
          memberSkillCount: reqSkills.filter(
            (s) =>
              (s.macroCompetencyCode === comp.code ||
              s.macroCompetencyCode === comp.id ||
              comp.skillIds?.includes(s.skillId) ||
              comp.skillIds?.includes(s.skillCode)) &&
              (!isLevelFiltered || (s.level && s.level.toLowerCase() === selectedLevelFilter.toLowerCase()))
          ).length,
        },
      })

      // Check which level(s) this competency is assigned to
      const assignedLevelNames = Object.entries(currentRole?.levelCompetencies || {})
        .filter(([lvl, compIds]) => (!isLevelFiltered || lvl.toLowerCase() === selectedLevelFilter.toLowerCase()) && Array.isArray(compIds) && ((compIds as string[]).includes(comp.id) || Boolean(comp.code && (compIds as string[]).includes(comp.code))))
        .map(([lvl]) => lvl)

      const targetLevelIds = assignedLevelNames.length > 0
        ? Array.from(new Set(assignedLevelNames.map((lvl) => {
            const foundKey = Object.keys(levelMap).find((k) => k.toLowerCase() === lvl.toLowerCase())
            return foundKey ? levelMap[foundKey] : undefined
          }).filter(Boolean)))
        : isLevelFiltered
        ? levelNodeIds.slice(0, 1)
        : levelNodeIds

      targetLevelIds.forEach((parentLevelId) => {
        addEdgeSafely({
          id: `has-comp-${parentLevelId}-${compNodeId}`,
          from: parentLevelId,
          to: compNodeId,
          label: 'HAS_COMPETENCY',
          font: { size: 8, color: '#9333EA', align: 'horizontal' },
          color: { color: '#C084FC', highlight: '#9333EA', hover: '#7E22CE' },
          arrows: { to: { enabled: true, scaleFactor: 0.6 } },
          dashes: false,
          width: 1.5,
        })
      })
    })

    // 4. Micro-skill nodes connected to Competency nodes (and Level nodes)
    const filteredReqSkills = isLevelFiltered
      ? reqSkills.filter((s) => {
          if (s.level) {
            return s.level.toLowerCase() === selectedLevelFilter.toLowerCase()
          }
          // If skill has no explicit level, do not show under a specific level filter
          return false
        })
      : reqSkills

    filteredReqSkills.forEach((skill, sIdx) => {
      if (!skill.skillId) return
      const hasIncomingPrereq = prereqs.some((p) => p.targetSkillId === skill.skillId)
      const nodeLevel = hasIncomingPrereq ? 4 : 3

      addNodeSafely({
        id: skill.skillId,
        label: `<b>${skill.skillCode || skill.skillId}</b>\n${skill.skillName}\nTarget Mastery: ${Math.round(skill.targetMastery * 100)}%`,
        shape: 'box',
        shapeProperties: { borderRadius: 14 },
        margin: { top: 8, right: 14, bottom: 8, left: 14 },
        widthConstraint: { maximum: 200 },
        level: nodeLevel,
        color: {
          background: '#F0FDF4',
          border: '#16A34A',
          highlight: { background: '#DCFCE7', border: '#15803D' },
          hover: { background: '#DCFCE7', border: '#16A34A' },
        },
        font: {
          multi: 'html',
          color: '#0F172A',
          size: 11,
          face: 'IBM Plex Sans, sans-serif',
        },
        borderWidth: 1.5,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.05)', size: 4, x: 0, y: 2 },
        data: {
          category: 'MicroSkill',
          skillId: skill.skillId,
          code: skill.skillCode || skill.skillId,
          name: skill.skillName,
          macroCompetencyCode: skill.macroCompetencyCode || 'KNOWLEDGE',
          targetMastery: skill.targetMastery,
          status: skill.status || 'ACTIVE',
        },
      })

      // Directed edge: (:Competency)-[:HAS_SKILL]->(:MicroSkill)
      const matchedComp =
        relevantComps.find(
          (c) =>
            c.skillIds?.includes(skill.skillId) ||
            c.skillIds?.includes(skill.skillCode) ||
            (skill.macroCompetencyCode && (c.id === skill.macroCompetencyCode || c.code === skill.macroCompetencyCode))
        ) ||
        relevantComps.find(
          (c) =>
            skill.level &&
            (currentRole?.levelCompetencies?.[skill.level]?.includes(c.id) ||
              (c.code && currentRole?.levelCompetencies?.[skill.level]?.includes(c.code)))
        ) ||
        relevantComps[0]

      const parentNodeId = matchedComp ? `comp-${matchedComp.id}` : (levelNodeIds[0] || `role-${graphData.roleId}`)

      addEdgeSafely({
        id: `has-skill-${parentNodeId}-${skill.skillId}`,
        from: parentNodeId,
        to: skill.skillId,
        title: `Member skill of ${matchedComp?.name || 'Competency'} (${Math.round(skill.targetMastery * 100)}% benchmark)`,
        label: 'HAS_SKILL',
        font: { size: 8, color: '#16A34A', align: 'horizontal' },
        color: { color: '#86EFAC', highlight: '#16A34A', hover: '#15803D' },
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        dashes: false,
        width: 1.5,
      })

      // Directed edge: (:Level)-[:REQUIRES_SKILL {requiredScore}]->(:MicroSkill)
      const targetLevelNodeId = skill.level
        ? Object.entries(levelMap).find(([lvl]) => lvl.toLowerCase() === skill.level?.toLowerCase())?.[1]
        : (levelNodeIds.length > 0 ? levelNodeIds[sIdx % levelNodeIds.length] : undefined)

      if (targetLevelNodeId) {
        addEdgeSafely({
          id: `requires-skill-${targetLevelNodeId}-${skill.skillId}`,
          from: targetLevelNodeId,
          to: skill.skillId,
          title: `Level Requirement: REQUIRES_SKILL (Target Mastery: ${Math.round(skill.targetMastery * 100)}%)`,
          label: 'REQUIRES_SKILL',
          font: { size: 7, color: '#64748B', align: 'horizontal' },
          color: { color: '#CBD5E1', highlight: '#64748B', hover: '#475569' },
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
          dashes: [4, 4],
          width: 1,
          physics: layoutMode === 'organic',
        })
      }
    })

    // 5. Prerequisite edges: (:MicroSkill)-[:HAS_SKILL_PREREQUISITE]->(:MicroSkill)
    prereqs.forEach((p, pIdx) => {
      if (seenNodeIds.has(p.sourceSkillId) && seenNodeIds.has(p.targetSkillId)) {
        addEdgeSafely({
          id: `prereq-${p.sourceSkillId}-${p.targetSkillId}-${pIdx}`,
          from: p.sourceSkillId,
          to: p.targetSkillId,
          label: `HAS_SKILL_PREREQUISITE (≥ ${Math.round(p.minMastery * 100)}%)`,
          title: `HAS_SKILL_PREREQUISITE: Requires ≥ ${Math.round(p.minMastery * 100)}% before learning`,
          font: {
            size: 8,
            color: '#DC2626',
            background: '#FEF2F2',
            strokeWidth: 0,
            align: 'horizontal',
          },
          color: { color: '#F87171', highlight: '#DC2626', hover: '#DC2626' },
          arrows: { to: { enabled: true, scaleFactor: 0.8 } },
          dashes: [5, 5],
          width: 2,
        })
      }
    })

    // Filter edges so they only connect nodes that currently exist
    const validNodeIdSet = new Set(nodes.map((n) => String(n.id)))
    const validEdges = edges.filter((e) => validNodeIdSet.has(String(e.from)) && validNodeIdSet.has(String(e.to)))

    // Search query highlighting
    const q = searchQuery.toLowerCase().trim()
    if (q) {
      nodes.forEach((n) => {
        const code = n.data?.code?.toLowerCase() || ''
        const titleOrName = (
          n.data && 'title' in n.data
            ? (n.data as { title?: string }).title
            : n.data && 'name' in n.data
            ? (n.data as { name?: string }).name
            : ''
        )?.toLowerCase() || ''
        const idStr = n.id !== undefined && n.id !== null ? n.id.toString().toLowerCase() : ''
        const isMatch = code.includes(q) || titleOrName.includes(q) || idStr.includes(q)
        if (isMatch) {
          n.borderWidth = 3
          n.shadow = { enabled: true, color: '#EA580C', size: 10, x: 0, y: 0 }
        } else {
          n.opacity = 0.25
        }
      })
    }
    currentNodesRef.current = nodes

    const options: Options = {
      nodes: { borderWidth: 2 },
      edges: {
        width: 1.5,
        smooth:
          layoutMode === 'hierarchical'
            ? { enabled: true, type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 }
            : { enabled: true, type: 'continuous', roundness: 0.5 },
      },
      layout:
        layoutMode === 'hierarchical'
          ? {
              hierarchical: {
                direction: 'UD',
                sortMethod: 'hubsize',
                levelSeparation: 150,
                nodeSpacing: 260,
                treeSpacing: 300,
                blockShifting: true,
                edgeMinimization: false,
                parentCentralization: true,
              },
            }
          : { improvedLayout: true },
      physics: {
        enabled: layoutMode === 'organic',
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -100,
          centralGravity: 0.01,
          springLength: 160,
          springConstant: 0.05,
          damping: 0.4,
          avoidOverlap: 1.0,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: false,
      },
    }

    let network: Network | null = null
    let ro: ResizeObserver | null = null
    let fitTimer: ReturnType<typeof setTimeout> | null = null

    try {
      network = new Network(
        containerRef.current,
        { nodes, edges: validEdges },
        options
      )
      networkRef.current = network

      const handleFitGraph = () => {
        if (!networkRef.current) return
        networkRef.current.fit({
          animation: { duration: 300, easingFunction: 'easeInOutQuad' },
        })
        setTimeout(() => {
          if (!networkRef.current) return
          const currentScale = networkRef.current.getScale()
          if (currentScale < 0.8) {
            networkRef.current.moveTo({
              scale: 0.85,
              animation: { duration: 250, easingFunction: 'easeInOutQuad' },
            })
          }
        }, 350)
      }

      network.once('stabilizationIterationsDone', handleFitGraph)
      fitTimer = setTimeout(handleFitGraph, 200)

      network.on('click', (params) => {
        if (params.nodes && params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const matched = nodes.find((n) => n.id === nodeId)
          if (matched && matched.data) setSelectedNode(matched.data)
        } else {
          setSelectedNode(null)
        }
      })

      ro = new ResizeObserver(() => {
        if (networkRef.current && containerRef.current) {
          if (containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
            networkRef.current.redraw()
            networkRef.current.fit()
          }
        }
      })
      if (containerRef.current) {
        ro.observe(containerRef.current)
      }
    } catch (networkErr) {
      console.error('Failed to initialize vis-network:', networkErr)
      setError('Unable to render visual graph. Please try switching layout or adjusting filters.')
    }

    return () => {
      if (fitTimer) clearTimeout(fitTimer)
      if (ro) ro.disconnect()
      if (network) {
        try {
          network.destroy()
        } catch {}
      }
      networkRef.current = null
    }
  }, [graphData, layoutMode, loading, role, propLevels, roleId, selectedLevelFilter, searchQuery])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setIsFullscreen(false)
        onOpenChange(v)
      }}
      containerClassName={isFullscreen ? 'p-0 sm:p-0 overflow-hidden' : undefined}
      className={
        isFullscreen
          ? 'max-w-none w-screen h-screen max-h-none rounded-none border-0 my-0 flex flex-col p-0 overflow-hidden'
          : 'max-w-[96vw] w-[96vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border shadow-2xl'
      }
    >
      <GraphModalErrorBoundary onClose={() => onOpenChange(false)}>
        <div className="relative w-full h-full overflow-hidden">
        {/* Full Modal Graph Canvas with Sleek Dot-Grid Slate Tint */}
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: '#F8FAFC',
            backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Floating Top-Left Title, Search & Level Filter Bar */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2.5 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border shadow-sm pointer-events-auto max-w-[calc(100%-380px)]">
          {/* Role Header Info */}
          <div className="flex items-center gap-2 pr-2 border-r border-border">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GitBranch className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-foreground truncate max-w-[130px] sm:max-w-[160px]">
                  {graphData?.roleName || roleTitle || 'Role Subgraph'}
                </h3>
                {graphData?.roleCode && (
                  <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 text-primary border-primary/30">
                    {extractCleanRoleCode(graphData.roleCode || graphData.roleId)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchFocus()
              }}
              placeholder="Search node..."
              className="h-7 pl-7 pr-6 text-xs w-28 sm:w-36 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 h-4 w-4 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {/* Level Filter Selector */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-border">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="h-7 px-2 text-xs rounded-lg bg-muted/60 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
              aria-label="Filter by Level"
            >
              <option value="ALL">All Levels</option>
              {(effectiveLevels as string[]).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Floating Top-Right Toolbar & Actions */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-card/90 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-sm pointer-events-auto">
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('hierarchical')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === 'hierarchical'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hierarchical
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('organic')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === 'organic'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Network
            </button>
          </div>

          <div className="h-4 w-[1px] bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const scale = networkRef.current?.getScale() || 1
              networkRef.current?.moveTo({ scale: scale * 1.3 })
            }}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const scale = networkRef.current?.getScale() || 1
              networkRef.current?.moveTo({ scale: scale * 0.7 })
            }}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (!networkRef.current) return
              networkRef.current.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
              setTimeout(() => {
                if (!networkRef.current) return
                if (networkRef.current.getScale() < 0.8) {
                  networkRef.current.moveTo({ scale: 0.85, animation: { duration: 200, easingFunction: 'easeInOutQuad' } })
                }
              }, 350)
            }}
            title="Reset View"
            aria-label="Reset View"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setIsFullscreen((prev) => !prev)
              setTimeout(() => networkRef.current?.fit(), 100)
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          <div className="h-4 w-[1px] bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
            onClick={() => onOpenChange(false)}
            title="Close Modal"
            aria-label="Close Modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3 z-30 pointer-events-auto">
            <RefreshCw className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading target-role knowledge graph...</p>
          </div>
        )}

        {/* Error Overlay */}
        {error && !loading && (
          <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-12 text-center text-destructive gap-3 z-30 pointer-events-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-semibold">{error}</p>
            <Button variant="outline" size="sm" onClick={loadGraph}>
              Retry
            </Button>
          </div>
        )}

        {/* Floating Bottom-Right Legend */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-wrap items-center gap-3 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border text-[11px] text-muted-foreground shadow-sm pointer-events-auto">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-500/20 border border-orange-500 inline-block" />
            <span>Target Role</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500/20 border border-indigo-500 inline-block" />
            <span>Proficiency Level</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-500/20 border border-purple-500 inline-block" />
            <span>Competency</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2.5 w-3 rounded-full bg-emerald-500/20 border border-emerald-500 inline-block" />
            <span>Required Skill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-destructive border-dashed inline-block" />
            <span className="text-destructive font-medium">Prerequisite (≥ %)</span>
          </div>
        </div>

        {/* Floating Element Inspector Panel (Opens on LEFT side when clicking any node in the graph) */}
        {selectedNode && (
          <div className="absolute top-16 left-4 bottom-4 w-84 md:w-96 z-30 bg-card/95 backdrop-blur-md shadow-2xl border border-border rounded-xl p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 pointer-events-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Element Inspector</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {selectedNode.category}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                    title="Close Inspector"
                    aria-label="Close Inspector"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {selectedNode.category === 'TargetRole' ? (
                  <>
                    <div>
                      <span className="font-mono text-primary font-bold text-sm block">
                        {extractCleanRoleCode(selectedNode.code)}
                      </span>
                      <span className="font-semibold text-foreground text-sm block mt-0.5">
                        {selectedNode.title}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-muted/30 border border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Track</span>
                        <strong className="text-foreground">{selectedNode.track || 'PROFESSIONAL'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Seniority Band</span>
                        <strong className="text-foreground">{selectedNode.seniority || 'P3'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Attainment Rule</span>
                        <span className="font-mono text-[10px] font-semibold text-primary">ALL_MANDATORY_SKILLS</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Status</span>
                        <Badge variant={selectedNode.status === 'PUBLISHED' ? 'success' : 'secondary'} className="text-[10px]">
                          {selectedNode.status}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block">Required Skills</span>
                        <strong className="text-foreground">{graphData?.requiredSkills?.length || 0}</strong>
                      </div>
                    </div>
                  </>
                ) : selectedNode.category === 'Level' ? (
                  <>
                    <div>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm block">
                        {selectedNode.code}
                      </span>
                      <span className="font-semibold text-foreground text-sm block mt-0.5">
                        {selectedNode.title}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-muted/30 border border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Proficiency Level</span>
                        <strong className="text-foreground">{selectedNode.title}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Status</span>
                        <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                          ACTIVE
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block">Level Description</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Competency benchmark proficiency milestone for {selectedNode.title}.
                        </p>
                      </div>
                    </div>
                  </>
                ) : selectedNode.category === 'Competency' ? (
                  <>
                    <div>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold text-sm block">
                        {selectedNode.code}
                      </span>
                      <span className="font-semibold text-foreground text-sm block mt-0.5">
                        {selectedNode.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-muted/30 border border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Category</span>
                        <strong className="text-foreground">Competency Cluster</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Status</span>
                        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 dark:text-purple-400">
                          {selectedNode.status || 'ACTIVE'}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block">Description</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {selectedNode.description || 'Functional capability and knowledge cluster defined for this target role.'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block">Configured Skills</span>
                        <strong className="text-foreground">{selectedNode.memberSkillCount || 0} skills linked</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-mono text-primary font-bold text-sm block">
                        {selectedNode.code}
                      </span>
                      <span className="font-semibold text-foreground text-sm block mt-0.5">
                        {selectedNode.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-muted/30 border border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Competency Domain</span>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {selectedNode.macroCompetencyCode}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Target Mastery</span>
                        <strong className="text-success text-xs font-bold block mt-0.5">
                          {Math.round(selectedNode.targetMastery * 100)}%
                        </strong>
                      </div>
                    </div>

                    {/* Prerequisites breakdown */}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <span className="text-muted-foreground text-[11px] font-semibold block">
                        Required Prerequisites:
                      </span>
                      {(graphData?.prerequisites || []).filter((p) => p.targetSkillId === selectedNode.skillId).length === 0 ? (
                        <div className="text-[11px] text-muted-foreground italic p-2 bg-muted/20 rounded border border-border">
                          No internal prerequisites for this role requirement.
                        </div>
                      ) : (
                        (graphData?.prerequisites || [])
                          .filter((p) => p.targetSkillId === selectedNode.skillId)
                          .map((p) => (
                            <div
                              key={`${p.sourceSkillId}-${p.targetSkillId}`}
                              className="p-2 rounded bg-muted/20 border border-border text-[11px] flex items-center justify-between"
                            >
                              <span className="font-mono text-primary font-bold">
                                {p.sourceSkillCode || p.sourceSkillId}
                              </span>
                              <Badge variant="primary" className="text-[10px]">
                                ≥ {Math.round(p.minMastery * 100)}%
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Click empty canvas to close</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedNode(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
      </GraphModalErrorBoundary>
    </Dialog>
  )
}
