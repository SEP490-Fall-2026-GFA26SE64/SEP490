import { CheckCircle2, DollarSign, Send, TrendingUp, UserCheck } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { AVERAGE_READINESS, TOTAL_HOURS_SAVED } from '../data/managerData'
import './EvaluationsPage.css'

export function EvaluationsPage() {
  const [evalRating, setEvalRating] = React.useState('level-4')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false)
  const { toast } = useToast()

  const handleConfirmSubmit = () => {
    toast({
      title: '360° Evaluation Endorsed',
      description: 'Manager endorsement successfully recorded in the employee competency profile.',
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Console Header */}
        <PageHeader
          icon={<UserCheck className="h-8 w-8 text-primary" />}
          title="360° Review & Endorsements"
          description="Perform qualitative behavioral verification and endorse employee competencies to unlock advanced roles in the enterprise ontology."
          actions={
            <Badge variant="secondary" className="px-3 py-1 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Active Review Cycle</span>
            </Badge>
          }
        />

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            title="Average Team Readiness"
            value={`${AVERAGE_READINESS}%`}
            valueClassName="text-primary"
            description="+14% improvement this quarter"
          >
            <Progress value={AVERAGE_READINESS} variant="primary" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<DollarSign className="h-4 w-4 text-success" />}
            title="Cumulative Hours Saved"
            value={`${TOTAL_HOURS_SAVED} Hours`}
            valueClassName="text-success"
            description="Saved via adaptive knowledge-gap skipping vs rigid traditional LMS courses."
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-primary" />}
            title="Promotion Ready"
            value="1 Employee"
            description="Elena Rostova has reached 92% of target competency thresholds."
          />
        </div>

        {/* 360 Evaluation Card */}
        <Card className="max-w-3xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <span>360-Degree Manager Competency Rating</span>
              </CardTitle>
              <Badge variant="primary">Sarah Chen</Badge>
            </div>
            <CardDescription>
              Provide qualitative review and verification for Sarah Chen on "Knowledge Graph Modeling & Schema Constraints".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Observed Proficiency Level</label>
              <RadioGroup value={evalRating} onChange={setEvalRating} className="space-y-2">
                {[
                  { id: 'level-1', label: '1 - Fundamental Awareness (Requires direct guidance)' },
                  { id: 'level-2', label: '2 - Novice Application (Applies patterns with supervision)' },
                  { id: 'level-3', label: '3 - Competent (Autonomously solves standard graph modeling tasks)' },
                  { id: 'level-4', label: '4 - Proficient (Designs optimal schemas and mentors peers)' },
                  { id: 'level-5', label: '5 - Subject Matter Expert (Enterprise graph architecture authority)' },
                ].map((lvl) => (
                  <label
                    key={lvl.id}
                    htmlFor={lvl.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                      evalRating === lvl.id
                        ? 'border-primary bg-secondary/50 font-medium text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <RadioGroupItem id={lvl.id} value={lvl.id} />
                    <span>{lvl.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <Button
              variant="primary"
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => setIsConfirmModalOpen(true)}
            >
              Submit Manager Endorsement...
            </Button>
          </CardContent>
        </Card>

        {/* RECONFIRMATION MODAL */}
        <ConfirmationModal
          open={isConfirmModalOpen}
          onOpenChange={setIsConfirmModalOpen}
          title="Confirm Manager Endorsement"
          description="Are you sure you want to record this endorsement? This rating will immediately update Sarah Chen's verified competency ledger and contribute toward role promotion readiness."
          confirmText="Yes, Record Endorsement"
          cancelText="Review Again"
          variant="primary"
          onConfirm={handleConfirmSubmit}
        />
      </div>
    </WorkspaceLayout>
  )
}
