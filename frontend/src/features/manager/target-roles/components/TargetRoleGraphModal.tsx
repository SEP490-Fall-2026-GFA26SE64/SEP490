import { AlertCircle, Eye, GitBranch, Maximize2, Minimize2, Network as NetworkIcon, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import * as React from 'react'
import { Network, type Options, type Node, type Edge } from 'vis-network'
import { fetchTargetRoleGraph, type TargetRoleGraphDto } from '../../../../shared/api/prerequisiteApi'
import { fetchCompetencies, type CompetencyDto } from '../../../../shared/api/competencyApi'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../shared/components/ui/Dialog'
import { getActiveCompany } from '../../../../shared/stores/companyStore'

interface TargetRoleGraphModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string | null
  organizationId: string
  roleTitle?: string
  levels?: string[]
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
}

export type GraphElementNodeData = RoleNodeData | LevelNodeData | CompetencyNodeData | SkillNodeData

interface GraphCustomNode extends Node {
  data?: GraphElementNodeData
}

export function TargetRoleGraphModal({
  open,
  onOpenChange,
  roleId,
  organizationId,
  roleTitle,
  levels: propLevels,
}: TargetRoleGraphModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [graphData, setGraphData] = React.useState<TargetRoleGraphDto | null>(null)
  const [selectedNode, setSelectedNode] = React.useState<GraphElementNodeData | null>(null)
  const [allCompetencies, setAllCompetencies] = React.useState<CompetencyDto[]>([])
  const [layoutMode, setLayoutMode] = React.useState<'hierarchical' | 'organic'>('hierarchical')
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)

  const loadGraph = React.useCallback(async () => {
    if (!roleId || !organizationId) return
    setLoading(true)
    setError(null)
    setSelectedNode(null)
    try {
      const [data, comps] = await Promise.all([
        fetchTargetRoleGraph(organizationId, roleId),
        fetchCompetencies(organizationId).catch(() => []),
      ])
      setAllCompetencies(comps || [])
      setGraphData({
        ...data,
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites : [],
      })
    } catch {
      const comps = await fetchCompetencies(organizationId).catch(() => [])
      setAllCompetencies(comps || [])

      // Robust fallback for draft or local target roles not yet committed to Neo4j
      const activeCompany = getActiveCompany()
      const matchedRole = activeCompany?.targetRoles?.find((r) => r.id === roleId || r.code === roleId)
      if (matchedRole) {
        const fallbackSkills = (matchedRole.skillTargets || []).map((st) => ({
          skillId: st.skillId,
          skillCode: st.skillCode,
          skillName: st.skillName,
          macroCompetencyCode: 'KNOWLEDGE',
          targetMastery: (st.threshold || 80) / 100,
          status: 'ACTIVE',
        }))
        const skillIds = new Set(fallbackSkills.map((s) => s.skillId))
        const skillCodes = new Set(fallbackSkills.map((s) => s.skillCode))
        const fallbackPrereqs = (activeCompany?.prerequisites || [])
          .filter(
            (p) =>
              (skillIds.has(p.sourceSkillId) || skillCodes.has(p.sourceSkillCode || '')) &&
              (skillIds.has(p.targetSkillId) || skillCodes.has(p.targetSkillCode || ''))
          )
          .map((p) => ({
            sourceSkillId: p.sourceSkillId,
            sourceSkillCode: p.sourceSkillCode || '',
            targetSkillId: p.targetSkillId,
            targetSkillCode: p.targetSkillCode || '',
            minMastery: p.minMastery || 0.75,
            status: p.status || 'ACTIVE',
          }))

        setGraphData({
          roleId: matchedRole.id,
          roleCode: matchedRole.code,
          roleName: matchedRole.title,
          track: matchedRole.track || 'PROFESSIONAL',
          seniority: matchedRole.seniority || 'P3',
          status: (matchedRole.status || 'DRAFT').toUpperCase(),
          requiredSkills: fallbackSkills,
          prerequisites: fallbackPrereqs,
        })
      } else {
        setError('Target role graph could not be loaded.')
      }
    } finally {
      setLoading(false)
    }
  }, [roleId, organizationId])

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

    const reqSkills = Array.isArray(graphData.requiredSkills) ? graphData.requiredSkills : []
    const prereqs = Array.isArray(graphData.prerequisites) ? graphData.prerequisites : []

    // 1. Role root node (clean, containing only Role Code and Title)
    nodes.push({
      id: `role-${graphData.roleId}`,
      label: `<b>${graphData.roleCode}</b>\n${graphData.roleName}`,
      shape: 'box',
      shapeProperties: { borderRadius: 8 },
      margin: { top: 12, right: 16, bottom: 12, left: 16 },
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
    const currentRole = activeComp?.targetRoles?.find((r) => r.id === roleId || r.code === roleId)
    const effectiveLevels =
      propLevels && propLevels.length > 0
        ? propLevels
        : currentRole?.levels && currentRole.levels.length > 0
        ? currentRole.levels
        : ['Junior', 'Middle', 'Senior']

    const levelNodeIds: string[] = []
    effectiveLevels.forEach((lvlName, idx) => {
      const lvlId = `level-${graphData.roleId}-${idx + 1}`
      levelNodeIds.push(lvlId)

      nodes.push({
        id: lvlId,
        label: `<b>Rank ${idx + 1}</b>\n${lvlName}`,
        shape: 'box',
        shapeProperties: { borderRadius: 10 },
        margin: { top: 8, right: 14, bottom: 8, left: 14 },
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
          code: `LEVEL-${idx + 1}`,
          title: `${lvlName} (Rank ${idx + 1})`,
          status: 'ACTIVE',
          rank: idx + 1,
        },
      })

      // Directed edge: (:TargetRole)-[:HAS_LEVEL]->(:Level)
      edges.push({
        id: `has-level-${graphData.roleId}-${idx + 1}`,
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
    const roleCompIds = new Set([
      ...(currentRole?.competencyIds || []),
      ...Object.values(currentRole?.levelCompetencies || {}).flat(),
    ])

    const relevantComps = allCompetencies.filter((c) => {
      if (roleCompIds.has(c.id) || (c.code && roleCompIds.has(c.code))) return true
      if (reqSkills.some((s) => s.macroCompetencyCode === c.code || s.macroCompetencyCode === c.id)) return true
      if (c.skillIds && c.skillIds.some((sid) => reqSkills.some((s) => s.skillId === sid))) return true
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
    relevantComps.forEach((comp, cIdx) => {
      const compNodeId = `comp-${comp.id}`
      compNodeIds.push(compNodeId)

      nodes.push({
        id: compNodeId,
        label: `<b>${comp.code || comp.id}</b>\n${comp.name}`,
        shape: 'box',
        shapeProperties: { borderRadius: 10 },
        margin: { top: 8, right: 14, bottom: 8, left: 14 },
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
            (s) => s.macroCompetencyCode === comp.code || s.macroCompetencyCode === comp.id || comp.skillIds?.includes(s.skillId)
          ).length,
        },
      })

      // Directed edge: (:Level)-[:HAS_COMPETENCY]->(:Competency) (Ontology schema)
      const parentLevelId = levelNodeIds.length > 0
        ? levelNodeIds[cIdx % levelNodeIds.length]
        : `role-${graphData.roleId}`

      edges.push({
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

    // 4. Micro-skill nodes connected to Competency nodes (or Level)
    reqSkills.forEach((skill, sIdx) => {
      const hasIncomingPrereq = prereqs.some((p) => p.targetSkillId === skill.skillId)
      const level = hasIncomingPrereq ? 4 : 3

      nodes.push({
        id: skill.skillId,
        label: `<b>${skill.skillCode}</b>\n${skill.skillName}\nTarget: ${Math.round(skill.targetMastery * 100)}%`,
        shape: 'box',
        shapeProperties: { borderRadius: 14 },
        margin: { top: 8, right: 14, bottom: 8, left: 14 },
        level,
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
          code: skill.skillCode,
          name: skill.skillName,
          macroCompetencyCode: skill.macroCompetencyCode || 'KNOWLEDGE',
          targetMastery: skill.targetMastery,
          status: skill.status,
        },
      })

      // Directed edge: (:Competency)-[:HAS_SKILL]->(:MicroSkill)
      const matchedComp = relevantComps.find(
        (c) => c.code === skill.macroCompetencyCode || c.id === skill.macroCompetencyCode || c.skillIds?.includes(skill.skillId)
      ) || relevantComps[0]

      const parentNodeId = matchedComp ? `comp-${matchedComp.id}` : (levelNodeIds[0] || `role-${graphData.roleId}`)

      edges.push({
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
      const owningLevelId = levelNodeIds.length > 0 ? levelNodeIds[sIdx % levelNodeIds.length] : undefined
      if (owningLevelId) {
        edges.push({
          id: `requires-skill-${owningLevelId}-${skill.skillId}`,
          from: owningLevelId,
          to: skill.skillId,
          title: `Level Requirement: REQUIRES_SKILL (Threshold: ${Math.round(skill.targetMastery * 100)}%)`,
          label: 'REQUIRES_SKILL',
          font: { size: 7, color: '#64748B', align: 'horizontal' },
          color: { color: '#CBD5E1', highlight: '#64748B', hover: '#475569' },
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
          dashes: [4, 4],
          width: 1,
        })
      }
    })

    // 5. Prerequisite edges: (:MicroSkill)-[:HAS_SKILL_PREREQUISITE]->(:MicroSkill)
    prereqs.forEach((p) => {
      const hasSrc = nodes.some((n) => n.id === p.sourceSkillId)
      const hasTgt = nodes.some((n) => n.id === p.targetSkillId)
      if (hasSrc && hasTgt) {
        edges.push({
          id: `prereq-${p.sourceSkillId}-${p.targetSkillId}`,
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

    const options: Options = {
      nodes: { borderWidth: 2 },
      edges: {
        width: 1.5,
        smooth:
          layoutMode === 'hierarchical'
            ? { enabled: true, type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 }
            : { enabled: true, type: 'continuous', roundness: 0.4 },
      },
      layout: {
        hierarchical: {
          enabled: layoutMode === 'hierarchical',
          direction: 'UD',
          sortMethod: 'hubsize',
          levelSeparation: 160,
          nodeSpacing: 280,
          treeSpacing: 320,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
        },
      },
      physics: {
        enabled: true,
        solver: layoutMode === 'hierarchical' ? 'hierarchicalRepulsion' : 'barnesHut',
        hierarchicalRepulsion: {
          nodeDistance: 280,
          centralGravity: 0.0,
          springLength: 160,
          springConstant: 0.01,
          damping: 0.09,
          avoidOverlap: 1,
        },
        barnesHut: {
          gravitationalConstant: -4000,
          centralGravity: 0.2,
          springLength: 160,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 1,
        },
        stabilization: {
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
      },
    }

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      options
    )
    networkRef.current = network

    network.once('stabilizationIterationsDone', () => {
      network.fit()
    })

    const fitTimer = setTimeout(() => {
      network.fit()
    }, 150)

    network.on('selectNode', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const matched = nodes.find((n) => n.id === nodeId)
        if (matched && matched.data) setSelectedNode(matched.data)
      }
    })

    const ro = new ResizeObserver(() => {
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

    return () => {
      clearTimeout(fitTimer)
      ro.disconnect()
      network.destroy()
      networkRef.current = null
    }
  }, [graphData, layoutMode, loading])

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
          : 'max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden'
      }
    >
      <DialogHeader className="p-4 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <GitBranch className="h-5 w-5 text-primary" />
                {graphData?.roleName || roleTitle || 'Role Subgraph'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Inspect required micro-skills, minimum proficiencies, and prerequisite sequencing.
              </DialogDescription>
            </div>

            {/* Layout & Zoom Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setLayoutMode('hierarchical')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    layoutMode === 'hierarchical'
                      ? 'bg-card text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Hierarchical
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('organic')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    layoutMode === 'organic'
                      ? 'bg-card text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Network
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  const scale = networkRef.current?.getScale() || 1
                  networkRef.current?.moveTo({ scale: scale * 1.3 })
                }}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  const scale = networkRef.current?.getScale() || 1
                  networkRef.current?.moveTo({ scale: scale * 0.7 })
                }}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => networkRef.current?.fit()}
                title="Reset View"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setIsFullscreen((prev) => !prev)
                  setTimeout(() => networkRef.current?.fit(), 100)
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden relative">
          {/* Graph Canvas Column - Always rendered so containerRef stays attached */}
          <div className="lg:col-span-2 relative h-full bg-background border-r border-border overflow-hidden">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Overlays for loading / error */}
            {loading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3 z-20">
                <RefreshCw className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading target-role knowledge graph...</p>
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-12 text-center text-destructive gap-3 z-20">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-semibold">{error}</p>
                <Button variant="outline" size="sm" onClick={loadGraph}>
                  Retry
                </Button>
              </div>
            )}

            {/* Graph Legend */}
            <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 bg-card/95 backdrop-blur px-3 py-1.5 rounded-md border border-border text-[11px] text-muted-foreground shadow-xs z-10">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary/20 border border-primary inline-block" />
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
                <span className="h-2.5 w-3 rounded-full bg-success/20 border border-success inline-block" />
                <span>Required Skill</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-destructive border-dashed inline-block" />
                <span className="text-destructive font-medium">Prerequisite (≥ %)</span>
              </div>
            </div>
          </div>

          {/* Inspector Sidebar */}
          <div className="p-4 bg-muted/20 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Element Inspector</span>
                </div>
                {selectedNode && (
                  <Badge variant="outline" className="text-[10px]">
                    {selectedNode.category}
                  </Badge>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-3 text-xs">
                  {selectedNode.category === 'TargetRole' ? (
                    <>
                      <div>
                        <span className="font-mono text-primary font-bold text-sm block">
                          {selectedNode.code}
                        </span>
                        <span className="font-semibold text-foreground text-sm block mt-0.5">
                          {selectedNode.title}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-card border border-border">
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
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-card border border-border">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Level Rank</span>
                          <strong className="text-foreground">Rank {selectedNode.rank || 1}</strong>
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
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-card border border-border">
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

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-card border border-border">
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
                          <div className="text-[11px] text-muted-foreground italic p-2 bg-card rounded border border-border">
                            No internal prerequisites for this role requirement.
                          </div>
                        ) : (
                          (graphData?.prerequisites || [])
                            .filter((p) => p.targetSkillId === selectedNode.skillId)
                            .map((p) => (
                              <div
                                key={`${p.sourceSkillId}-${p.targetSkillId}`}
                                className="p-2 rounded bg-card border border-border text-[11px] flex items-center justify-between"
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
              ) : (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  <NetworkIcon className="h-8 w-8 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="font-semibold text-foreground">Click any node in the graph</p>
                  <p className="text-[11px] mt-1 text-muted-foreground">
                    Inspect target role definitions, required skills, and prerequisite dependency gates.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
              Visualizing confirmed competency structure and prerequisite learning paths.
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-border bg-card">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
    </Dialog>
  )
}
