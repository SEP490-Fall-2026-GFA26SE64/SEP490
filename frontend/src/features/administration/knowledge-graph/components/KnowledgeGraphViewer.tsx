import { Network as NetworkIcon, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import * as React from 'react'
import { type Edge, type Node, Network, type Options } from 'vis-network'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../shared/components/ui/Dialog'
import { useToast } from '../../../../shared/hooks/useToast'

interface GraphNodeData {
  id: string
  label: string
  group: 'role' | 'competency' | 'skill' | 'module'
  description: string
  status?: 'mastered' | 'gap' | 'in_progress' | 'available'
}

const GRAPH_NODES: GraphNodeData[] = [
  // Role Node
  {
    id: 'role-1',
    label: 'AI Knowledge Architect\n(Target Role)',
    group: 'role',
    description: 'Enterprise architect responsible for knowledge modeling, graph ML, and ontology integration.',
  },
  // Competencies
  {
    id: 'comp-1',
    label: 'Graph Semantic Architecture',
    group: 'competency',
    description: 'Mastery over RDF, OWL, and graph databases for organizational knowledge modeling.',
  },
  {
    id: 'comp-2',
    label: 'Graph Machine Learning',
    group: 'competency',
    description: 'Deep learning on relational structures, node embeddings, and GNN frameworks.',
  },
  // Micro-skills
  {
    id: 'skill-1',
    label: 'Neo4j & Cypher DDL',
    group: 'skill',
    status: 'mastered',
    description: 'Schema constraints, relationship patterns, and indexed property queries.',
  },
  {
    id: 'skill-2',
    label: 'Node2Vec & PyG',
    group: 'skill',
    status: 'gap',
    description: 'Random walk graph embeddings and PyTorch Geometric model construction.',
  },
  {
    id: 'skill-3',
    label: 'Knowledge Tracing (DKT)',
    group: 'skill',
    status: 'gap',
    description: 'Dynamic recurrent modeling of user mastery across discrete learning concepts.',
  },
  // Learning Modules
  {
    id: 'mod-1',
    label: 'MOD-204: Neo4j Cypher Deep Dive',
    group: 'module',
    status: 'mastered',
    description: 'Comprehensive learning module covering production Neo4j deployments and APOC procedures.',
  },
  {
    id: 'mod-2',
    label: 'MOD-301: Graph Neural Networks',
    group: 'module',
    status: 'in_progress',
    description: 'Theory and practical application of Graph Convolution Networks in PyTorch.',
  },
]

const GRAPH_EDGES: Edge[] = [
  { id: 'e1', from: 'role-1', to: 'comp-1', label: 'REQUIRES' },
  { id: 'e2', from: 'role-1', to: 'comp-2', label: 'REQUIRES' },
  { id: 'e3', from: 'comp-1', to: 'skill-1', label: 'SUB_COMPETENCY' },
  { id: 'e4', from: 'comp-2', to: 'skill-2', label: 'SUB_COMPETENCY' },
  { id: 'e5', from: 'comp-2', to: 'skill-3', label: 'SUB_COMPETENCY' },
  { id: 'e6', from: 'mod-1', to: 'skill-1', label: 'TEACHES' },
  { id: 'e7', from: 'mod-2', to: 'skill-2', label: 'TEACHES' },
  { id: 'e8', from: 'skill-1', to: 'skill-2', label: 'PREREQUISITE_OF' },
]

export function KnowledgeGraphViewer() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)
  const [selectedNode, setSelectedNode] = React.useState<GraphNodeData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (!containerRef.current) return

    const nodes: Node[] = GRAPH_NODES.map((node) => {
      let color = '#0056D2'
      let shape: Node['shape'] = 'box'

      if (node.group === 'role') {
        color = '#0B1B3D'
        shape = 'box'
      } else if (node.group === 'competency') {
        color = '#0056D2'
        shape = 'hexagon'
      } else if (node.group === 'skill') {
        color = node.status === 'mastered' ? '#16A34A' : '#D97706'
        shape = 'ellipse'
      } else if (node.group === 'module') {
        color = '#2563EB'
        shape = 'box'
      }

      return {
        id: node.id,
        label: node.label,
        shape,
        color: {
          background: color,
          border: '#ffffff',
          highlight: { background: '#00419E', border: '#D1D7DC' },
        },
        font: { color: '#ffffff', face: 'IBM Plex Sans', size: 12 },
        margin: { top: 8, right: 8, bottom: 8, left: 8 },
      }
    })

    const edges: Edge[] = GRAPH_EDGES.map((edge) => ({
      ...edge,
      font: { size: 9, color: '#5F6464', face: 'IBM Plex Sans', align: 'middle' },
      arrows: 'to',
      color: { color: '#D1D7DC', highlight: '#0056D2' },
      smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
    }))


    const options: Options = {
      nodes: { borderWidth: 2, shadow: true },
      edges: { width: 1.5, shadow: false },
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 120,
          springConstant: 0.08,
        },
      },
      interaction: { hover: true, tooltipDelay: 200 },
    }

    const network = new Network(containerRef.current, { nodes, edges }, options)
    networkRef.current = network

    network.on('click', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const found = GRAPH_NODES.find((n) => n.id === nodeId)
        if (found) {
          setSelectedNode(found)
          setIsDialogOpen(true)
        }
      }
    })

    return () => {
      network.destroy()
    }
  }, [])

  const handleFit = () => {
    networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
  }

  const handleZoomIn = () => {
    const scale = networkRef.current?.getScale() || 1
    networkRef.current?.moveTo({ scale: scale * 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
  }

  const handleZoomOut = () => {
    const scale = networkRef.current?.getScale() || 1
    networkRef.current?.moveTo({ scale: scale / 1.3, animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
  }

  return (
    <div className="space-y-4">
      {/* Visualizer canvas card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NetworkIcon className="h-5 w-5 text-primary" />
              <span>Enterprise Competency Graph Explorer</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Interactive visualization of organizational roles, competencies, skills, and prerequisite learning modules. Click any node to inspect semantic properties.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomIn} aria-label="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut} aria-label="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleFit} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Reset View
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 relative">
          {/* Graph canvas container */}
          <div ref={containerRef} className="h-[520px] w-full bg-slate-900/5 cursor-grab active:cursor-grabbing" />

          {/* Graph Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-xs border border-border rounded-lg p-3 shadow-md space-y-1.5 text-xs">
            <span className="font-semibold text-foreground uppercase tracking-wider block mb-1">Graph Ontology Legend</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs bg-foreground" />
              <span className="text-muted-foreground">Target Role Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs bg-primary" />
              <span className="text-muted-foreground">Competency Cluster</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Mastered Micro-skill</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Identified Skill Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-xs bg-primary/80" />
              <span className="text-muted-foreground">Learning Module</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Node Details Inspection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedNode && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={
                    selectedNode.group === 'role'
                      ? 'primary'
                      : selectedNode.group === 'competency'
                        ? 'secondary'
                        : selectedNode.status === 'mastered'
                          ? 'success'
                          : 'warning'
                  }
                >
                  {selectedNode.group.toUpperCase()}
                </Badge>
                {selectedNode.status && (
                  <span className="text-xs text-muted-foreground capitalize font-medium">
                    Status: {selectedNode.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl">{selectedNode.label.split('\n')[0]}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed">
                {selectedNode.description}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node Identifier:</span>
                <code className="font-mono text-primary font-bold">{selectedNode.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ontology Layer:</span>
                <span className="font-medium text-foreground">Enterprise Competency Model</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="primary"
                onClick={() => {
                  setIsDialogOpen(false)
                  toast({
                    title: 'Node Synchronized',
                    description: `Queried semantic relationships for ${selectedNode.label.split('\n')[0]}`,
                    variant: 'info',
                  })
                }}
              >
                Inspect Subgraph Relationships
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}
