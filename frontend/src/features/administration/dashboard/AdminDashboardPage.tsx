import {
  Database,
  Eye,
  Layers,
  Plus,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import './AdminDashboardPage.css'

export function AdminDashboardPage() {
  const { toast } = useToast()

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <Database className="h-4 w-4 text-primary" />
              <span>Neo4j Bolt: Active</span>
            </Badge>
          }
        />

        {/* Role-Skill Taxonomy - Unified Big Container Design */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Big Container Header */}
          <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Organizational Role & Competency Mappings
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Define required competencies and micro-skill thresholds for each organizational role in the ontology.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-xs font-semibold shrink-0"
              onClick={() => {
                toast({
                  title: 'Ontology Node Created',
                  description: 'Opened ontology node drafting modal.',
                  variant: 'info',
                })
              }}
            >
              Add Role / Skill Node
            </Button>
          </div>

          {/* Table / Ledger Body */}
          <div className="divide-y divide-border">
            {[
              {
                role: 'AI Knowledge Architect',
                category: 'Data Science & Architecture',
                competencyCount: 4,
                skills: ['Neo4j Cypher', 'Node2Vec', 'PyG', 'DKT Modeling'],
              },
              {
                role: 'Senior Machine Learning Engineer',
                category: 'Applied AI',
                competencyCount: 6,
                skills: ['PyTorch', 'Model Serving', 'Feature Stores', 'MLOps'],
              },
              {
                role: 'Full-Stack Knowledge Engineer',
                category: 'Software Engineering',
                competencyCount: 5,
                skills: ['React', 'vis.js / D3', 'FastAPI', 'Spring Boot Hexagonal'],
              },
            ].map((item) => (
              <div
                key={item.role}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-foreground text-sm sm:text-base">{item.role}</span>
                    <Badge variant="outline" className="text-xs font-semibold bg-secondary/30 text-primary border-primary/30">
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {item.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-muted text-foreground font-mono font-medium border border-border"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                    {item.competencyCount} Competencies linked
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      toast({
                        title: item.role,
                        description: `Inspecting ${item.competencyCount} competency bindings.`,
                        variant: 'info',
                      })
                    }}
                    title="View Role Details"
                    aria-label="View Role Details"
                  >
                    <Eye className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
