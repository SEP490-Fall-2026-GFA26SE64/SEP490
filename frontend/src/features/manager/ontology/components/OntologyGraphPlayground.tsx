import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  GripVertical,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Network as NetworkIcon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as React from 'react'
import { Network, type Options, type Node, type Edge } from 'vis-network'
import { DataSet } from 'vis-data'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import { Combobox } from '../../../../shared/components/ui/Combobox'
import { RequiredKnowledgePicker } from '../../target-roles/components/RequiredKnowledgePicker'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../shared/components/ui/Dialog'
import { useToast } from '../../../../shared/hooks/useToast'
import { useTranslation } from '../../../../shared/i18n/LanguageContext'
import { cn } from '../../../../shared/lib/utils'
import { type CompetencyModel, type MicroSkillModel, type PrerequisiteEdge, type TargetRoleModel, type SkillTargetConfig } from '../../data/ldManagerMockData'
import { getActiveCompany, updateActiveCompany } from '../../../../shared/stores/companyStore'
import { createPrerequisite, deletePrerequisite, reversePrerequisite } from '../../../../shared/api/prerequisiteApi'
import { updateCompetency } from '../../../../shared/api/competencyApi'

export interface OntologyGraphPlaygroundProps {
  microSkills: MicroSkillModel[]
  competencies: CompetencyModel[]
  prerequisites: PrerequisiteEdge[]
  targetRoles?: TargetRoleModel[]
  onUpdateTargetRole?: (role: TargetRoleModel) => Promise<void> | void
  organizationId: string
  activeTab?: string
  onRefreshData?: () => Promise<void>
}

export interface PlaygroundCustomNode extends Node {
  id: string
  nodeType: 'targetRole' | 'level' | 'competency' | 'skill'
  code: string
  name: string
  definition?: string
  status?: string
  targetRoleId?: string
  levelName?: string
}

class PlaygroundErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Playground Graph crashed:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-bold text-foreground">Graph Explorer Encountered an Issue</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred inside the graph canvas.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              this.props.onReset?.()
            }}
          >
            Reload Graph Playground
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

export function OntologyGraphPlayground(props: OntologyGraphPlaygroundProps) {
  return (
    <PlaygroundErrorBoundary onReset={props.onRefreshData}>
      <OntologyGraphPlaygroundInner {...props} />
    </PlaygroundErrorBoundary>
  )
}

