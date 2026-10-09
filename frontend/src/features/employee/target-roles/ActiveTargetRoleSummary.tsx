import { AlertCircle, CheckCircle2, RefreshCw, Target } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { useTargetRoleSelection } from './targetRoleSelectionQueries'

const selectedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ActiveTargetRoleSummary() {
  const selection = useTargetRoleSelection()

  if (selection.isPending) {
    return (
      <Card role="status" aria-live="polite">
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <Target size={18} className="shrink-0 text-primary" />
          Loading active target role...
        </CardContent>
      </Card>
    )
  }

  if (selection.isError) {
    return (
      <Card role="alert" className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">Active target role unavailable</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The current selection could not be loaded from the server.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void selection.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!selection.data) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Target size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">No active target role</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose an available role from the catalog to establish your learning target.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { roleSnapshot } = selection.data

  return (
    <Card className="border-success/40" aria-labelledby="active-target-role-heading">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b border-border/70 pb-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1 text-[10px]">
              <CheckCircle2 size={12} />
              Active target role
            </Badge>
            <Badge variant="outline" className="text-[10px]">Revision {selection.data.targetRevision}</Badge>
          </div>
          <CardTitle id="active-target-role-heading" className="text-lg">{roleSnapshot.name}</CardTitle>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{roleSnapshot.code}</p>
        </div>
        <Target size={22} className="shrink-0 text-success" aria-hidden="true" />
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 text-xs sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Track</p>
          <p className="mt-1 font-semibold text-foreground">{roleSnapshot.track}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Seniority</p>
          <p className="mt-1 font-semibold text-foreground">{roleSnapshot.seniority}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Selected</p>
          <p className="mt-1 font-semibold text-foreground">
            {selectedAtFormatter.format(new Date(selection.data.selectedAt))}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
