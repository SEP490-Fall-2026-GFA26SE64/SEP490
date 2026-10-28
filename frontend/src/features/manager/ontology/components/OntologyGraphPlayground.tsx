import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  GripVertical,
  Layers,
  Link as LinkIcon,
  Lock,
  Maximize2,
  Minimize2,
  Network as NetworkIcon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as React from 'react'
import { Network, type Options, type Node, type Edge } from 'vis-network'
import { DataSet } from 'vis-data'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../shared/components/ui/Dialog'
import { useToast } from '../../../../shared/hooks/useToast'
import { cn } from '../../../../shared/lib/utils'
import { type CompetencyModel, type MicroSkillModel, type PrerequisiteEdge } from '../../data/ldManagerMockData'
import { createPrerequisite, deletePrerequisite } from '../../../../shared/api/prerequisiteApi'
import { updateCompetency } from '../../../../shared/api/competencyApi'

export interface OntologyGraphPlaygroundProps {
  microSkills: MicroSkillModel[]
  competencies: CompetencyModel[]
  prerequisites: PrerequisiteEdge[]
  organizationId: string
  activeTab?: string
  onRefreshData?: () => Promise<void>
}

export interface PlaygroundCustomNode extends Node {
  id: string
  nodeType: 'competency' | 'skill'
  code: string
  name: string
  definition?: string
  status?: string
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
  organizationId,
  activeTab,
  onRefreshData,
}: OntologyGraphPlaygroundProps) {
  const { toast } = useToast()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)

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
  const [isPhysicsFrozen, setIsPhysicsFrozen] = React.useState(true)
  const isCompactViewRef = React.useRef(false)

  // Direct Interactive Connection Mode
  const [isConnectMode, setIsConnectMode] = React.useState(false)
  const [connectSourceNode, setConnectSourceNode] = React.useState<PlaygroundCustomNode | null>(null)

  // Prerequisite creation threshold dialog
  const [isPrereqModalOpen, setIsPrereqModalOpen] = React.useState(false)
  const [pendingPrereq, setPendingPrereq] = React.useState<{ source: PlaygroundCustomNode; target: PlaygroundCustomNode } | null>(null)
  const [prereqThreshold, setPrereqThreshold] = React.useState('75')

  // Palette & Filter State
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState<'all' | 'competency' | 'skill'>('all')

  // Helper builders
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
      shapeProperties: { borderRadius: 8 },
      margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 10, right: 14, bottom: 10, left: 14 },
      widthConstraint: isCompact ? { maximum: 110 } : { maximum: 200 },
      color: {
        background: '#FFF7ED',
        border: '#EA580C',
        highlight: { background: '#FFEDD5', border: '#C2410C' },
        hover: { background: '#FFEDD5', border: '#EA580C' },
      },
      font: {
        multi: 'html',
        color: '#0F172A',
        size: isCompact ? 9 : 11.5,
        face: 'IBM Plex Sans, sans-serif',
      },
      borderWidth: 2,
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
      shapeProperties: { borderRadius: 18 },
      margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : { top: 8, right: 12, bottom: 8, left: 12 },
      widthConstraint: isCompact ? { maximum: 100 } : { maximum: 160 },
      color: {
        background: '#F0FDF4',
        border: '#16A34A',
        highlight: { background: '#DCFCE7', border: '#15803D' },
        hover: { background: '#DCFCE7', border: '#16A34A' },
      },
      font: {
        multi: 'html',
        color: '#0F172A',
        size: isCompact ? 9 : 10.5,
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
      title: 'HAS_SKILL: Competency contains Micro-skill',
      color: { color: '#94A3B8', highlight: '#EA580C', hover: '#64748B' },
      arrows: { to: { enabled: true, scaleFactor: 0.7 } },
      width: 1.5,
      dashes: false,
    }
  }

  function buildPrereqEdge(sourceSkillId: string, targetSkillId: string, minMastery: number = 0.75): Edge {
    const pct = Math.round(minMastery * 100)
    return {
      id: `prereq-${sourceSkillId}-${targetSkillId}`,
      from: sourceSkillId,
      to: targetSkillId,
      label: `≥ ${pct}%`,
      title: `HAS_SKILL_PREREQUISITE: Requires ≥ ${pct}% readiness score`,
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

  // Level-of-Detail (LOD): Semantic Zooming updates node labels
  const applyLOD = React.useCallback((isCompact: boolean) => {
    const all = nodesDataSetRef.current.get()
    const updates = all.map((n) => {
      const isComp = n.nodeType === 'competency'
      return {
        id: n.id,
        label: isCompact ? n.code : (isComp ? `<b>${n.code}</b>\n${n.name}` : `<b>${n.code}</b>\n${n.name}`),
        font: {
          size: isCompact ? 9 : (isComp ? 11.5 : 10.5),
          multi: 'html' as const,
          face: 'IBM Plex Sans, sans-serif',
        },
        margin: isCompact ? { top: 4, right: 8, bottom: 4, left: 8 } : (isComp ? { top: 10, right: 14, bottom: 10, left: 14 } : { top: 8, right: 12, bottom: 8, left: 12 }),
        widthConstraint: isCompact ? { maximum: 110 } : (isComp ? { maximum: 200 } : { maximum: 160 }),
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
      const isComp = n.nodeType === 'competency'
      if (isConnected) {
        return {
          id: n.id,
          opacity: 1,
          color: isComp
            ? {
                background: '#FFF7ED',
                border: '#EA580C',
                highlight: { background: '#FFEDD5', border: '#C2410C' },
                hover: { background: '#FFEDD5', border: '#EA580C' },
              }
            : {
                background: '#F0FDF4',
                border: '#16A34A',
                highlight: { background: '#DCFCE7', border: '#15803D' },
                hover: { background: '#DCFCE7', border: '#16A34A' },
              },
          font: {
            color: '#0F172A',
            size: isCompact ? 9 : (isComp ? 11.5 : 10.5),
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
            size: isCompact ? 9 : (isComp ? 11.5 : 10.5),
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
      const isPrereq = String(e.id).startsWith('prereq-')
      if (isConnected) {
        return {
          id: e.id,
          color: {
            color: isPrereq ? '#DC2626' : '#EA580C',
            highlight: isPrereq ? '#DC2626' : '#EA580C',
            hover: isPrereq ? '#DC2626' : '#EA580C',
            opacity: 1,
          },
          width: isPrereq ? 2.5 : 2,
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
      const isComp = n.nodeType === 'competency'
      return {
        id: n.id,
        opacity: 1,
        color: isComp
          ? {
              background: '#FFF7ED',
              border: '#EA580C',
              highlight: { background: '#FFEDD5', border: '#C2410C' },
              hover: { background: '#FFEDD5', border: '#EA580C' },
            }
          : {
              background: '#F0FDF4',
              border: '#16A34A',
              highlight: { background: '#DCFCE7', border: '#15803D' },
              hover: { background: '#DCFCE7', border: '#16A34A' },
            },
        font: {
          color: '#0F172A',
          size: isCompact ? 9 : (isComp ? 11.5 : 10.5),
          multi: 'html' as const,
          face: 'IBM Plex Sans, sans-serif',
        },
      }
    })
    nodesDataSetRef.current.update(nodeUpdates)

    const allEdges = edgesDataSetRef.current.get()
    const edgeUpdates = allEdges.map((e) => {
      const isPrereq = String(e.id).startsWith('prereq-')
      return {
        id: e.id,
        color: {
          color: isPrereq ? '#F87171' : '#94A3B8',
          highlight: isPrereq ? '#DC2626' : '#EA580C',
          hover: isPrereq ? '#DC2626' : '#64748B',
          opacity: 1,
        },
        width: isPrereq ? 2 : 1.5,
      }
    })
    edgesDataSetRef.current.update(edgeUpdates)
  }, [])

  // Expand Neighbors of a given node
  const handleExpandNeighbors = React.useCallback((nodeId: string) => {
    const current = canvasNodesRef.current.find((n) => n.id === nodeId)
    if (!current) return

    const centerPos = networkRef.current?.getPosition(nodeId) || { x: 0, y: 0 }
    const existingNodeIds = new Set(canvasNodesRef.current.map((n) => n.id))

    const nodesToAdd: PlaygroundCustomNode[] = []
    const edgesToAdd: Edge[] = []

    if (current.nodeType === 'competency') {
      const comp = competencies.find((c) => c.id === current.id)
      if (comp) {
        const memberSkillIds = comp.skillIds || []
        const missingSkills = microSkills.filter(
          (s) => (memberSkillIds.includes(s.id) || memberSkillIds.includes(s.code)) && !existingNodeIds.has(s.id)
        )

        const radius = 170
        missingSkills.forEach((s, idx) => {
          const angle = (idx / Math.max(missingSkills.length, 1)) * 2 * Math.PI
          const pos = {
            x: Math.round(centerPos.x + radius * Math.cos(angle)),
            y: Math.round(centerPos.y + radius * Math.sin(angle)),
          }
          nodesToAdd.push(buildSkillNode(s, pos))
          existingNodeIds.add(s.id)
        })
      }
    } else {
      // MicroSkill: find parent competencies & prerequisite skills
      const parentComps = competencies.filter(
        (c) => (c.skillIds || []).includes(current.id) || (c.skillIds || []).includes(current.code)
      )
      const missingComps = parentComps.filter((c) => !existingNodeIds.has(c.id))

      const prereqSkillIds = new Set<string>()
      prerequisites.forEach((p) => {
        if (p.sourceSkillId === current.id || p.sourceSkillCode === current.code) {
          if (p.targetSkillId && !existingNodeIds.has(p.targetSkillId)) prereqSkillIds.add(p.targetSkillId)
        }
        if (p.targetSkillId === current.id || p.targetSkillCode === current.code) {
          if (p.sourceSkillId && !existingNodeIds.has(p.sourceSkillId)) prereqSkillIds.add(p.sourceSkillId)
        }
      })
      const missingPrereqSkills = microSkills.filter((s) => prereqSkillIds.has(s.id) && !existingNodeIds.has(s.id))

      const totalMissing = missingComps.length + missingPrereqSkills.length
      let count = 0
      const radius = 180

      missingComps.forEach((c) => {
        const angle = (count / Math.max(totalMissing, 1)) * 2 * Math.PI
        count++
        const pos = {
          x: Math.round(centerPos.x + radius * Math.cos(angle)),
          y: Math.round(centerPos.y + radius * Math.sin(angle)),
        }
        nodesToAdd.push(buildCompetencyNode(c, pos))
        existingNodeIds.add(c.id)
      })

      missingPrereqSkills.forEach((s) => {
        const angle = (count / Math.max(totalMissing, 1)) * 2 * Math.PI
        count++
        const pos = {
          x: Math.round(centerPos.x + radius * Math.cos(angle)),
          y: Math.round(centerPos.y + radius * Math.sin(angle)),
        }
        nodesToAdd.push(buildSkillNode(s, pos))
        existingNodeIds.add(s.id)
      })
    }

    // Connect any missing edges between all nodes that will now be visible
    const allFutureNodeIds = existingNodeIds
    const existingEdgeIds = new Set(canvasEdgesRef.current.map((e) => e.id))

    competencies.forEach((c) => {
      if (allFutureNodeIds.has(c.id)) {
        ;(c.skillIds || []).forEach((sId) => {
          const target = microSkills.find((s) => s.id === sId || s.code === sId)
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

    prerequisites.forEach((p) => {
      if (allFutureNodeIds.has(p.sourceSkillId) && allFutureNodeIds.has(p.targetSkillId)) {
        const edgeId = `prereq-${p.sourceSkillId}-${p.targetSkillId}`
        if (!existingEdgeIds.has(edgeId)) {
          existingEdgeIds.add(edgeId)
          edgesToAdd.push(buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.minMastery))
        }
      }
    })

    if (nodesToAdd.length === 0 && edgesToAdd.length === 0) {
      toast({
        title: 'All Neighbors Already Visible',
        description: `All direct relationships for "${current.code}" are already placed on the canvas.`,
        variant: 'default',
      })
      return
    }

    nodesDataSetRef.current.add(nodesToAdd)
    if (edgesToAdd.length > 0) edgesDataSetRef.current.add(edgesToAdd)

    setCanvasNodes((prev) => [...prev, ...nodesToAdd])
    if (edgesToAdd.length > 0) setCanvasEdges((prev) => [...prev, ...edgesToAdd])

    toast({
      title: 'Neighbors Expanded',
      description: `Added ${nodesToAdd.length} connected node${nodesToAdd.length === 1 ? '' : 's'} around ${current.code}.`,
      variant: 'success',
    })
  }, [competencies, microSkills, prerequisites, toast])

  // Initialize vis-network once
  React.useEffect(() => {
    if (!containerRef.current) return

    const options: Options = {
      layout: { improvedLayout: false },
      nodes: {
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.06)', size: 4, x: 0, y: 2 },
      },
      edges: {
        width: 1.5,
        smooth: { enabled: true, type: 'continuous', roundness: 0.35 },
      },
      physics: {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -3500,
          centralGravity: 0.15,
          springLength: 170,
          springConstant: 0.04,
          damping: 0.12,
          avoidOverlap: 0.85,
        },
        stabilization: {
          enabled: true,
          iterations: 120,
          updateInterval: 25,
        },
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

    // Freeze physics once stabilized to keep playground responsive and calm
    network.on('stabilized', () => {
      network.setOptions({ physics: { enabled: false } })
      setIsPhysicsFrozen(true)
    })

    // Level-of-Detail (LOD): Semantic Zooming
    network.on('zoom', (params) => {
      const scale = params.scale
      const isCompact = scale < 0.6
      if (isCompact !== isCompactViewRef.current) {
        isCompactViewRef.current = isCompact
        applyLOD(isCompact)
      }
    })

    // Selection listener
    network.on('click', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = String(params.nodes[0])
        const node = canvasNodesRef.current.find((n) => n.id === nodeId)
        if (node) {
          setSelectedNode(node)
          setSelectedEdge(null)
          applyNeighborDimming(node.id)
          return
        }
      }
      if (params.edges && params.edges.length > 0) {
        const edgeId = String(params.edges[0])
        const edge = canvasEdgesRef.current.find((e) => e.id === edgeId)
        if (edge) {
          setSelectedEdge(edge)
          setSelectedNode(null)
          clearNeighborDimming()
          return
        }
      }
      setSelectedNode(null)
      setSelectedEdge(null)
      clearNeighborDimming()
    })

    // Double-click to expand neighbors
    network.on('doubleClick', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = String(params.nodes[0])
        handleExpandNeighbors(nodeId)
      }
    })

    return () => {
      try { network.destroy() } catch {}
      networkRef.current = null
    }
  }, [applyLOD, applyNeighborDimming, clearNeighborDimming, handleExpandNeighbors])

  // Resize and fit network when the activeTab becomes 'graph'
  React.useEffect(() => {
    if (activeTab === 'graph') {
      const timer = setTimeout(() => {
        if (networkRef.current && containerRef.current) {
          const w = containerRef.current.clientWidth || 800
          const h = containerRef.current.clientHeight || 650
          networkRef.current.setSize(`${w}px`, `${h}px`)
          networkRef.current.redraw()
          if (canvasNodesRef.current.length > 0) {
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

    topComps.forEach((c) => {
      if (!seenNodeIds.has(c.id)) {
        seenNodeIds.add(c.id)
        sampleNodes.push(buildCompetencyNode(c))
      }
      ;(c.skillIds || []).forEach((sId) => {
        const s = microSkills.find((ms) => ms.id === sId || ms.code === sId)
        if (s && !seenNodeIds.has(s.id)) {
          seenNodeIds.add(s.id)
          sampleNodes.push(buildSkillNode(s))
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
          sampleEdges.push(buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.minMastery))
        }
      }
    })

    setIsPhysicsFrozen(false)
    networkRef.current?.setOptions({ physics: { enabled: true } })

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

  // Load Full Catalog on Demand (with stabilization freeze)
  const handleLoadFullCatalog = () => {
    nodesDataSetRef.current.clear()
    edgesDataSetRef.current.clear()

    const fullNodes: PlaygroundCustomNode[] = []
    const fullEdges: Edge[] = []
    const seenNodeIds = new Set<string>()
    const seenEdgeIds = new Set<string>()

    microSkills.forEach((s) => {
      if (!seenNodeIds.has(s.id)) {
        seenNodeIds.add(s.id)
        fullNodes.push(buildSkillNode(s))
      }
    })

    competencies.forEach((c) => {
      if (!seenNodeIds.has(c.id)) {
        seenNodeIds.add(c.id)
        fullNodes.push(buildCompetencyNode(c))
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
          fullEdges.push(buildPrereqEdge(p.sourceSkillId, p.targetSkillId, p.minMastery))
        }
      }
    })

    setIsPhysicsFrozen(false)
    networkRef.current?.setOptions({ physics: { enabled: true } })

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
      description: `Loaded all ${fullNodes.length} nodes and ${fullEdges.length} edges. Physics will freeze automatically once calm.`,
      variant: 'default',
    })
  }

  // Add Item to Canvas (via click or drag)
  const handleAddItemToCanvas = (item: { id: string; type: 'competency' | 'skill'; code: string; name: string }, specificPos?: { x: number; y: number }) => {
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
      const jitterX = Math.round((Math.random() - 0.5) * 80)
      const jitterY = Math.round((Math.random() - 0.5) * 80)
      pos = { x: viewPos.x + jitterX, y: viewPos.y + jitterY }
    }

    let newNode: PlaygroundCustomNode
    if (item.type === 'competency') {
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

    if (newNode.nodeType === 'competency') {
      const comp = competencies.find((c) => c.id === newNode.id)
      if (comp) {
        ;(comp.skillIds || []).forEach((sId) => {
          const target = canvasNodesRef.current.find((n) => n.id === sId || n.code === sId)
          if (target) newEdges.push(buildHasSkillEdge(newNode.id, target.id))
        })
      }
    } else {
      competencies.forEach((comp) => {
        if ((comp.skillIds || []).includes(newNode.id) || (comp.skillIds || []).includes(newNode.code)) {
          if (existingIds.has(comp.id)) newEdges.push(buildHasSkillEdge(comp.id, newNode.id))
        }
      })
      prerequisites.forEach((p) => {
        if (p.sourceSkillId === newNode.id || p.sourceSkillCode === newNode.code) {
          const tgt = canvasNodesRef.current.find((n) => n.id === p.targetSkillId || n.code === p.targetSkillCode)
          if (tgt) newEdges.push(buildPrereqEdge(newNode.id, tgt.id, p.minMastery))
        }
        if (p.targetSkillId === newNode.id || p.targetSkillCode === newNode.code) {
          const src = canvasNodesRef.current.find((n) => n.id === p.sourceSkillId || n.code === p.sourceSkillCode)
          if (src) newEdges.push(buildPrereqEdge(src.id, newNode.id, p.minMastery))
        }
      })
    }

    nodesDataSetRef.current.add(newNode)
    if (newEdges.length > 0) edgesDataSetRef.current.add(newEdges)

    setCanvasNodes((prev) => [...prev, newNode])
    if (newEdges.length > 0) setCanvasEdges((prev) => [...prev, ...newEdges])

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
  const handleDragStart = (e: React.DragEvent, item: { id: string; type: 'competency' | 'skill'; code: string; name: string }) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!containerRef.current || !networkRef.current) return

    const rawData = e.dataTransfer.getData('application/json')
    if (!rawData) return

    try {
      const data = JSON.parse(rawData) as { id: string; type: 'competency' | 'skill'; code: string; name: string }
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

  // Interactive Connection Mode: Click source, then click target
  const handleStartConnect = (sourceNode: PlaygroundCustomNode) => {
    setIsConnectMode(true)
    setConnectSourceNode(sourceNode)
    toast({
      title: 'Connecting Mode Active',
      description: `Selected ${sourceNode.code}. Now click another node to create a relationship.`,
      variant: 'default',
    })
  }

  const handleNodeClickForConnect = async (targetNode: PlaygroundCustomNode) => {
    if (!connectSourceNode) return

    if (connectSourceNode.id === targetNode.id) {
      toast({
        title: 'Self-Loop Disallowed',
        description: 'A node cannot form a prerequisite or membership relationship with itself.',
        variant: 'destructive',
      })
      setIsConnectMode(false)
      setConnectSourceNode(null)
      return
    }

    // Branch 1: Competency + MicroSkill (HAS_SKILL)
    if (
      (connectSourceNode.nodeType === 'competency' && targetNode.nodeType === 'skill') ||
      (connectSourceNode.nodeType === 'skill' && targetNode.nodeType === 'competency')
    ) {
      const compNode = connectSourceNode.nodeType === 'competency' ? connectSourceNode : targetNode
      const skillNode = connectSourceNode.nodeType === 'skill' ? connectSourceNode : targetNode

      await handleLinkSkillToCompetency(compNode, skillNode)
      setIsConnectMode(false)
      setConnectSourceNode(null)
      return
    }

    // Branch 2: MicroSkill + MicroSkill (HAS_SKILL_PREREQUISITE)
    if (connectSourceNode.nodeType === 'skill' && targetNode.nodeType === 'skill') {
      setPendingPrereq({ source: connectSourceNode, target: targetNode })
      setIsPrereqModalOpen(true)
      setIsConnectMode(false)
      setConnectSourceNode(null)
      return
    }

    toast({
      title: 'Invalid Relationship',
      description: 'Competency-to-Competency links are not modeled in the ontology schema.',
      variant: 'destructive',
    })
    setIsConnectMode(false)
    setConnectSourceNode(null)
  }

  const handleLinkSkillToCompetency = async (compNode: PlaygroundCustomNode, skillNode: PlaygroundCustomNode) => {
    const active = competencies.find((c) => c.id === compNode.id)
    if (!active) return

    const currentSkills = active.skillIds || []
    if (currentSkills.includes(skillNode.id) || currentSkills.includes(skillNode.code)) {
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
      edgesDataSetRef.current.add(newEdge)
      setCanvasEdges((prev) => [...prev, newEdge])
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

  // Save HAS_SKILL_PREREQUISITE via API
  const handleConfirmPrerequisite = async () => {
    if (!pendingPrereq) return
    const minMasteryVal = (Number(prereqThreshold) || 75) / 100

    try {
      await createPrerequisite(organizationId, {
        sourceSkillId: String(pendingPrereq.source.id),
        targetSkillId: String(pendingPrereq.target.id),
        minMastery: minMasteryVal,
      })

      const newEdge = buildPrereqEdge(pendingPrereq.source.id, pendingPrereq.target.id, minMasteryVal)
      edgesDataSetRef.current.add(newEdge)
      setCanvasEdges((prev) => [...prev, newEdge])
      if (onRefreshData) await onRefreshData()

      toast({
        title: 'Prerequisite Saved',
        description: `${pendingPrereq.source.code} is now a prerequisite for ${pendingPrereq.target.code} (≥ ${prereqThreshold}%).`,
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

  // Delete Relationship
  const handleDeleteEdge = async (edge: Edge) => {
    if (!edge.from || !edge.to || edge.id === undefined) return
    const edgeId = edge.id
    const fromStr = String(edge.from)
    const toStr = String(edge.to)

    try {
      if (String(edgeId).startsWith('prereq-')) {
        await deletePrerequisite(organizationId, fromStr, toStr)
        edgesDataSetRef.current.remove(edgeId)
        setCanvasEdges((prev) => prev.filter((e) => e.id !== edgeId))
        if (onRefreshData) await onRefreshData()
        toast({
          title: 'Prerequisite Removed',
          description: 'Deleted prerequisite relationship from Neo4j.',
          variant: 'success',
        })
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
      type: 'competency' | 'skill'
      code: string
      name: string
      description?: string
    }> = []

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
  }, [competencies, microSkills, searchQuery, filterType])

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
                onClick={() => {
                  setIsConnectMode(false)
                  setConnectSourceNode(null)
                }}
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

          {/* Physics Freeze / Dynamic Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !isPhysicsFrozen
              setIsPhysicsFrozen(next)
              networkRef.current?.setOptions({ physics: { enabled: !next } })
              toast({
                title: next ? 'Physics Layout Frozen' : 'Dynamic Physics Enabled',
                description: next
                  ? 'Nodes are pinned in place for precise repositioning.'
                  : 'Barnes-Hut simulation is actively repelling overlapping nodes.',
                variant: 'default',
              })
            }}
            className={cn("gap-1.5 text-xs font-semibold", !isPhysicsFrozen && "border-primary text-primary bg-primary/5")}
            title={isPhysicsFrozen ? "Unfreeze Physics (Auto-spread nodes)" : "Freeze Physics (Pin layout)"}
          >
            {isPhysicsFrozen ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Unlock className="h-3.5 w-3.5 text-primary" />}
            <span className="hidden lg:inline">{isPhysicsFrozen ? 'Frozen' : 'Dynamic'}</span>
          </Button>

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
                {(['all', 'competency', 'skill'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'flex-1 py-1 px-2 rounded text-[11px] font-semibold capitalize transition-colors',
                      filterType === type
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {type === 'all' ? 'All' : type === 'competency' ? 'Competencies' : 'Skills'}
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
                              isComp ? 'bg-orange-500/10 text-orange-600' : 'bg-emerald-500/10 text-emerald-600'
                            )}
                          >
                            {item.code}
                          </span>
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
                        selectedNode.nodeType === 'competency'
                          ? 'bg-orange-500/10 text-orange-600'
                          : 'bg-emerald-500/10 text-emerald-600'
                      )}
                    >
                      {selectedNode.code}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {selectedNode.nodeType}
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

              <div className="pt-2 border-t border-border flex items-center justify-end">
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
        </div>
      </div>

      {/* MODAL: PREREQUISITE THRESHOLD CONFIG */}
      <Dialog open={isPrereqModalOpen} onOpenChange={setIsPrereqModalOpen}>
        {pendingPrereq && (
          <div className="p-6 space-y-4 max-w-md w-full bg-card rounded-xl border border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Set Prerequisite Mastery Score
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Establish the minimum proficiency required on <strong>{pendingPrereq.source.code}</strong> before
                unlocking <strong>{pendingPrereq.target.code}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Required Score:</span>
                <span className="font-mono font-bold text-primary text-sm">{prereqThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={prereqThreshold}
                onChange={(e) => setPrereqThreshold(e.target.value)}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>50% (Basic)</span>
                <span>75% (Standard)</span>
                <span>100% (Mastery)</span>
              </div>
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
              <Button variant="primary" size="sm" onClick={handleConfirmPrerequisite}>
                Confirm Prerequisite
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}