function OntologyGraphPlaygroundInner({
  microSkills,
  competencies,
  prerequisites,
  targetRoles = [],
  onUpdateTargetRole,
  organizationId,
  activeTab,
  onRefreshData,
}: OntologyGraphPlaygroundProps) {
  const { toast } = useToast()
  const { language } = useTranslation()
  const copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const containerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)

  // Stable prop refs to prevent vis-network re-instantiation on prop refreshes
  const microSkillsRef = React.useRef(microSkills)
  const competenciesRef = React.useRef(competencies)
  const prerequisitesRef = React.useRef(prerequisites)
  const targetRolesRef = React.useRef(targetRoles)
  const onUpdateTargetRoleRef = React.useRef(onUpdateTargetRole)
  microSkillsRef.current = microSkills
  competenciesRef.current = competencies
  prerequisitesRef.current = prerequisites
  targetRolesRef.current = targetRoles
  onUpdateTargetRoleRef.current = onUpdateTargetRole

  // Fast vis-data DataSets for 60fps graph manipulation
  const nodesDataSetRef = React.useRef<DataSet<PlaygroundCustomNode>>(new DataSet<PlaygroundCustomNode>([]))
  const edgesDataSetRef = React.useRef<DataSet<Edge>>(new DataSet<Edge>([]))

  // Canvas State synced for UI tracking
  const [canvasNodes, setCanvasNodes] = React.useState<PlaygroundCustomNode[]>([])
  const [canvasEdges, setCanvasEdges] = React.useState<Edge[]>([])
  const canvasNodesRef = React.useRef<PlaygroundCustomNode[]>([])
  const canvasEdgesRef = React.useRef<Edge[]>([])

  canvasNodesRef.current = canvasNodes
  canvasEdgesRef.current = canvasEdges

  // Selection & Mode State
  const [selectedNode, setSelectedNode] = React.useState<PlaygroundCustomNode | null>(null)
  const [selectedEdge, setSelectedEdge] = React.useState<Edge | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const isCompactViewRef = React.useRef(false)

  // Direct Interactive Connection Mode
  const [isConnectMode, setIsConnectMode] = React.useState(false)
  const [connectSourceNode, setConnectSourceNode] = React.useState<PlaygroundCustomNode | null>(null)
  const isConnectModeRef = React.useRef(false)
  const connectSourceNodeRef = React.useRef<PlaygroundCustomNode | null>(null)
  isConnectModeRef.current = isConnectMode
  connectSourceNodeRef.current = connectSourceNode

  const handleNodeClickForConnectRef = React.useRef<(targetNode: PlaygroundCustomNode) => Promise<void>>(async () => {})

  // Prerequisite creation threshold dialog
  const [isPrereqModalOpen, setIsPrereqModalOpen] = React.useState(false)
  const [pendingPrereq, setPendingPrereq] = React.useState<{ source: PlaygroundCustomNode; target: PlaygroundCustomNode } | null>(null)
  const [dependentLevel, setDependentLevel] = React.useState('')
  const [prerequisiteLevel, setPrerequisiteLevel] = React.useState('')
  const [pendingRoleRequirement, setPendingRoleRequirement] = React.useState<{ role: TargetRoleModel; skill: PlaygroundCustomNode; level: PlaygroundCustomNode; parent: string } | null>(null)
  const [requiredKnowledge, setRequiredKnowledge] = React.useState<string[]>([])
  const [savingRequirement, setSavingRequirement] = React.useState(false)

  // Palette & Filter State
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState<'all' | 'targetRole' | 'competency' | 'skill'>('all')

  function buildTargetRoleNode(r: TargetRoleModel, pos?: { x: number; y: number }): PlaygroundCustomNode {
    const isCompact = isCompactViewRef.current
    return {
      id: r.id,
      nodeType: 'targetRole',
      code: r.code || r.id,
      name: r.title,
      definition: r.description,
      status: r.status,
      targetRoleId: r.id,
      label: isCompact ? (r.code || r.id) : `<b>${r.code || r.id}</b>`,
      shape: 'box',
      shapeProperties: { borderRadius: 8 },
      margin: isCompact ? { top: 6, right: 10, bottom: 6, left: 10 } : { top: 12, right: 16, bottom: 12, left: 16 },
      widthConstraint: isCompact ? { maximum: 130 } : { maximum: 200 },
      color: {
        background: '#FFF7ED',
        border: '#EA580C',
        highlight: { background: '#FFEDD5', border: '#C2410C' },
        hover: { background: '#FFEDD5', border: '#EA580C' },
      },
      font: {
        multi: 'html',
        color: '#0F172A',
        size: isCompact ? 9.5 : 13,
        face: 'IBM Plex Sans, sans-serif',
      },
      borderWidth: 2,
      x: pos?.x,
      y: pos?.y,
    }
  }

  function buildLevelNode(role: TargetRoleModel, levelName: string, pos?: { x: number; y: number }): PlaygroundCustomNode {
    const isCompact = isCompactViewRef.current
    const levelId = `level-${role.id}-${levelName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    return {
      id: levelId,
      nodeType: 'level',
      code: levelName,
      name: `${levelName} Level (${role.code})`,
      definition: `Target proficiency tier ${levelName} for ${role.title}`,
      targetRoleId: role.id,
      levelName: levelName,
      label: isCompact ? levelName : `<b>${levelName}</b>`,
      shape: 'box',
      shapeProperties: { borderRadius: 10 },
      margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 14, bottom: 8, left: 14 },
      widthConstraint: isCompact ? { maximum: 100 } : { maximum: 160 },
      color: {
        background: '#EEF2FF',
        border: '#4F46E5',
        highlight: { background: '#E0E7FF', border: '#4338CA' },
        hover: { background: '#E0E7FF', border: '#4F46E5' },
      },
      font: {
        multi: 'html',
        color: '#1E1B4B',
        size: isCompact ? 9 : 11,
        face: 'IBM Plex Sans, sans-serif',
      },
      borderWidth: 1.5,
      x: pos?.x,
      y: pos?.y,
    }
  }

  function buildHasLevelEdge(roleId: string, levelId: string): Edge {
    return {
      id: `has-level-${roleId}-${levelId}`,
      from: roleId,
      to: levelId,
      label: 'HAS_LEVEL',
      title: 'HAS_LEVEL: Target Role contains proficiency level',
      font: { size: 9, color: '#4F46E5', strokeWidth: 0, align: 'horizontal' },
      color: { color: '#818CF8', highlight: '#4F46E5', hover: '#4338CA' },
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
      width: 1.5,
      dashes: false,
    }
  }

  function buildRequiresCompetencyEdge(levelId: string, compId: string): Edge {
    return {
      id: `requires-comp-${levelId}-${compId}`,
      from: levelId,
      to: compId,
      label: 'HAS_COMPETENCY',
      title: 'HAS_COMPETENCY: Target Role level requires competency',
      font: { size: 8, color: '#9333EA', strokeWidth: 0, align: 'horizontal' },
      color: { color: '#C084FC', highlight: '#9333EA', hover: '#7E22CE' },
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
      width: 1.5,
      dashes: false,
    }
  }

  function buildRequiresSkillEdge(levelId: string, skillId: string, knowledge: string[] = []): Edge {
    return {
      id: `requires-skill-${levelId}-${skillId}`,
      from: levelId,
      to: skillId,
      title: `Level Requirement: REQUIRES_SKILL (${knowledge.join(' · ') || 'Unclassified'})`,
      label: 'REQUIRES_SKILL',
      font: { size: 7, color: '#64748B', strokeWidth: 0, align: 'horizontal' },
      color: { color: '#CBD5E1', highlight: '#64748B', hover: '#475569' },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      dashes: [4, 4],
      width: 1,
    }
  }

  function buildCompetencyNode(c: CompetencyModel, pos?: { x: number; y: number }): PlaygroundCustomNode {
    const isCompact = isCompactViewRef.current
    return {
      id: c.id,
      nodeType: 'competency',
      code: c.code || c.id,
      name: c.name,
      definition: c.description,
      status: c.status || 'ACTIVE',
      label: isCompact ? (c.code || c.id) : `<b>${c.code || c.id}</b>\n${c.name}`,
      shape: 'box',
      shapeProperties: { borderRadius: 10 },
      margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 14, bottom: 8, left: 14 },
      widthConstraint: isCompact ? { maximum: 110 } : { maximum: 220 },
      color: {
        background: '#FAF5FF',
        border: '#9333EA',
        highlight: { background: '#F3E8FF', border: '#7E22CE' },
        hover: { background: '#F3E8FF', border: '#9333EA' },
      },
      font: {
        multi: 'html',
        color: '#581C87',
        size: isCompact ? 9 : 11,
        face: 'IBM Plex Sans, sans-serif',
      },
      borderWidth: 1.5,
      x: pos?.x,
      y: pos?.y,
    }
  }

  function buildSkillNode(s: MicroSkillModel, pos?: { x: number; y: number }): PlaygroundCustomNode {
    const isCompact = isCompactViewRef.current
    return {
      id: s.id,
      nodeType: 'skill',
      code: s.code,
      name: s.name,
      definition: s.description,
      status: s.status || 'ACTIVE',
      label: isCompact ? s.code : `<b>${s.code}</b>\n${s.name}`,
      shape: 'box',
      shapeProperties: { borderRadius: 14 },
      margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 14, bottom: 8, left: 14 },
      widthConstraint: isCompact ? { maximum: 100 } : { maximum: 200 },
      color: {
        background: '#F0FDF4',
        border: '#16A34A',
        highlight: { background: '#DCFCE7', border: '#15803D' },
        hover: { background: '#DCFCE7', border: '#16A34A' },
      },
      font: {
        multi: 'html',
        color: '#0F172A',
        size: isCompact ? 9 : 11,
        face: 'IBM Plex Sans, sans-serif',
      },
      borderWidth: 1.5,
      x: pos?.x,
      y: pos?.y,
    }
  }

  function buildHasSkillEdge(compId: string, skillId: string): Edge {
    return {
      id: `has-skill-${compId}-${skillId}`,
      from: compId,
      to: skillId,
      label: 'HAS_SKILL',
      title: 'HAS_SKILL: Competency contains Micro-skill',
      font: { size: 8, color: '#16A34A', strokeWidth: 0, align: 'horizontal' },
      color: { color: '#86EFAC', highlight: '#16A34A', hover: '#15803D' },
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
      width: 1.5,
      dashes: false,
    }
  }

  function buildPrereqEdge(sourceSkillId: string, targetSkillId: string, dependent?: string | null, prerequisite?: string | null): Edge {
    const pair = `${dependent ?? 'Unclassified'} → ${prerequisite ?? 'Unclassified'}`
    return {
      id: `prereq-${sourceSkillId}-${dependent}-${targetSkillId}-${prerequisite}`,
      from: sourceSkillId,
      to: targetSkillId,
      label: pair,
      title: `HAS_SKILL_PREREQUISITE: ${pair}`,
      font: {
        size: 9.5,
        color: '#DC2626',
        background: '#FEF2F2',
        strokeWidth: 0,
        align: 'horizontal',
      },
      color: { color: '#F87171', highlight: '#DC2626', hover: '#DC2626' },
      arrows: { to: { enabled: true, scaleFactor: 0.8 } },
      width: 2,
      dashes: [4, 4],
    }
  }

  function getNodeTheme(n: PlaygroundCustomNode, isCompact: boolean) {
    if (n.nodeType === 'targetRole') {
      return {
        color: {
          background: '#FFF7ED',
          border: '#EA580C',
          highlight: { background: '#FFEDD5', border: '#C2410C' },
          hover: { background: '#FFEDD5', border: '#EA580C' },
        },
        fontColor: '#0F172A',
        fontSize: isCompact ? 9.5 : 13,
        label: isCompact ? (n.code || n.id) : `<b>${n.code || n.id}</b>`,
        margin: isCompact ? { top: 6, right: 10, bottom: 6, left: 10 } : { top: 12, right: 16, bottom: 12, left: 16 },
        widthConstraint: isCompact ? { maximum: 130 } : { maximum: 200 },
      }
    }
    if (n.nodeType === 'level') {
      const lvl = n.levelName || n.code
      return {
        color: {
          background: '#EEF2FF',
          border: '#4F46E5',
          highlight: { background: '#E0E7FF', border: '#4338CA' },
          hover: { background: '#E0E7FF', border: '#4F46E5' },
        },
        fontColor: '#1E1B4B',
        fontSize: isCompact ? 9 : 11,
        label: isCompact ? lvl : `<b>${lvl}</b>`,
        margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 14, bottom: 8, left: 14 },
        widthConstraint: isCompact ? { maximum: 100 } : { maximum: 160 },
      }
    }
    if (n.nodeType === 'competency') {
      return {
        color: {
          background: '#FAF5FF',
          border: '#9333EA',
          highlight: { background: '#F3E8FF', border: '#7E22CE' },
          hover: { background: '#F3E8FF', border: '#9333EA' },
        },
        fontColor: '#581C87',
        fontSize: isCompact ? 9 : 11,
        label: isCompact ? (n.code || n.id) : `<b>${n.code || n.id}</b>\n${n.name}`,
        margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 14, bottom: 8, left: 14 },
        widthConstraint: isCompact ? { maximum: 110 } : { maximum: 220 },
      }
    }
    // skill
    return {
      color: {
        background: '#F0FDF4',
        border: '#16A34A',
        highlight: { background: '#DCFCE7', border: '#15803D' },
        hover: { background: '#DCFCE7', border: '#16A34A' },
      },
      fontColor: '#0F172A',
      fontSize: isCompact ? 9 : 11,
      label: isCompact ? n.code : `<b>${n.code}</b>\n${n.name}`,
      margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 14, bottom: 8, left: 14 },
      widthConstraint: isCompact ? { maximum: 100 } : { maximum: 200 },
    }
  }

  function getEdgeTheme(e: Edge) {
    const idStr = String(e.id || '')
    if (idStr.startsWith('has-level-')) {
      return {
        color: { color: '#818CF8', highlight: '#4F46E5', hover: '#4338CA' },
        activeColor: { color: '#4F46E5', highlight: '#4F46E5', hover: '#4338CA' },
        width: 1.5,
        activeWidth: 2,
    }
  }
    if (idStr.startsWith('requires-comp-') || idStr.startsWith('has-comp-')) {
      return {
        color: { color: '#C084FC', highlight: '#9333EA', hover: '#7E22CE' },
        activeColor: { color: '#9333EA', highlight: '#9333EA', hover: '#7E22CE' },
        width: 1.5,
        activeWidth: 2,
      }
    }
    if (idStr.startsWith('requires-skill-')) {
      return {
        color: { color: '#CBD5E1', highlight: '#64748B', hover: '#475569' },
        activeColor: { color: '#64748B', highlight: '#64748B', hover: '#475569' },
        width: 1,
        activeWidth: 1.5,
      }
    }
    if (idStr.startsWith('has-skill-')) {
      return {
        color: { color: '#86EFAC', highlight: '#16A34A', hover: '#15803D' },
        activeColor: { color: '#16A34A', highlight: '#16A34A', hover: '#15803D' },
        width: 1.5,
        activeWidth: 2,
      }
    }
    if (idStr.startsWith('prereq-')) {
      return {
        color: { color: '#F87171', highlight: '#DC2626', hover: '#DC2626' },
        activeColor: { color: '#DC2626', highlight: '#DC2626', hover: '#DC2626' },
        width: 2,
        activeWidth: 2.5,
      }
    }
    return {
      color: { color: '#94A3B8', highlight: '#EA580C', hover: '#64748B' },
      activeColor: { color: '#EA580C', highlight: '#EA580C', hover: '#EA580C' },
      width: 1.5,
      activeWidth: 2,
    }
  }

  // Level-of-Detail (LOD): Semantic Zooming updates node labels
  const applyLOD = React.useCallback((isCompact: boolean) => {
    const all = nodesDataSetRef.current.get()
    const updates = all.map((n) => {
      const theme = getNodeTheme(n, isCompact)
      return {
        id: n.id,
        label: theme.label,
        font: {
          size: theme.fontSize,
          multi: 'html' as const,
          face: 'IBM Plex Sans, sans-serif',
          color: theme.fontColor,
        },
        margin: theme.margin,
        widthConstraint: theme.widthConstraint,
      }
    })
    nodesDataSetRef.current.update(updates)
  }, [])

  // Neighbor Dimming on Selection / Focus
  const applyNeighborDimming = React.useCallback((activeId: string) => {
    if (!networkRef.current) return
    const connectedNodeIds = new Set(networkRef.current.getConnectedNodes(activeId).map(String))
    connectedNodeIds.add(activeId)
    const connectedEdgeIds = new Set(networkRef.current.getConnectedEdges(activeId).map(String))

    const isCompact = isCompactViewRef.current
    const allNodes = nodesDataSetRef.current.get()
    const nodeUpdates = allNodes.map((n) => {
      const isConnected = connectedNodeIds.has(n.id)
      const theme = getNodeTheme(n, isCompact)
      if (isConnected) {
        return {
          id: n.id,
          opacity: 1,
          color: theme.color,
          font: {
            color: theme.fontColor,
            size: theme.fontSize,
            multi: 'html' as const,
            face: 'IBM Plex Sans, sans-serif',
          },
        }
      } else {
        return {
          id: n.id,
          opacity: 0.15,
          color: {
            background: 'rgba(248, 250, 252, 0.4)',
            border: 'rgba(203, 213, 225, 0.4)',
            highlight: { background: 'rgba(248, 250, 252, 0.4)', border: 'rgba(203, 213, 225, 0.4)' },
            hover: { background: 'rgba(248, 250, 252, 0.4)', border: 'rgba(203, 213, 225, 0.4)' },
          },
          font: {
            color: 'rgba(148, 163, 184, 0.35)',
            size: theme.fontSize,
            multi: 'html' as const,
            face: 'IBM Plex Sans, sans-serif',
          },
        }
      }
    })
    nodesDataSetRef.current.update(nodeUpdates)

    const allEdges = edgesDataSetRef.current.get()
    const edgeUpdates = allEdges.map((e) => {
      const isConnected = connectedEdgeIds.has(String(e.id))
      const edgeTheme = getEdgeTheme(e)
      if (isConnected) {
        return {
          id: e.id,
          color: {
            ...edgeTheme.activeColor,
            opacity: 1,
          },
          width: edgeTheme.activeWidth,
        }
      } else {
        return {
          id: e.id,
          color: {
            color: '#CBD5E1',
            opacity: 0.1,
          },
          width: 1,
        }
      }
    })
    edgesDataSetRef.current.update(edgeUpdates)
  }, [])

  const clearNeighborDimming = React.useCallback(() => {
    const isCompact = isCompactViewRef.current
    const allNodes = nodesDataSetRef.current.get()
    const nodeUpdates = allNodes.map((n) => {
      const theme = getNodeTheme(n, isCompact)
      return {
        id: n.id,
        opacity: 1,
        color: theme.color,
        font: {
          color: theme.fontColor,
          size: theme.fontSize,
          multi: 'html' as const,
          face: 'IBM Plex Sans, sans-serif',
        },
      }
    })
    nodesDataSetRef.current.update(nodeUpdates)

    const allEdges = edgesDataSetRef.current.get()
    const edgeUpdates = allEdges.map((e) => {
      const edgeTheme = getEdgeTheme(e)
      return {
        id: e.id,
        color: {
          ...edgeTheme.color,
          opacity: 1,
        },
        width: edgeTheme.width,
      }
    })
    edgesDataSetRef.current.update(edgeUpdates)
  }, [])

  // Anti-collision: Ensure nodes cannot overlap each other
  const resolveNoOverlap = React.useCallback(
    (
      targetId: string,
      targetPos: { x: number; y: number },
      allPositions?: Record<string, { x: number; y: number }>
    ): { x: number; y: number } => {
      const positions = allPositions || (networkRef.current ? networkRef.current.getPositions() : {})
      const nodes = canvasNodesRef.current
      const targetNode = nodes.find((n) => n.id === targetId)
      const targetIsComp = targetNode?.nodeType === 'competency'

      let currentX = targetPos.x
      let currentY = targetPos.y

      // Run relaxation passes to resolve collisions against all neighboring nodes
      for (let pass = 0; pass < 6; pass++) {
        let hadCollision = false

        for (const otherNode of nodes) {
          if (otherNode.id === targetId) continue
          const otherPos = positions[otherNode.id]
          if (!otherPos) continue

          const otherIsComp = otherNode.nodeType === 'competency'
          // Elliptical safe clearance: width & height based on node bounding box
          const safeW = targetIsComp && otherIsComp ? 230 : targetIsComp || otherIsComp ? 200 : 180
          const safeH = targetIsComp && otherIsComp ? 85 : targetIsComp || otherIsComp ? 75 : 65

          let dx = currentX - otherPos.x
          let dy = currentY - otherPos.y

          if (dx === 0 && dy === 0) {
            dx = 15
            dy = 15
          }

          const normDistSq = (dx * dx) / (safeW * safeW) + (dy * dy) / (safeH * safeH)

          if (normDistSq < 1.0) {
            hadCollision = true
            const normDist = Math.sqrt(normDistSq)
            const penetration = Math.max(1.06 / Math.max(normDist, 0.05), 1.06)
            currentX = Math.round(otherPos.x + dx * penetration)
            currentY = Math.round(otherPos.y + dy * penetration)
          }
        }

        if (!hadCollision) break
      }

      return { x: currentX, y: currentY }
    },
    []
  )

  // Find nearest clear slot on canvas that does not overlap any existing node
  const findClearSlot = React.useCallback(
    (
      basePos: { x: number; y: number },
      nodeType: 'targetRole' | 'level' | 'competency' | 'skill'
    ): { x: number; y: number } => {
      const positions = networkRef.current ? networkRef.current.getPositions() : {}
      const existing = canvasNodesRef.current
      if (existing.length === 0) return basePos

      const isComp = nodeType === 'competency' || nodeType === 'targetRole' || nodeType === 'level'

      const isCollisionFree = (candidate: { x: number; y: number }) => {
        for (const other of existing) {
          const otherPos = positions[other.id] || { x: other.x ?? 0, y: other.y ?? 0 }
          const otherIsComp = other.nodeType === 'competency'
          const safeW = isComp && otherIsComp ? 230 : isComp || otherIsComp ? 200 : 180
          const safeH = isComp && otherIsComp ? 85 : isComp || otherIsComp ? 75 : 65

          const dx = candidate.x - otherPos.x
          const dy = candidate.y - otherPos.y
          const normDistSq = (dx * dx) / (safeW * safeW) + (dy * dy) / (safeH * safeH)
          if (normDistSq < 1.0) return false
        }
        return true
      }

      if (isCollisionFree(basePos)) return basePos

      // Spiral outward to find the nearest non-overlapping slot
      for (let ring = 1; ring <= 15; ring++) {
        const stepRadius = ring * 140
        const steps = Math.max(6 * ring, 8)
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * 2 * Math.PI
          const candidate = {
            x: Math.round(basePos.x + stepRadius * 1.4 * Math.cos(angle)),
            y: Math.round(basePos.y + stepRadius * 0.7 * Math.sin(angle)),
          }
          if (isCollisionFree(candidate)) {
            return candidate
          }
        }
      }

      return basePos
    },
    []
  )

  // Expand Neighbors of a given node
  const handleExpandNeighbors = React.useCallback((nodeId: string) => {
    const current = canvasNodesRef.current.find((n) => n.id === nodeId)
    if (!current) return

    const centerPos = networkRef.current?.getPosition(nodeId) || { x: 0, y: 0 }
    const existingNodeIds = new Set<string>([
      ...canvasNodesRef.current.map((n) => String(n.id)),
      ...(nodesDataSetRef.current ? nodesDataSetRef.current.getIds().map(String) : [])
    ])
    const existingEdgeIds = new Set<string>([
      ...canvasEdgesRef.current.map((e) => String(e.id || '')),
      ...(edgesDataSetRef.current ? edgesDataSetRef.current.getIds().map(String) : [])
    ])

    const nodesToAdd: PlaygroundCustomNode[] = []
    const edgesToAdd: Edge[] = []

    if (current.nodeType === 'targetRole') {
      const activeComp = getActiveCompany()
      const allRoles = (targetRolesRef.current || targetRoles || [])
      const role =
        allRoles.find((r: TargetRoleModel) => r.id === current.id || r.code === current.code) ||
        activeComp?.targetRoles?.find((r: TargetRoleModel) => r.id === current.id || r.code === current.code)
      if (role) {
        // Find effective level competencies: if this role has empty mappings, inherit from predecessor in the same lineage
        const baseCode = (role.stableId || role.code || '').split('#')[0].trim().toUpperCase()
        const lineageRoleWithComps = allRoles.find((r: TargetRoleModel) => {
          const rBase = (r.stableId || r.code || '').split('#')[0].trim().toUpperCase()
          return rBase === baseCode && (
            (r.levelCompetencies && Object.values(r.levelCompetencies).some((list) => Array.isArray(list) && list.length > 0)) ||
            (r.competencyIds && r.competencyIds.length > 0)
          )
        })
        const effectiveLevelCompetencies = (
          role.levelCompetencies && Object.values(role.levelCompetencies).some((list) => Array.isArray(list) && list.length > 0)
        ) ? role.levelCompetencies : (lineageRoleWithComps?.levelCompetencies || {})

        const effectiveRoleCompIds = new Set<string>()
        Object.values(effectiveLevelCompetencies).flat().forEach((cid) => effectiveRoleCompIds.add(cid as string))
        if (effectiveRoleCompIds.size === 0) {
          ;(role.competencyIds || []).forEach((cid) => effectiveRoleCompIds.add(cid))
          ;(lineageRoleWithComps?.competencyIds || []).forEach((cid) => effectiveRoleCompIds.add(cid))
        }

        // Only include competencies strictly assigned to this role
        const relevantComps = competenciesRef.current.filter((c) =>
          effectiveRoleCompIds.has(c.id) || (c.code && effectiveRoleCompIds.has(c.code))
        )

        // Deduplicate relevantComps by ID
        const seenCompIds = new Set<string>()
        const uniqueRelevantComps = relevantComps.filter((c) => {
          if (!c?.id || seenCompIds.has(c.id)) return false
          seenCompIds.add(c.id)
          return true
        })

        const configuredLevels = Array.isArray(role.levels) && role.levels.length > 0 ? role.levels : []
        const levelNamesFromComps = Object.keys(effectiveLevelCompetencies)
        const levelNamesFromSkills = (role.skillTargets || []).map((st: SkillTargetConfig) => st.level).filter(Boolean) as string[]
        const combinedLevels = Array.from(new Set([...configuredLevels, ...levelNamesFromComps, ...levelNamesFromSkills]))
        const effectiveLevels = combinedLevels.length > 0 ? combinedLevels : ['Junior', 'Middle', 'Senior', 'Fresher']

        const levelSpacing = 200
        const totalWidth = (effectiveLevels.length - 1) * levelSpacing
        const startX = centerPos.x - totalWidth / 2
        const levelY = centerPos.y + 140

        const levelNodeMap: Record<string, PlaygroundCustomNode> = {}

        // 1. Build and position Level nodes
        effectiveLevels.forEach((lvl, lIdx) => {
          const rawPos = {
            x: Math.round(startX + lIdx * levelSpacing),
            y: levelY,
          }
          const pos = findClearSlot(rawPos, 'level')
          const lvlNode = buildLevelNode(role, lvl, pos)
          levelNodeMap[lvl.toLowerCase()] = lvlNode
          if (!existingNodeIds.has(lvlNode.id)) {
            nodesToAdd.push(lvlNode)
            existingNodeIds.add(lvlNode.id)
          }
          const levelEdge = buildHasLevelEdge(role.id, lvlNode.id)
          if (!existingEdgeIds.has(String(levelEdge.id))) {
            existingEdgeIds.add(String(levelEdge.id))
            edgesToAdd.push(levelEdge)
          }
        })

        // 2. Build and position Competency nodes (strictly only uniqueRelevantComps)
        const compY = levelY + 160
        const compSpacing = 220
        const compTotalWidth = (uniqueRelevantComps.length - 1) * compSpacing
        const compStartX = centerPos.x - compTotalWidth / 2
        const compNodeMap: Record<string, PlaygroundCustomNode> = {}

        uniqueRelevantComps.forEach((comp, cIdx) => {
          let compNode = canvasNodesRef.current.find((n) => n.id === comp.id) || nodesToAdd.find((n) => n.id === comp.id)
          if (!compNode && !existingNodeIds.has(comp.id)) {
            const rawCompPos = {
              x: Math.round(compStartX + cIdx * compSpacing),
              y: compY,
            }
            const compSlot = findClearSlot(rawCompPos, 'competency')
            compNode = buildCompetencyNode(comp, compSlot)
            nodesToAdd.push(compNode)
            existingNodeIds.add(comp.id)
          }
          if (compNode) {
            compNodeMap[comp.id] = compNode
            if (comp.code) compNodeMap[comp.code] = compNode
          }

          // Connect level(s) to this competency via HAS_COMPETENCY
          const assignedLevelNames = Object.entries(effectiveLevelCompetencies)
            .filter(([, compIds]) => Array.isArray(compIds) && (compIds.includes(comp.id) || (comp.code && compIds.includes(comp.code))))
            .map(([lvl]) => lvl)

          const targetLevelNames = assignedLevelNames.length > 0
            ? assignedLevelNames
            : (effectiveLevels.length > 0 ? [effectiveLevels[0]] : [])

          targetLevelNames.forEach((lvl) => {
            const lvlNode = levelNodeMap[lvl.toLowerCase()]
            if (lvlNode) {
              const reqEdge = buildRequiresCompetencyEdge(lvlNode.id, comp.id)
              if (!existingEdgeIds.has(String(reqEdge.id))) {
                existingEdgeIds.add(String(reqEdge.id))
                edgesToAdd.push(reqEdge)
              }
            }
          })
        })

        // 3. Build and position Micro-skill nodes (strictly only role.skillTargets)
        const configuredSkillTargets = role.skillTargets || []
        const skillY = compY + 160
        const skillSpacing = 220
        const skillTotalWidth = (configuredSkillTargets.length - 1) * skillSpacing
        const skillStartX = centerPos.x - skillTotalWidth / 2
        const seenSkillIds = new Set<string>()

        configuredSkillTargets.forEach((st: SkillTargetConfig, sIdx: number) => {
          const targetSkill = microSkillsRef.current.find(
            (s) => s.id === st.skillId || s.code === st.skillCode || s.code === st.skillId
          )
          if (!targetSkill) return

          // Find parent competency
          const parentComp = uniqueRelevantComps.find(
            (c) =>
              c.skillIds?.includes(targetSkill.id) ||
              (targetSkill.code && c.skillIds?.includes(targetSkill.code))
          )

          const parentCompNode = parentComp ? compNodeMap[parentComp.id] : null
          const targetLvlNode = st.level
            ? levelNodeMap[st.level.toLowerCase()]
            : (parentCompNode ? null : Object.values(levelNodeMap)[0])

          if (!existingNodeIds.has(targetSkill.id) && !seenSkillIds.has(targetSkill.id)) {
            seenSkillIds.add(targetSkill.id)
            const rawSkillPos = {
              x: Math.round(skillStartX + sIdx * skillSpacing),
              y: skillY,
            }
            const skillSlot = findClearSlot(rawSkillPos, 'skill')
            nodesToAdd.push(buildSkillNode(targetSkill, skillSlot))
            existingNodeIds.add(targetSkill.id)
          }

          // Edge from parent competency (:Competency)-[:HAS_SKILL]->(:MicroSkill)
          if (parentComp) {
            const hasSkillEdge = buildHasSkillEdge(parentComp.id, targetSkill.id)
            if (!existingEdgeIds.has(String(hasSkillEdge.id))) {
              existingEdgeIds.add(String(hasSkillEdge.id))
              edgesToAdd.push(hasSkillEdge)
            }
          }

          // Directed edge from Level (:Level)-[:REQUIRES_SKILL {threshold}]->(:MicroSkill)
          if (targetLvlNode) {
            const reqSkillEdge = buildRequiresSkillEdge(targetLvlNode.id, targetSkill.id, st.requiredKnowledgeLevels ?? [])
            if (!existingEdgeIds.has(String(reqSkillEdge.id))) {
              existingEdgeIds.add(String(reqSkillEdge.id))
              edgesToAdd.push(reqSkillEdge)
            }
          }
        })
      }
    } else if (current.nodeType === 'level') {
      const roleId = current.targetRoleId
      const allRoles = (targetRolesRef.current || targetRoles || [])
      const role = allRoles.find((r) => r.id === roleId)
      if (role && current.levelName) {
        const baseCode = (role.stableId || role.code || '').split('#')[0].trim().toUpperCase()
        const lineageRole = allRoles.find((r: TargetRoleModel) => {
          const rBase = (r.stableId || r.code || '').split('#')[0].trim().toUpperCase()
          return rBase === baseCode && r.levelCompetencies?.[current.levelName!]?.length
        })
        const lvlComps = (role.levelCompetencies?.[current.levelName] && role.levelCompetencies[current.levelName].length > 0)
          ? role.levelCompetencies[current.levelName]
          : (lineageRole?.levelCompetencies?.[current.levelName] || [])

        const matchingComps = competenciesRef.current.filter((c) =>
          lvlComps.includes(c.id) || (c.code && lvlComps.includes(c.code))
        )
        matchingComps.forEach((comp, idx) => {
          if (!existingNodeIds.has(comp.id)) {
            const angle = (idx / Math.max(matchingComps.length, 1)) * 2 * Math.PI
            const pos = findClearSlot({
              x: Math.round(centerPos.x + 220 * Math.cos(angle)),
              y: Math.round(centerPos.y + 220 * Math.sin(angle)),
            }, 'competency')
            nodesToAdd.push(buildCompetencyNode(comp, pos))
            existingNodeIds.add(comp.id)
          }
          const reqEdge = buildRequiresCompetencyEdge(current.id, comp.id)
          if (!existingEdgeIds.has(String(reqEdge.id || ''))) {
            existingEdgeIds.add(String(reqEdge.id || ''))
            edgesToAdd.push(reqEdge)
          }
        })

        // Also expand/connect required skills from role.skillTargets for this level
        const matchingSkills = (role.skillTargets || []).filter(
          (st: SkillTargetConfig) => st.level?.toLowerCase() === current.levelName!.toLowerCase()
        )
        matchingSkills.forEach((st, idx) => {
          const s = microSkillsRef.current.find(
            (sk) => sk.id === st.skillId || sk.code === st.skillCode || sk.code === st.skillId
          )
          if (s) {
            if (!existingNodeIds.has(s.id)) {
              const angle = ((matchingComps.length + idx) / Math.max(matchingComps.length + matchingSkills.length, 1)) * 2 * Math.PI
              const pos = findClearSlot({
                x: Math.round(centerPos.x + 280 * Math.cos(angle)),
                y: Math.round(centerPos.y + 280 * Math.sin(angle)),
              }, 'skill')
              nodesToAdd.push(buildSkillNode(s, pos))
              existingNodeIds.add(s.id)
            }
            const reqSkillEdge = buildRequiresSkillEdge(current.id, s.id, st.requiredKnowledgeLevels ?? [])
            if (!existingEdgeIds.has(String(reqSkillEdge.id || ''))) {
              existingEdgeIds.add(String(reqSkillEdge.id || ''))
              edgesToAdd.push(reqSkillEdge)
            }
          }
        })
      }
    
    } else if (current.nodeType === 'competency') {
      const comp = competenciesRef.current.find((c) => c.id === current.id)
      if (comp) {
        const memberSkillIds = comp.skillIds || []
        const missingSkills = microSkillsRef.current.filter(
          (s) => (memberSkillIds.includes(s.id) || memberSkillIds.includes(s.code)) && !existingNodeIds.has(s.id)
        )

        const radius = Math.max(220, Math.round(missingSkills.length * 35))
        missingSkills.forEach((s, idx) => {
          const angle = (idx / Math.max(missingSkills.length, 1)) * 2 * Math.PI
          const rawPos = {
            x: Math.round(centerPos.x + radius * Math.cos(angle)),
            y: Math.round(centerPos.y + radius * Math.sin(angle)),
          }
          const pos = findClearSlot(rawPos, 'skill')
          nodesToAdd.push(buildSkillNode(s, pos))
          existingNodeIds.add(s.id)
        })
      }
    } else {
      // MicroSkill: find parent competencies & prerequisite skills
      const parentComps = competenciesRef.current.filter(
        (c) => (c.skillIds || []).includes(current.id) || (c.skillIds || []).includes(current.code)
      )
      const missingComps = parentComps.filter((c) => !existingNodeIds.has(c.id))

      const prereqSkillIds = new Set<string>()
      prerequisitesRef.current.forEach((p) => {
        if (p.sourceSkillId === current.id || p.sourceSkillCode === current.code) {
          if (p.targetSkillId && !existingNodeIds.has(p.targetSkillId)) prereqSkillIds.add(p.targetSkillId)
        }
        if (p.targetSkillId === current.id || p.targetSkillCode === current.code) {
          if (p.sourceSkillId && !existingNodeIds.has(p.sourceSkillId)) prereqSkillIds.add(p.sourceSkillId)
        }
      })
      const missingPrereqSkills = microSkillsRef.current.filter((s) => prereqSkillIds.has(s.id) && !existingNodeIds.has(s.id))

      const totalMissing = missingComps.length + missingPrereqSkills.length
      let count = 0
      const radius = Math.max(240, Math.round(totalMissing * 35))

      missingComps.forEach((c) => {
        const angle = (count / Math.max(totalMissing, 1)) * 2 * Math.PI
        count++
        const rawPos = {
          x: Math.round(centerPos.x + radius * Math.cos(angle)),
          y: Math.round(centerPos.y + radius * Math.sin(angle)),
        }
        const pos = findClearSlot(rawPos, 'competency')
        nodesToAdd.push(buildCompetencyNode(c, pos))
        existingNodeIds.add(c.id)
      })

      missingPrereqSkills.forEach((s) => {
        const angle = (count / Math.max(totalMissing, 1)) * 2 * Math.PI
        count++
        const rawPos = {
          x: Math.round(centerPos.x + radius * Math.cos(angle)),
          y: Math.round(centerPos.y + radius * Math.sin(angle)),
        }
        const pos = findClearSlot(rawPos, 'skill')
        nodesToAdd.push(buildSkillNode(s, pos))
        existingNodeIds.add(s.id)
      })
    }

    // Connect any missing edges between all nodes that will now be visible
    const allFutureNodeIds = existingNodeIds

    competenciesRef.current.forEach((c) => {
      if (allFutureNodeIds.has(c.id)) {
        ;(c.skillIds || []).forEach((sId) => {
          const target = microSkillsRef.current.find((s) => s.id === sId || s.code === sId)
          if (target && allFutureNodeIds.has(target.id)) {
            const edgeId = `has-skill-${c.id}-${target.id}`
            if (!existingEdgeIds.has(edgeId)) {
              existingEdgeIds.add(edgeId)
              edgesToAdd.push(buildHasSkillEdge(c.id, target.id))
            }
          }
        })
      }
    })

    prerequisitesRef.current.forEach((p) => {
      if (allFutureNodeIds.has(p.sourceSkillId) && allFutureNodeIds.has(p.targetSkillId)) {
        const edgeId = `prereq-${p.sourceSkillId}-${p.targetSkillId}`
        if (!existingEdgeIds.has(edgeId)) {
          existingEdgeIds.add(edgeId)
          edgesToAdd.push(buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel))
        }
      }
    })

    // Connect Level -> Competency (REQUIRES_COMPETENCY) and Level -> Skill (REQUIRES_SKILL) for visible levels
    const allVisibleNodes = [...canvasNodesRef.current, ...nodesToAdd]
    const allRoles = targetRolesRef.current || targetRoles || []

    allVisibleNodes.forEach((node) => {
      if (node.nodeType === 'level' && allFutureNodeIds.has(node.id)) {
        const role = allRoles.find((r) => r.id === node.targetRoleId)
        const lvlName = node.levelName || node.code
        if (role && lvlName) {
          const lvlComps = role.levelCompetencies?.[lvlName] || []
          lvlComps.forEach((cId) => {
            const comp = competenciesRef.current.find((c) => c.id === cId || c.code === cId)
            if (comp && allFutureNodeIds.has(comp.id)) {
              const edgeId = `requires-comp-${node.id}-${comp.id}`
              if (!existingEdgeIds.has(edgeId)) {
                existingEdgeIds.add(edgeId)
                edgesToAdd.push(buildRequiresCompetencyEdge(node.id, comp.id))
              }
            }
          })
          ;(role.skillTargets || []).forEach((st) => {
            if (st.level?.toLowerCase() === lvlName.toLowerCase()) {
              const skill = microSkillsRef.current.find(
                (s) => s.id === st.skillId || s.code === st.skillCode || s.code === st.skillId
              )
              if (skill && allFutureNodeIds.has(skill.id)) {
                const edgeId = `requires-skill-${node.id}-${skill.id}`
                if (!existingEdgeIds.has(edgeId)) {
                  existingEdgeIds.add(edgeId)
                  edgesToAdd.push(buildRequiresSkillEdge(node.id, skill.id, st.requiredKnowledgeLevels ?? []))
                }
              }
            }
          })
        }
      }
    })

    // Final deduplication against both nodesDataSetRef and within the batch
    const currentDataSetNodeIds = new Set(nodesDataSetRef.current ? nodesDataSetRef.current.getIds().map(String) : [])
    const uniqueNodesToAdd: PlaygroundCustomNode[] = []
    const seenBatchNodeIds = new Set<string>()

    for (const node of nodesToAdd) {
      const idStr = String(node.id)
      if (!currentDataSetNodeIds.has(idStr) && !seenBatchNodeIds.has(idStr)) {
        seenBatchNodeIds.add(idStr)
        uniqueNodesToAdd.push(node)
      }
    }

    const currentDataSetEdgeIds = new Set(edgesDataSetRef.current ? edgesDataSetRef.current.getIds().map(String) : [])
    const uniqueEdgesToAdd: Edge[] = []
    const seenBatchEdgeIds = new Set<string>()

    for (const edge of edgesToAdd) {
      const idStr = String(edge.id || '')
      if (idStr && !currentDataSetEdgeIds.has(idStr) && !seenBatchEdgeIds.has(idStr)) {
        seenBatchEdgeIds.add(idStr)
        uniqueEdgesToAdd.push(edge)
      }
    }

    if (uniqueNodesToAdd.length === 0 && uniqueEdgesToAdd.length === 0) {
      toast({
        title: 'All Neighbors Already Visible',
        description: `All direct relationships for "${current.code}" are already placed on the canvas.`,
        variant: 'default',
      })
      return
    }

    if (uniqueNodesToAdd.length > 0) {
      nodesDataSetRef.current?.add(uniqueNodesToAdd)
      setCanvasNodes((prev) => [...prev, ...uniqueNodesToAdd])
    }
    if (uniqueEdgesToAdd.length > 0) {
      edgesDataSetRef.current?.add(uniqueEdgesToAdd)
      setCanvasEdges((prev) => [...prev, ...uniqueEdgesToAdd])
    }

    toast({
      title: 'Neighbors Expanded',
      description: `Added ${uniqueNodesToAdd.length} connected node${uniqueNodesToAdd.length === 1 ? '' : 's'} around ${current.code}.`,
      variant: 'success',
    })
  }, [findClearSlot, toast])

  const applyLODRef = React.useRef(applyLOD)
  applyLODRef.current = applyLOD
  const applyNeighborDimmingRef = React.useRef(applyNeighborDimming)
  applyNeighborDimmingRef.current = applyNeighborDimming
  const clearNeighborDimmingRef = React.useRef(clearNeighborDimming)
  clearNeighborDimmingRef.current = clearNeighborDimming
  const handleExpandNeighborsRef = React.useRef(handleExpandNeighbors)
  handleExpandNeighborsRef.current = handleExpandNeighbors
  const resolveNoOverlapRef = React.useRef(resolveNoOverlap)
  resolveNoOverlapRef.current = resolveNoOverlap

  // Initialize vis-network once on mount
  React.useEffect(() => {
    if (!containerRef.current) return

    const options: Options = {
      layout: { improvedLayout: false },
      nodes: {
        borderWidth: 2,
        shadow: { enabled: false },
      },
      edges: {
        width: 1.5,
        smooth: { enabled: true, type: 'continuous', roundness: 0.35 },
      },
      physics: {
        enabled: false,
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
        dragNodes: true,
      },
    }

    const network = new Network(
      containerRef.current,
      { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
      options
    )
    networkRef.current = network

    // Level-of-Detail (LOD): Semantic Zooming
    network.on('zoom', (params) => {
      const scale = params.scale
      const isCompact = scale < 0.6
      if (isCompact !== isCompactViewRef.current) {
        isCompactViewRef.current = isCompact
        applyLODRef.current(isCompact)
      }
    })

    // Selection & Connection Click Listener
    network.on('click', (params) => {
      // 1. If Connecting Mode is active, clicking any node on canvas links it as target!
      if (isConnectModeRef.current && connectSourceNodeRef.current) {
        if (params.nodes && params.nodes.length > 0) {
          const targetId = String(params.nodes[0])
          const targetNode = canvasNodesRef.current.find((n) => n.id === targetId)
          if (targetNode) {
            handleNodeClickForConnectRef.current(targetNode)
            return
          }
        }
        // Clicking empty space cancels connect mode
        setIsConnectMode(false)
        setConnectSourceNode(null)
        isConnectModeRef.current = false
        connectSourceNodeRef.current = null
        return
      }

      // 2. Normal Node Selection
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = String(params.nodes[0])
        const node = canvasNodesRef.current.find((n) => n.id === nodeId)
        if (node) {
          setSelectedNode(node)
          setSelectedEdge(null)
          applyNeighborDimmingRef.current(node.id)
          return
        }
      }

      // 3. Normal Edge Selection
      if (params.edges && params.edges.length > 0) {
        const edgeId = String(params.edges[0])
        const edge = canvasEdgesRef.current.find((e) => e.id === edgeId)
        if (edge) {
          setSelectedEdge(edge)
          setSelectedNode(null)
          clearNeighborDimmingRef.current()
          return
        }
      }

      // 4. Click empty canvas -> deselect
      setSelectedNode(null)
      setSelectedEdge(null)
      clearNeighborDimmingRef.current()
    })

    // Double-click to expand neighbors
    network.on('doubleClick', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = String(params.nodes[0])
        handleExpandNeighborsRef.current(nodeId)
      }
    })

    // Anti-collision & location persistence: prevent node overlap and keep dragged location permanent
    network.on('dragEnd', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const allPositions = network.getPositions()
        params.nodes.forEach((nodeId: string | number) => {
          const idStr = String(nodeId)
          const currentPos = allPositions[idStr]
          if (currentPos) {
            const resolvedPos = resolveNoOverlapRef.current(idStr, currentPos, allPositions)
            if (resolvedPos.x !== currentPos.x || resolvedPos.y !== currentPos.y) {
              network.moveNode(idStr, resolvedPos.x, resolvedPos.y)
              allPositions[idStr] = resolvedPos
            }
            nodesDataSetRef.current.update({ id: idStr, x: resolvedPos.x, y: resolvedPos.y })
            canvasNodesRef.current = canvasNodesRef.current.map((n) =>
              n.id === idStr ? { ...n, x: resolvedPos.x, y: resolvedPos.y } : n
            )
          }
        })
      }
    })

    return () => {
      try { network.destroy() } catch {}
      networkRef.current = null
    }
  }, [])

  // Resize network when the activeTab becomes 'graph'
  const hasFittedGraphRef = React.useRef(false)
  React.useEffect(() => {
    if (activeTab === 'graph') {
      const timer = setTimeout(() => {
        if (networkRef.current && containerRef.current) {
          const w = containerRef.current.clientWidth || 800
          const h = containerRef.current.clientHeight || 650
          networkRef.current.setSize(`${w}px`, `${h}px`)
          networkRef.current.redraw()
          if (!hasFittedGraphRef.current && canvasNodesRef.current.length > 0) {
            hasFittedGraphRef.current = true
            networkRef.current.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
          }
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeTab])

  // Clear Canvas
  const handleClearCanvas = () => {
    nodesDataSetRef.current.clear()
    edgesDataSetRef.current.clear()
    setCanvasNodes([])
    setCanvasEdges([])
    setSelectedNode(null)
    setSelectedEdge(null)
    toast({ title: 'Canvas Cleared', description: 'Removed all nodes from playground canvas.', variant: 'default' })
  }

  // Quick Load Focal Sample (Top 5 Competencies and their member micro-skills)
  const handleLoadFocalSample = () => {
    nodesDataSetRef.current.clear()
    edgesDataSetRef.current.clear()

    const topComps = competencies
      .slice()
      .sort((a, b) => (b.skillIds?.length || 0) - (a.skillIds?.length || 0))
      .slice(0, 5)

    const sampleNodes: PlaygroundCustomNode[] = []
    const sampleEdges: Edge[] = []
    const seenNodeIds = new Set<string>()
    const seenEdgeIds = new Set<string>()

    const clusterCenters = [
      { x: 0, y: 0 },
      { x: -750, y: -450 },
      { x: 750, y: -450 },
      { x: -750, y: 450 },
      { x: 750, y: 450 },
    ]

    topComps.forEach((c, cIdx) => {
      const center = topComps.length === 1 ? { x: 0, y: 0 } : clusterCenters[cIdx % clusterCenters.length]
      if (!seenNodeIds.has(c.id)) {
        seenNodeIds.add(c.id)
        sampleNodes.push(buildCompetencyNode(c, center))
      }
      const memberSkillIds = c.skillIds || []
      const radius = Math.max(220, Math.round(memberSkillIds.length * 35))
      memberSkillIds.forEach((sId, sIdx) => {
        const s = microSkills.find((ms) => ms.id === sId || ms.code === sId)
        if (s && !seenNodeIds.has(s.id)) {
          seenNodeIds.add(s.id)
          const angle = (sIdx / Math.max(memberSkillIds.length, 1)) * 2 * Math.PI
          const skillPos = {
            x: Math.round(center.x + radius * Math.cos(angle)),
            y: Math.round(center.y + radius * Math.sin(angle)),
          }
          sampleNodes.push(buildSkillNode(s, skillPos))
        }
        if (s) {
          const edgeId = `has-skill-${c.id}-${s.id}`
          if (!seenEdgeIds.has(edgeId)) {
            seenEdgeIds.add(edgeId)
            sampleEdges.push(buildHasSkillEdge(c.id, s.id))
          }
        }
      })
    })

    // Add prerequisites between visible skills
    prerequisites.forEach((p) => {
      if (seenNodeIds.has(p.sourceSkillId) && seenNodeIds.has(p.targetSkillId)) {
        const edgeId = `prereq-${p.sourceSkillId}-${p.targetSkillId}`
        if (!seenEdgeIds.has(edgeId)) {
          seenEdgeIds.add(edgeId)
          sampleEdges.push(buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel))
        }
      }
    })

    nodesDataSetRef.current.add(sampleNodes)
    edgesDataSetRef.current.add(sampleEdges)

    setCanvasNodes(sampleNodes)
    setCanvasEdges(sampleEdges)
    setSelectedNode(null)
    setSelectedEdge(null)

    setTimeout(() => {
      networkRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
    }, 150)

    toast({
      title: 'Focal Sample Loaded',
      description: `Loaded ${sampleNodes.length} nodes (5 focal competencies and member skills). Double-click any node to expand.`,
      variant: 'success',
    })
  }

  // Load Full Catalog on Demand (with structured layout)
  const handleLoadFullCatalog = () => {
    nodesDataSetRef.current.clear()
    edgesDataSetRef.current.clear()

    const fullNodes: PlaygroundCustomNode[] = []
    const fullEdges: Edge[] = []
    const seenNodeIds = new Set<string>()
    const seenEdgeIds = new Set<string>()

    const SKILL_COLS = 8
    microSkills.forEach((s, idx) => {
      if (!seenNodeIds.has(s.id)) {
        seenNodeIds.add(s.id)
        const col = idx % SKILL_COLS
        const row = Math.floor(idx / SKILL_COLS)
        fullNodes.push(buildSkillNode(s, {
          x: Math.round((col - (SKILL_COLS - 1) / 2) * 230),
          y: Math.round(-650 - (row * 100)),
        }))
      }
    })

    const COMP_COLS = 12
    competencies.forEach((c, idx) => {
      if (!seenNodeIds.has(c.id)) {
        seenNodeIds.add(c.id)
        const col = idx % COMP_COLS
        const row = Math.floor(idx / COMP_COLS)
        fullNodes.push(buildCompetencyNode(c, {
          x: Math.round((col - (COMP_COLS - 1) / 2) * 250),
          y: Math.round(150 + (row * 110)),
        }))
      }
      ;(c.skillIds || []).forEach((sId) => {
        const target = microSkills.find((s) => s.id === sId || s.code === sId)
        if (target && seenNodeIds.has(target.id)) {
          const edgeId = `has-skill-${c.id}-${target.id}`
          if (!seenEdgeIds.has(edgeId)) {
            seenEdgeIds.add(edgeId)
            fullEdges.push(buildHasSkillEdge(c.id, target.id))
          }
        }
      })
    })

    prerequisites.forEach((p) => {
      if (seenNodeIds.has(p.sourceSkillId) && seenNodeIds.has(p.targetSkillId)) {
        const edgeId = `prereq-${p.sourceSkillId}-${p.targetSkillId}`
        if (!seenEdgeIds.has(edgeId)) {
          seenEdgeIds.add(edgeId)
          fullEdges.push(buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel))
        }
      }
    })

    nodesDataSetRef.current.add(fullNodes)
    edgesDataSetRef.current.add(fullEdges)

    setCanvasNodes(fullNodes)
    setCanvasEdges(fullEdges)
    setSelectedNode(null)
    setSelectedEdge(null)

    setTimeout(() => {
      networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
    }, 250)

    toast({
      title: 'Full Catalog Loaded',
      description: `Loaded all ${fullNodes.length} nodes and ${fullEdges.length} edges in structured catalog layout.`,
      variant: 'default',
    })
  }

  // Add Item to Canvas (via click or drag)
  const handleAddItemToCanvas = (item: { id: string; type: 'targetRole' | 'level' | 'competency' | 'skill'; code: string; name: string }, specificPos?: { x: number; y: number }) => {
    const existing = canvasNodesRef.current.find((n) => n.id === item.id || n.code === item.code)
    if (existing) {
      networkRef.current?.selectNodes([existing.id])
      networkRef.current?.focus(existing.id, {
        scale: 1.25,
        animation: { duration: 300, easingFunction: 'easeInOutQuad' },
      })
      setSelectedNode(existing)
      applyNeighborDimming(existing.id)
      toast({
        title: 'Node Already on Canvas',
        description: `Focused camera on "${existing.code}". Duplicate nodes are prevented in the playground.`,
        variant: 'default',
      })
      return
    }

    let pos = specificPos
    if (!pos) {
      const viewPos = networkRef.current?.getViewPosition() || { x: 0, y: 0 }
      pos = findClearSlot(viewPos, item.type)
    } else {
      pos = findClearSlot(pos, item.type)
    }

    let newNode: PlaygroundCustomNode
    if (item.type === 'targetRole') {
      const fullRole = (targetRolesRef.current || targetRoles || []).find((r) => r.id === item.id || r.code === item.code)
      const rawStatus = (fullRole?.status || (item as unknown as { status?: string }).status || 'DRAFT').trim().toUpperCase()
      if (rawStatus !== 'DRAFT' && rawStatus !== 'REJECTED' && rawStatus !== 'REJECT') {
        toast({ title: 'Cannot add role', description: 'Only Draft or Rejected target roles can be explored on the graph.', variant: 'destructive' })
        return
      }
      if (fullRole) {
        newNode = buildTargetRoleNode(fullRole, pos)
      } else {
        newNode = buildTargetRoleNode({
          id: item.id,
          stableId: item.code,
          code: item.code,
          title: item.name,
          version: '1.0',
          status: 'draft',
          competencyIds: [],
          skillTargets: [],
          activeEnrollments: 0,
          description: '',
          updatedAt: new Date().toISOString(),
        }, pos)
      }
    } else if (item.type === 'competency') {
      const fullComp = competencies.find((c) => c.id === item.id) || {
        id: item.id,
        code: item.code,
        name: item.name,
        description: '',
        status: 'ACTIVE' as const,
        skillIds: [],
      }
      newNode = buildCompetencyNode(fullComp, pos)
    } else {
      const fullSkill = microSkills.find((s) => s.id === item.id) || {
        id: item.id,
        code: item.code,
        name: item.name,
        description: '',
        status: 'ACTIVE' as const,
      }
      newNode = buildSkillNode(fullSkill, pos)
    }

    const newEdges: Edge[] = []
    const existingIds = new Set(canvasNodesRef.current.map((n) => n.id))
    const allRoles = targetRolesRef.current || targetRoles || []

    if (newNode.nodeType === 'competency') {
      const comp = competencies.find((c) => c.id === newNode.id)
      if (comp) {
        ;(comp.skillIds || []).forEach((sId) => {
          const target = canvasNodesRef.current.find((n) => n.id === sId || n.code === sId)
          if (target) newEdges.push(buildHasSkillEdge(newNode.id, target.id))
        })
      }
      // Link to any Level nodes already on canvas that require this competency
      canvasNodesRef.current.forEach((n) => {
        if (n.nodeType === 'level') {
          const r = allRoles.find((tr) => tr.id === n.targetRoleId)
          const lvlName = n.levelName || n.code
          const lvlComps = r?.levelCompetencies?.[lvlName] || []
          if (lvlComps.includes(newNode.id) || (newNode.code && lvlComps.includes(newNode.code))) {
            newEdges.push(buildRequiresCompetencyEdge(n.id, newNode.id))
          }
        }
      })
    } else if (newNode.nodeType === 'skill') {
      competencies.forEach((comp) => {
        if ((comp.skillIds || []).includes(newNode.id) || (comp.skillIds || []).includes(newNode.code)) {
          if (existingIds.has(comp.id)) newEdges.push(buildHasSkillEdge(comp.id, newNode.id))
        }
      })
      prerequisites.forEach((p) => {
        if (p.sourceSkillId === newNode.id || p.sourceSkillCode === newNode.code) {
          const tgt = canvasNodesRef.current.find((n) => n.id === p.targetSkillId || n.code === p.targetSkillCode)
          if (tgt) newEdges.push(buildPrereqEdge(newNode.id, tgt.id, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel))
        }
        if (p.targetSkillId === newNode.id || p.targetSkillCode === newNode.code) {
          const src = canvasNodesRef.current.find((n) => n.id === p.sourceSkillId || n.code === p.sourceSkillCode)
          if (src) newEdges.push(buildPrereqEdge(src.id, newNode.id, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel))
        }
      })
      // Link to any Level nodes already on canvas that require this skill
      canvasNodesRef.current.forEach((n) => {
        if (n.nodeType === 'level') {
          const r = allRoles.find((tr) => tr.id === n.targetRoleId)
          const lvlName = n.levelName || n.code
          const st = (r?.skillTargets || []).find(
            (target) =>
              (target.skillId === newNode.id || target.skillCode === newNode.code || target.skillId === newNode.code) &&
              target.level?.toLowerCase() === lvlName?.toLowerCase()
          )
          if (st) {
            newEdges.push(buildRequiresSkillEdge(n.id, newNode.id, st.requiredKnowledgeLevels ?? []))
          }
        }
      })
    } else if (newNode.nodeType === 'level') {
      const r = allRoles.find((tr) => tr.id === newNode.targetRoleId)
      const lvlName = newNode.levelName || newNode.code
      if (r && lvlName) {
        // Link to role
        const roleNode = canvasNodesRef.current.find((n) => n.id === r.id)
        if (roleNode) {
          newEdges.push(buildHasLevelEdge(roleNode.id, newNode.id))
        }
        // Link to competencies
        const lvlComps = r.levelCompetencies?.[lvlName] || []
        canvasNodesRef.current.forEach((n) => {
          if (n.nodeType === 'competency' && (lvlComps.includes(n.id) || (n.code && lvlComps.includes(n.code)))) {
            newEdges.push(buildRequiresCompetencyEdge(newNode.id, n.id))
          }
          if (n.nodeType === 'skill') {
            const st = (r.skillTargets || []).find(
              (target) =>
                (target.skillId === n.id || target.skillCode === n.code || target.skillId === n.code) &&
                target.level?.toLowerCase() === lvlName.toLowerCase()
            )
            if (st) {
              newEdges.push(buildRequiresSkillEdge(newNode.id, n.id, st.requiredKnowledgeLevels ?? []))
            }
          }
        })
      }
    }

    const seenNewEdgeIds = new Set<string>()
    const uniqueNewEdges: Edge[] = []
    newEdges.forEach((e) => {
      const eId = String(e.id || '')
      if (eId && !seenNewEdgeIds.has(eId) && !edgesDataSetRef.current?.get(eId)) {
        seenNewEdgeIds.add(eId)
        uniqueNewEdges.push(e)
      }
    })

    nodesDataSetRef.current.add(newNode)
    if (uniqueNewEdges.length > 0) edgesDataSetRef.current.add(uniqueNewEdges)

    setCanvasNodes((prev) => [...prev, newNode])
    if (uniqueNewEdges.length > 0) setCanvasEdges((prev) => [...prev, ...uniqueNewEdges])
    setSelectedNode(newNode)

    toast({
      title: 'Node Added to Canvas',
      description: `Added ${newNode.code} to playground (${newEdges.length} relationship${newEdges.length === 1 ? '' : 's'} linked).`,
      variant: 'success',
    })
  }

  // Remove single node from canvas
  const handleRemoveNodeFromCanvas = (nodeId: string) => {
    const connectedEdgeIds = networkRef.current?.getConnectedEdges(nodeId) || []
    nodesDataSetRef.current.remove(nodeId)
    edgesDataSetRef.current.remove(connectedEdgeIds)

    setCanvasNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setCanvasEdges((prev) => prev.filter((e) => !connectedEdgeIds.includes(String(e.id))))
    setSelectedNode(null)
    clearNeighborDimming()
    toast({ title: 'Node Removed', description: 'Removed node from playground canvas.', variant: 'default' })
  }

  // Drag and Drop from Palette to Canvas
  const handleDragStart = (e: React.DragEvent, item: { id: string; type: 'targetRole' | 'level' | 'competency' | 'skill'; code: string; name: string }) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!containerRef.current || !networkRef.current) return

    const rawData = e.dataTransfer.getData('application/json')
    if (!rawData) return

    try {
      const data = JSON.parse(rawData) as { id: string; type: 'targetRole' | 'level' | 'competency' | 'skill'; code: string; name: string }
      const rect = containerRef.current.getBoundingClientRect()
      const canvasPos = networkRef.current.DOMtoCanvas({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      handleAddItemToCanvas(data, canvasPos)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCancelConnect = React.useCallback(() => {
    setIsConnectMode(false)
    setConnectSourceNode(null)
    isConnectModeRef.current = false
    connectSourceNodeRef.current = null
  }, [])

  // Interactive Connection Mode: Click source, then click target
  const handleStartConnect = (sourceNode: PlaygroundCustomNode) => {
    setIsConnectMode(true)
    setConnectSourceNode(sourceNode)
    isConnectModeRef.current = true
    connectSourceNodeRef.current = sourceNode
    // Restore all nodes to full opacity so every potential target is crisp and clearly visible
    clearNeighborDimming()
  }

  const handleNodeClickForConnect = async (targetNode: PlaygroundCustomNode) => {
    const sourceNode = connectSourceNodeRef.current || connectSourceNode
    if (!sourceNode) return

    if (sourceNode.id === targetNode.id && sourceNode.nodeType !== 'skill') {
      toast({
        title: 'Self-Loop Disallowed',
        description: 'A node cannot form a prerequisite or membership relationship with itself.',
        variant: 'destructive',
      })
      handleCancelConnect()
      return
    }

    // Branch 0: Level + Competency (REQUIRES_COMPETENCY) with auto-save to Edit Target Role
    if (
      (sourceNode.nodeType === 'level' && targetNode.nodeType === 'competency') ||
      (sourceNode.nodeType === 'competency' && targetNode.nodeType === 'level')
    ) {
      const levelNode = sourceNode.nodeType === 'level' ? sourceNode : targetNode
      const compNode = sourceNode.nodeType === 'competency' ? sourceNode : targetNode

      const roleId = levelNode.targetRoleId
      const levelName = levelNode.levelName || levelNode.code
      const role = (targetRolesRef.current || targetRoles || []).find((r) => r.id === roleId)

      if (!role) {
        toast({
          title: 'Target Role Not Found',
          description: 'Could not resolve the parent Target Role for this level.',
          variant: 'destructive',
        })
        handleCancelConnect()
        return
      }

      const currentLvlComps = role.levelCompetencies?.[levelName] || []
      const compIdToAdd = compNode.code || compNode.id

      if (currentLvlComps.includes(compIdToAdd) || currentLvlComps.includes(compNode.id)) {
        const edgeId = `requires-comp-${levelNode.id}-${compNode.id}`
        if (!edgesDataSetRef.current?.get(edgeId)) {
          const newEdge = buildRequiresCompetencyEdge(levelNode.id, compNode.id)
          edgesDataSetRef.current?.update(newEdge)
          setCanvasEdges((prev) => prev.some((e) => e.id === newEdge.id) ? prev : [...prev, newEdge])
        }
        toast({
          title: 'Competency Connected',
          description: `${compNode.code} is assigned to ${levelName} level in ${role.code}.`,
          variant: 'default',
        })
        handleCancelConnect()
        return
      }

      const updatedLevelCompetencies = {
        ...(role.levelCompetencies || {}),
        [levelName]: [...currentLvlComps, compIdToAdd],
      }
      const updatedCompetencyIds = Array.from(
        new Set([...(role.competencyIds || []), compIdToAdd, compNode.id])
      )

      const updatedRole: TargetRoleModel = {
        ...role,
        levelCompetencies: updatedLevelCompetencies,
        competencyIds: updatedCompetencyIds,
      }

      const newEdge = buildRequiresCompetencyEdge(levelNode.id, compNode.id)
      edgesDataSetRef.current.add(newEdge)
      setCanvasEdges((prev) => [...prev, newEdge])

      if (onUpdateTargetRoleRef.current) {
        await onUpdateTargetRoleRef.current(updatedRole)
      }

      updateActiveCompany((comp) => ({
        ...comp,
        targetRoles: (comp.targetRoles || []).map((r) => (r.id === role.id ? updatedRole : r)),
      }))

      try {
        await fetch(`/api/v1/organizations/${organizationId}/target-roles/${role.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': 'DOMAIN_EXPERT',
          },
          body: JSON.stringify(updatedRole),
        })
      } catch (err) {
        console.warn('API update target role background error:', err)
      }

      toast({
        title: 'Competency Linked & Saved',
        description: `Connected "${compNode.code}" to ${levelName} level for "${role.code}". Saved automatically.`,
        variant: 'success',
      })

      handleCancelConnect()
      return
    }

    // Branch 0b: Level + MicroSkill (REQUIRES_SKILL) with auto-save to Edit Target Role
    if (
      (sourceNode.nodeType === 'level' && targetNode.nodeType === 'skill') ||
      (sourceNode.nodeType === 'skill' && targetNode.nodeType === 'level')
    ) {
      const levelNode = sourceNode.nodeType === 'level' ? sourceNode : targetNode
      const skillNode = sourceNode.nodeType === 'skill' ? sourceNode : targetNode

      const roleId = levelNode.targetRoleId
      const levelName = levelNode.levelName || levelNode.code
      const role =
        (targetRolesRef.current || targetRoles || []).find((r: TargetRoleModel) => r.id === roleId) ||
        getActiveCompany()?.targetRoles?.find((r: TargetRoleModel) => r.id === roleId)

      if (!role) {
        toast({
          title: 'Target Role Not Found',
          description: 'Could not resolve the parent Target Role for this level.',
          variant: 'destructive',
        })
        handleCancelConnect()
        return
      }

      // Check whether this level is connected to a competency that owns this skill
      const currentLvlComps = role.levelCompetencies?.[levelName] || []
      const assignedCompObjs = competenciesRef.current.filter((c) =>
        currentLvlComps.includes(c.id) || (c.code && currentLvlComps.includes(c.code))
      )
      const parentComp = assignedCompObjs.find((c) =>
        c.skillIds?.includes(skillNode.id) ||
        (skillNode.code && c.skillIds?.includes(skillNode.code))
      )

      if (!parentComp) {
        toast({
          title: 'Competency Required First',
          description: `You must connect "${levelName}" level to a Competency first before selecting its micro-skills. Micro-skills cannot be connected directly without an assigned parent competency.`,
          variant: 'destructive',
        })
        handleCancelConnect()
        return
      }

      const existingTargets: SkillTargetConfig[] = role.skillTargets || []
      const existingTarget = existingTargets.find(
        (st: SkillTargetConfig) =>
          (st.skillId === skillNode.id || st.skillCode === skillNode.code || st.skillId === skillNode.code) &&
          st.level?.toLowerCase() === levelName.toLowerCase()
      )

      if (existingTarget) {
        const edgeId = `requires-skill-${levelNode.id}-${skillNode.id}`
        if (!edgesDataSetRef.current?.get(edgeId)) {
          const newEdge = buildRequiresSkillEdge(
            levelNode.id,
            skillNode.id,
            existingTarget.requiredKnowledgeLevels ?? []
          )
          const nid = newEdge.id
          if (nid !== undefined && edgesDataSetRef.current?.get(nid)) {
            edgesDataSetRef.current.update(newEdge)
          } else {
            edgesDataSetRef.current?.add(newEdge)
          }
          setCanvasEdges((prev) => prev.some((e) => e.id === newEdge.id) ? prev : [...prev, newEdge])
        }
        toast({
          title: 'Skill Requirement Connected',
          description: `${skillNode.code} is connected as a required skill for ${levelName} level in ${role.code}.`,
          variant: 'default',
        })
        handleCancelConnect()
        return
      }

      setPendingRoleRequirement({ role, skill: skillNode, level: levelNode, parent: parentComp.code || parentComp.id })
      setRequiredKnowledge([])
      handleCancelConnect()
      return
    }

    // Branch 1: Competency + MicroSkill (HAS_SKILL)
    if (
      (sourceNode.nodeType === 'competency' && targetNode.nodeType === 'skill') ||
      (sourceNode.nodeType === 'skill' && targetNode.nodeType === 'competency')
    ) {
      const compNode = sourceNode.nodeType === 'competency' ? sourceNode : targetNode
      const skillNode = sourceNode.nodeType === 'skill' ? sourceNode : targetNode

      handleCancelConnect()
      await handleLinkSkillToCompetency(compNode, skillNode)
      return
    }

    // Branch 2: MicroSkill + MicroSkill (HAS_SKILL_PREREQUISITE)
    if (sourceNode.nodeType === 'skill' && targetNode.nodeType === 'skill') {
      setPendingPrereq({ source: sourceNode, target: targetNode })
      setDependentLevel('')
      setPrerequisiteLevel('')
      setIsPrereqModalOpen(true)
      handleCancelConnect()
      return
    }

    toast({
      title: 'Invalid Relationship',
      description: 'Competency-to-Competency links are not modeled in ontology schema. You can link Competency ↔ Micro-skill (HAS_SKILL) or Micro-skill ↔ Micro-skill (PREREQUISITE).',
      variant: 'destructive',
    })
    handleCancelConnect()
  }

  handleNodeClickForConnectRef.current = handleNodeClickForConnect

  const handleLinkSkillToCompetency = async (compNode: PlaygroundCustomNode, skillNode: PlaygroundCustomNode) => {
    const active = competencies.find((c) => c.id === compNode.id)
    if (!active) return

    const currentSkills = active.skillIds || []
    if (currentSkills.includes(skillNode.id) || currentSkills.includes(skillNode.code)) {
      const edgeId = `has-skill-${compNode.id}-${skillNode.id}`
      if (!edgesDataSetRef.current?.get(edgeId)) {
        const newEdge = buildHasSkillEdge(compNode.id, skillNode.id)
        const nid = newEdge.id
        if (nid !== undefined && edgesDataSetRef.current?.get(nid)) {
          edgesDataSetRef.current.update(newEdge)
        } else {
          edgesDataSetRef.current?.add(newEdge)
        }
        setCanvasEdges((prev) => prev.some((e) => e.id === newEdge.id) ? prev : [...prev, newEdge])
      }
      toast({
        title: 'Already Mapped',
        description: `${skillNode.code} is already a member of ${compNode.name}.`,
        variant: 'default',
      })
      return
    }

    try {
      const updatedList = [...currentSkills, skillNode.id]
      await updateCompetency(organizationId, compNode.id, {
        name: active.name,
        description: active.description,
        skillIds: updatedList,
      })

      const newEdge = buildHasSkillEdge(compNode.id, skillNode.id)
      const nid = newEdge.id
      if (nid !== undefined && edgesDataSetRef.current?.get(nid)) {
        edgesDataSetRef.current.update(newEdge)
      } else {
        edgesDataSetRef.current?.add(newEdge)
      }
      setCanvasEdges((prev) => prev.some((e) => e.id === newEdge.id) ? prev : [...prev, newEdge])
      if (onRefreshData) await onRefreshData()

      toast({
        title: 'Relationship Created',
        description: `Mapped ${skillNode.code} to ${compNode.name} (HAS_SKILL).`,
        variant: 'success',
      })
    } catch (e) {
      console.error(e)
      toast({
        title: 'Mapping Failed',
        description: 'Failed to persist HAS_SKILL relationship to server.',
        variant: 'destructive',
      })
    }
  }

  const confirmRoleRequirement = async () => {
    if (!pendingRoleRequirement || !requiredKnowledge.length || savingRequirement) return
    setSavingRequirement(true)
    const { role, skill, level } = pendingRoleRequirement
    try {
      if (!onUpdateTargetRoleRef.current) throw new Error('Role editing is unavailable.')
      const updated: TargetRoleModel = { ...role, skillTargets: [...role.skillTargets, { skillId: skill.id, skillCode: skill.code, skillName: skill.name,
        level: level.levelName || level.code, threshold: 0, requiredKnowledgeLevels: [...requiredKnowledge] }] }
      await onUpdateTargetRoleRef.current(updated)
      const edge = buildRequiresSkillEdge(level.id, skill.id, requiredKnowledge)
      const eid = edge.id
      if (eid !== undefined && edgesDataSetRef.current?.get(eid)) {
        edgesDataSetRef.current.update(edge)
      } else {
        edgesDataSetRef.current?.add(edge)
      }
      setCanvasEdges(previous => previous.some(e => e.id === edge.id) ? previous : [...previous, edge])
      setPendingRoleRequirement(null)
      toast({ title: 'Required knowledge saved', description: 'The Role requirement was accepted by the server.', variant: 'success' })
    } catch (error) {
      toast({ title: 'Unable to save requirement', description: error instanceof Error ? error.message : 'Reload the Role and retry.', variant: 'destructive' })
    } finally { setSavingRequirement(false) }
  }

  // Save HAS_SKILL_PREREQUISITE via API
  const handleConfirmPrerequisite = async () => {
    if (!pendingPrereq) return
    if (!dependentLevel || !prerequisiteLevel) return

    try {
      await createPrerequisite(organizationId, {
        sourceSkillId: String(pendingPrereq.source.id),
        targetSkillId: String(pendingPrereq.target.id),
        dependentKnowledgeLevel: dependentLevel, prerequisiteKnowledgeLevel: prerequisiteLevel,
      })

      const newEdge = buildPrereqEdge(pendingPrereq.source.id, pendingPrereq.target.id, dependentLevel, prerequisiteLevel)
      const nid = newEdge.id
      if (nid !== undefined && edgesDataSetRef.current?.get(nid)) {
        edgesDataSetRef.current.update(newEdge)
      } else {
        edgesDataSetRef.current?.add(newEdge)
      }
      setCanvasEdges((prev) => prev.some((e) => e.id === newEdge.id) ? prev : [...prev, newEdge])
      if (onRefreshData) await onRefreshData()

      toast({
        title: 'Prerequisite Saved',
        description: `${pendingPrereq.source.code} (${dependentLevel}) requires ${pendingPrereq.target.code} (${prerequisiteLevel}).`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save prerequisite'
      toast({
        title: 'Prerequisite Failed',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsPrereqModalOpen(false)
      setPendingPrereq(null)
    }
  }

  // Switch Edge Direction (Reverse arrow between nodes)
  const handleSwitchEdgeDirection = async (edge: Edge) => {
    if (!edge.from || !edge.to || edge.id === undefined) return
    const edgeId = edge.id
    const fromStr = String(edge.from)
    const toStr = String(edge.to)

    try {
      if (String(edgeId).startsWith('prereq-')) {
        const exact = prerequisitesRef.current.find(p => buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel).id === edgeId)
        if (!exact?.dependentKnowledgeLevel || !exact.prerequisiteKnowledgeLevel) throw new Error('Select a classified exact prerequisite pair.')
        const reversed = await reversePrerequisite(organizationId, { sourceSkillId: fromStr, targetSkillId: toStr,
          dependentKnowledgeLevel: exact.dependentKnowledgeLevel, prerequisiteKnowledgeLevel: exact.prerequisiteKnowledgeLevel })
        const replacement = buildPrereqEdge(reversed.sourceSkillId, reversed.targetSkillId, reversed.dependentKnowledgeLevel, reversed.prerequisiteKnowledgeLevel)
        edgesDataSetRef.current.remove(edgeId)
        edgesDataSetRef.current.add(replacement)
        setCanvasEdges(previous => [...previous.filter(item => item.id !== edgeId), replacement])
        setSelectedEdge(replacement)
        if (onRefreshData) await onRefreshData()
      } else {
        toast({
          title: 'Cannot Reverse Containment',
          description: 'Competency-to-skill membership is directional in ontology schema.',
          variant: 'default',
        })
      }
    } catch (e) {
      console.error(e)
      toast({
        title: 'Switch Failed',
        description: e instanceof Error ? e.message : 'Unable to reverse relationship direction.',
        variant: 'destructive',
      })
    }
  }

  // Delete Relationship
  const handleDeleteEdge = async (edge: Edge) => {
    if (!edge.from || !edge.to || edge.id === undefined) return
    const edgeId = edge.id
    const fromStr = String(edge.from)
    const toStr = String(edge.to)

    try {
      if (String(edgeId).startsWith('prereq-')) {
        const exact = prerequisitesRef.current.find(p => buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.dependentKnowledgeLevel, p.prerequisiteKnowledgeLevel).id === edgeId)
        await deletePrerequisite(organizationId, fromStr, toStr, exact?.dependentKnowledgeLevel, exact?.prerequisiteKnowledgeLevel)
        edgesDataSetRef.current.remove(edgeId)
        setCanvasEdges((prev) => prev.filter((e) => e.id !== edgeId))
        if (onRefreshData) await onRefreshData()
        toast({
          title: 'Prerequisite Removed',
          description: 'Deleted prerequisite relationship from Neo4j.',
          variant: 'success',
        })
      } else if (String(edgeId).startsWith('requires-comp-')) {
        const levelNode = canvasNodesRef.current.find((n) => n.id === fromStr && n.nodeType === 'level')
        const compNode = canvasNodesRef.current.find((n) => n.id === toStr && n.nodeType === 'competency')
        if (levelNode && compNode) {
          const roleId = levelNode.targetRoleId
          const levelName = levelNode.levelName || levelNode.code
          const role = (targetRolesRef.current || targetRoles || []).find((r) => r.id === roleId)
          if (role) {
            const currentLvlComps = role.levelCompetencies?.[levelName] || []
            const updatedLvlComps = currentLvlComps.filter(
              (cid) => cid !== compNode.id && cid !== compNode.code
            )
            const updatedRole: TargetRoleModel = {
              ...role,
              levelCompetencies: {
                ...(role.levelCompetencies || {}),
                [levelName]: updatedLvlComps,
              },
            }
            if (!onUpdateTargetRoleRef.current) throw new Error('Role editing is unavailable.')
            await onUpdateTargetRoleRef.current(updatedRole)
            updateActiveCompany((comp) => ({
              ...comp,
              targetRoles: (comp.targetRoles || []).map((r) => (r.id === role.id ? updatedRole : r)),
            }))
            edgesDataSetRef.current.remove(edgeId)
            setCanvasEdges((prev) => prev.filter((e) => e.id !== edgeId))
            toast({
              title: 'Requirement Removed',
              description: `Unlinked ${compNode.code} from ${levelName} level for ${role.code}.`,
              variant: 'success',
            })
          }
        }
      } else if (String(edgeId).startsWith('requires-skill-')) {
        const levelNode = canvasNodesRef.current.find((n) => n.id === fromStr && n.nodeType === 'level')
        const skillNode = canvasNodesRef.current.find((n) => n.id === toStr && n.nodeType === 'skill')
        if (levelNode && skillNode) {
          const roleId = levelNode.targetRoleId
          const levelName = levelNode.levelName || levelNode.code
          const role =
            (targetRolesRef.current || targetRoles || []).find((r: TargetRoleModel) => r.id === roleId) ||
            getActiveCompany()?.targetRoles?.find((r: TargetRoleModel) => r.id === roleId)
          if (role) {
            const updatedSkillTargets = (role.skillTargets || []).filter(
              (st: SkillTargetConfig) =>
                !(
                  (st.skillId === skillNode.id || st.skillCode === skillNode.code) &&
                  st.level?.toLowerCase() === levelName.toLowerCase()
                )
            )
            const updatedRole: TargetRoleModel = {
              ...role,
              skillTargets: updatedSkillTargets,
            }
            if (!onUpdateTargetRoleRef.current) throw new Error('Role editing is unavailable.')
            await onUpdateTargetRoleRef.current(updatedRole)
            updateActiveCompany((comp) => ({
              ...comp,
              targetRoles: (comp.targetRoles || []).map((r) => (r.id === role.id ? updatedRole : r)),
            }))
            edgesDataSetRef.current.remove(edgeId)
            setCanvasEdges((prev) => prev.filter((e) => e.id !== edgeId))
            toast({
              title: 'Requirement Removed',
              description: `Unlinked required skill ${skillNode.code} from ${levelName} level for ${role.code}.`,
              variant: 'success',
            })
          }
        }
      } else if (String(edgeId).startsWith('has-skill-')) {
        const comp = competencies.find((c) => c.id === fromStr)
        if (comp) {
          const updatedSkills = (comp.skillIds || []).filter((s) => s !== toStr)
          await updateCompetency(organizationId, comp.id, {
            name: comp.name,
            description: comp.description,
            skillIds: updatedSkills,
          })
          edgesDataSetRef.current.remove(edgeId)
          setCanvasEdges((prev) => prev.filter((e) => e.id !== edgeId))
          if (onRefreshData) await onRefreshData()
          toast({
            title: 'Membership Removed',
            description: 'Unmapped skill from competency.',
            variant: 'success',
          })
        }
      }
      setSelectedEdge(null)
    } catch (e) {
      console.error(e)
      toast({
        title: 'Delete Failed',
        description: 'Unable to remove relationship.',
        variant: 'destructive',
      })
    }
  }

  // Filter palette items
  const paletteItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const items: Array<{
      id: string
      type: 'targetRole' | 'competency' | 'skill'
      code: string
      name: string
      description?: string
      status?: string
    }> = []

    if (filterType === 'all' || filterType === 'targetRole') {
      const activeRoles = getActiveCompany()?.targetRoles || []
      const propRoles = targetRolesRef.current && targetRolesRef.current.length > 0
        ? targetRolesRef.current
        : targetRoles || []

      const roleMap = new Map<string, TargetRoleModel>()
      // Seed with local active roles first, then live propRoles overrides
      for (const r of [...activeRoles, ...propRoles]) {
        if (r && (r.id || r.code)) {
          const key = (r.code || r.id || '').trim().toUpperCase()
          roleMap.set(key, r)
        }
      }

      roleMap.forEach((r) => {
        const rawStatus = (r.status || 'DRAFT').trim().toUpperCase()
        const isDraftOrRejected = rawStatus === 'DRAFT' || rawStatus === 'REJECTED' || rawStatus === 'REJECT'
        if (!isDraftOrRejected) {
          return // Only target roles with status DRAFT or REJECTED are shown in explore graph ontology
        }

        const roleCode = r.code || r.id || ''
        const roleTitle = r.title || ''
        if (!q || roleCode.toLowerCase().includes(q) || roleTitle.toLowerCase().includes(q)) {
          items.push({
            id: r.id,
            type: 'targetRole',
            code: roleCode,
            name: roleTitle,
            description: r.description,
            status: rawStatus === 'REJECT' ? 'REJECTED' : rawStatus,
          })
        }
      })
    }

    if (filterType === 'all' || filterType === 'competency') {
      competencies.forEach((c) => {
        if (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) {
          items.push({
            id: c.id,
            type: 'competency',
            code: c.code || c.id,
            name: c.name,
            description: c.description,
          })
        }
      })
    }

    if (filterType === 'all' || filterType === 'skill') {
      microSkills.forEach((s) => {
        if (!q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) {
          items.push({
            id: s.id,
            type: 'skill',
            code: s.code,
            name: s.name,
            description: s.description,
          })
        }
      })
    }

    return items
  }, [competencies, microSkills, targetRoles, searchQuery, filterType])

  const nodesOnCanvasIds = React.useMemo(() => {
    return new Set(canvasNodes.map((n) => n.id))
  }, [canvasNodes])

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden flex flex-col',
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none m-0 border-0 h-screen w-screen'
          : 'h-[750px] shadow-sm'
      )}
    >
      {/* PLAYGROUND TOP BAR */}
      <div className="px-4 py-3 border-b border-border bg-background flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className="gap-1.5 text-xs font-semibold shadow-2xs"
            title={isPaletteOpen ? 'Hide Node Palette' : 'Open Node Palette'}
          >
            {isPaletteOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>Palette ({paletteItems.length})</span>
          </Button>

          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Interactive Ontology Playground
            </span>
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
              {canvasNodes.length} nodes on canvas
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isConnectMode ? (
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-md">
              <span className="text-xs font-semibold text-primary">
                Connecting from: <strong>{connectSourceNode?.code}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-primary hover:bg-primary/20"
                onClick={handleCancelConnect}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            selectedNode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartConnect(selectedNode)}
                className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Connect from {selectedNode.code}</span>
              </Button>
            )
          )}

          {/* Quick Sample Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadFocalSample}
            className="gap-1.5 text-xs font-semibold"
            title="Load top 5 focal competencies and their member micro-skills"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="hidden md:inline">Quick Sample</span>
          </Button>

          {/* Load Full Catalog Button */}
          {canvasNodes.length < microSkills.length + competencies.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadFullCatalog}
              className="gap-1.5 text-xs font-semibold"
              title="Load full ontology catalog"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden md:inline">Load Full ({microSkills.length + competencies.length})</span>
            </Button>
          )}


          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              const scale = networkRef.current?.getScale() || 1
              networkRef.current?.moveTo({ scale: scale * 1.25 })
            }}
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              const scale = networkRef.current?.getScale() || 1
              networkRef.current?.moveTo({ scale: scale * 0.8 })
            }}
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              networkRef.current?.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
            }}
            title="Fit to Viewport"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClearCanvas}
            title="Clear Canvas"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setIsFullscreen((prev) => !prev)
              setTimeout(() => networkRef.current?.fit(), 120)
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* PLAYGROUND MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PALETTE SIDEBAR (DRAGGABLE ENTITIES) */}
        {isPaletteOpen && (
          <aside className="w-80 border-r border-border bg-muted/15 flex flex-col shrink-0 z-10 transition-all duration-200">
            {/* Palette Search & Filter */}
            <div className="p-3 border-b border-border space-y-2 bg-background/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-1">
                {(['all', 'targetRole', 'competency', 'skill'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'flex-1 py-1 px-1 rounded text-[10.5px] font-semibold capitalize transition-colors',
                      filterType === type
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {type === 'all' ? 'All' : type === 'targetRole' ? 'Roles' : type === 'competency' ? 'Comps' : 'Skills'}
                  </button>
                ))}
              </div>
            </div>

            {/* Draggable Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {paletteItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matching entities found.
                </div>
              ) : (
                paletteItems.map((item) => {
                  const isOnCanvas = nodesOnCanvasIds.has(item.id)
                  const isComp = item.type === 'competency'

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => {
                        if (isConnectMode && isOnCanvas) {
                          const n = canvasNodesRef.current.find((cn) => cn.id === item.id)
                          if (n) handleNodeClickForConnect(n)
                        } else if (isOnCanvas) {
                          networkRef.current?.selectNodes([item.id])
                          networkRef.current?.focus(item.id, {
                            scale: 1.25,
                            animation: { duration: 300, easingFunction: 'easeInOutQuad' },
                          })
                          const node = canvasNodesRef.current.find((n) => n.id === item.id)
                          if (node) {
                            setSelectedNode(node)
                            applyNeighborDimming(node.id)
                          }
                        } else {
                          handleAddItemToCanvas(item)
                        }
                      }}
                      className={cn(
                        'group p-2.5 rounded-lg border text-xs flex items-start gap-2 select-none cursor-pointer transition-all',
                        isOnCanvas
                          ? 'border-border bg-card/60 opacity-75 hover:opacity-100 hover:border-primary/40'
                          : 'border-border/80 bg-card hover:border-primary/50 hover:shadow-xs'
                      )}
                      title={isOnCanvas ? "Click to focus on canvas" : "Click or drag to add onto canvas"}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5 group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
                              item.type === 'targetRole'
                                ? 'bg-orange-500/10 text-orange-600'
                                : isComp
                                ? 'bg-purple-500/10 text-purple-700'
                                : 'bg-emerald-500/10 text-emerald-600'
                            )}
                          >
                            {item.code}
                          </span>
                          {item.status && item.type === 'targetRole' && (
                            <span
                              className={cn(
                                'text-[9px] font-bold px-1 py-0.5 rounded font-mono',
                                item.status === 'PUBLISHED' || item.status === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : item.status === 'REJECTED'
                                    ? 'bg-destructive/15 text-destructive'
                                    : 'bg-warning/15 text-warning'
                              )}
                            >
                              {item.status}
                            </span>
                          )}
                          {isOnCanvas ? (
                            <span className="text-[10px] text-muted-foreground italic font-medium ml-auto flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-600" />
                              On canvas
                            </span>
                          ) : (
                            <span className="text-[10px] text-primary font-semibold ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3 w-3" />
                              Add
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground text-xs mt-1 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-2.5 border-t border-border bg-background text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Click or drag any item to place on the canvas.</span>
            </div>
          </aside>
        )}

        {/* VIS-NETWORK GRAPH CANVAS CONTAINER */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex-1 h-full w-full bg-slate-50/50 relative overflow-hidden"
        >
          {/* Dedicated canvas element with ZERO React children to prevent removeChild conflicts */}
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{
              backgroundColor: '#F8FAFC',
              backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Floating Connecting Mode Instructional Banner */}
          {isConnectMode && connectSourceNode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 border border-white/20 select-none">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 animate-spin text-white" />
                <span>
                  Connecting from <strong>{connectSourceNode.code}</strong>. Click target node to link!
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelConnect}
                className="ml-1 bg-white/20 hover:bg-white/30 text-white rounded-full px-2.5 py-0.5 text-[11px] font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Canvas Drag Hint Overlay (Interactive Starting Points) */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 transition-all duration-200",
              canvasNodes.length > 0 ? "hidden opacity-0 pointer-events-none" : "flex opacity-100 pointer-events-auto"
            )}
          >
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <NetworkIcon className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">Playground Canvas is Ready</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Start with an empty canvas for focused exploration. Drag competencies or micro-skills from the palette, or pick a starting layout:
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleLoadFocalSample}
                className="gap-2 text-xs font-semibold shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Quick Sample (5 Competencies)</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadFullCatalog}
                className="gap-2 text-xs font-semibold"
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Load Full Catalog ({microSkills.length + competencies.length} Nodes)</span>
              </Button>
            </div>
          </div>

          {/* Node / Edge Details Floating Card */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-3.5 space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-xs font-bold px-1.5 py-0.5 rounded',
                        selectedNode.nodeType === 'targetRole'
                          ? 'bg-orange-500/10 text-orange-600'
                          : selectedNode.nodeType === 'level'
                          ? 'bg-indigo-500/10 text-indigo-700'
                          : selectedNode.nodeType === 'competency'
                          ? 'bg-purple-500/10 text-purple-700'
                          : 'bg-emerald-500/10 text-emerald-600'
                      )}
                    >
                      {selectedNode.code}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {selectedNode.nodeType === 'targetRole' ? 'Target Role' : selectedNode.nodeType === 'level' ? 'Level' : selectedNode.nodeType}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-foreground text-xs mt-1 truncate">{selectedNode.name}</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setSelectedNode(null)
                    clearNeighborDimming()
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {selectedNode.definition && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {selectedNode.definition}
                </p>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartConnect(selectedNode)}
                    className="gap-1.5 text-xs font-semibold h-7 px-2.5"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <span>Connect</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExpandNeighbors(selectedNode.id)}
                    className="gap-1 text-xs font-semibold h-7 px-2"
                    title="Expand connected skills and competencies"
                  >
                    <Plus className="h-3 w-3 text-primary" />
                    <span>Neighbors</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveNodeFromCanvas(selectedNode.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                  title="Remove from canvas"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Edge Details Floating Card */}
          {selectedEdge && (
            <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-3.5 space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {String(selectedEdge.id).startsWith('prereq-') ? 'HAS_SKILL_PREREQUISITE' : 'HAS_SKILL'}
                  </Badge>
                  <p className="text-xs text-foreground font-semibold mt-1">
                    {String(selectedEdge.id).startsWith('prereq-')
                      ? `Skill Prerequisite: ${selectedEdge.label || ''}`
                      : 'Domain Competency Membership'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedEdge(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                {String(selectedEdge.id).startsWith('prereq-') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchEdgeDirection(selectedEdge)}
                    className="gap-1.5 text-xs font-semibold h-7 px-2.5"
                    title="Switch arrow direction (Reverse prerequisite dependency)"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span>Switch Direction</span>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEdge(selectedEdge)}
                  className="gap-1.5 text-xs font-semibold h-7 px-2.5"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Relationship</span>
                </Button>
              </div>
            </div>
          )}
          {/* Bottom Right Legend similar to Target Role explore graph */}
          <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-xs border border-border text-[11px] font-medium text-muted-foreground shadow-xs select-none">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span>Target Role</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span>Proficiency Level</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span>Competency</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Required Skill</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-destructive border-t border-dashed border-destructive" />
              <span>Prerequisite (exact levels)</span>
            </span>
          </div>
        </div>
      </div>

      <Dialog open={pendingRoleRequirement !== null} onOpenChange={open => { if (!open && !savingRequirement) setPendingRoleRequirement(null) }} className="max-w-md">
        <DialogHeader><DialogTitle>{copy('Required knowledge levels', 'Mức kiến thức bắt buộc')}</DialogTitle><DialogDescription>{pendingRoleRequirement?.role.title} · {pendingRoleRequirement?.level.levelName} · {pendingRoleRequirement?.skill.name}</DialogDescription></DialogHeader>
        <RequiredKnowledgePicker value={requiredKnowledge} onChange={setRequiredKnowledge} />
        <DialogFooter><Button variant="outline" size="sm" disabled={savingRequirement} onClick={() => setPendingRoleRequirement(null)}>{copy('Cancel', 'Hủy')}</Button><Button size="sm" disabled={!requiredKnowledge.length || savingRequirement} onClick={() => void confirmRoleRequirement()}>{copy('Save requirement', 'Lưu yêu cầu')}</Button></DialogFooter>
      </Dialog>

      {/* MODAL: EXACT PREREQUISITE CONFIG */}
      <Dialog open={isPrereqModalOpen} onOpenChange={(open) => {
        setIsPrereqModalOpen(open);
        if (!open) setPendingPrereq(null);
      }} className="max-w-md">
        {pendingPrereq && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Set Exact Prerequisite
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                <strong>{pendingPrereq.source.code}</strong> requires <strong>{pendingPrereq.target.code}</strong> at the selected knowledge levels.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {([['Dependent knowledge level', dependentLevel, setDependentLevel], ['Prerequisite knowledge level', prerequisiteLevel, setPrerequisiteLevel]] as const).map(([label, value, change]) => <div key={label}>
                <label className="font-semibold text-foreground block text-xs mb-1.5">{label}</label>
                <Combobox size="sm" clearable={false} value={value} onChange={change} placeholder="Select knowledge level" options={['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(level => ({ value: level, label: level }))} />
              </div>)}
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPrereqModalOpen(false)
                  setPendingPrereq(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={!dependentLevel || !prerequisiteLevel} onClick={handleConfirmPrerequisite}>
                Confirm Prerequisite
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}
