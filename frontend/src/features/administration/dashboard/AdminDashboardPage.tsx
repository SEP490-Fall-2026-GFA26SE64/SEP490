import {
  Database,
  Layers,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import './AdminDashboardPage.css'

export function AdminDashboardPage() {
  const { toast } = useToast()

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Platform Home', href: '/' },
            { label: 'Administrator Console', href: '/admin/dashboard' },
            { label: 'Role-Skill Taxonomy' },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Heading level={1} size="page" className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <span>Role-Skill Taxonomy & Ontology Console</span>
            </Heading>
            <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
              Curate the enterprise competency ontology, define role requirements, and manage skill taxonomy thresholds.
            </p>
          </div>

          <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5 self-start md:self-center">
            <Database className="h-4 w-4 text-primary" />
            <span>Neo4j Bolt: Active</span>
          </Badge>
        </div>

        {/* Role-Skill Taxonomy Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span>Organizational Role & Competency Mappings</span>
              </CardTitle>
              <CardDescription>
                Define required competencies and micro-skill thresholds for each organizational role.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
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
          </CardHeader>

          <CardContent className="space-y-4">
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
              ].map((item, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{item.role}</span>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.skills.map((skill) => (
                        <span key={skill} className="text-xs px-2 py-0.5 rounded bg-muted text-foreground font-mono">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="text-xs text-muted-foreground shrink-0">{item.competencyCount} Competencies linked</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  )
}
