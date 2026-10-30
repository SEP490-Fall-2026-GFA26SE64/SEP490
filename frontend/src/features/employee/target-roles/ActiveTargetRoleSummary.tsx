import * as React from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, RefreshCw, Target } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { cn } from '../../../shared/lib/utils'
import { useTargetRoleSelection } from './targetRoleSelectionQueries'

import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'

const selectedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ActiveTargetRoleSummary() {
  const selection = useTargetRoleSelection()
  const { profile } = useEmployeeLearningState()
  const [isExpanded, setIsExpanded] = React.useState(false)

  const isRoleDone = React.useMemo(() => {
    if (!selection.data) return false
    const role = selection.data.roleSnapshot
    const prevRoles = profile?.previousRoles || []
    return prevRoles.some(
      (pr) =>
        pr.status === 'completed' &&
        (pr.roleTitle.toLowerCase() === role.name.toLowerCase() ||
         pr.roleKey.toLowerCase() === role.code.toLowerCase())
    )
  }, [selection.data, profile?.previousRoles])

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

  if (!selection.data || isRoleDone) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Target size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">No active target role</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isRoleDone ? (
                <>
                  You have completed <strong>{selection.data?.roleSnapshot.name}</strong>! Choose your next target role from the catalog below.
                </>
              ) : (
                'Choose an available role from the catalog below to establish your career target.'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { roleSnapshot } = selection.data

  return (
    <Card className="border-border bg-card shadow-2xs transition-all duration-150" aria-labelledby="active-target-role-heading">
      <CardHeader
        className={cn(
          "flex-row items-center justify-between gap-3 space-y-0 py-3.5 px-5 transition-colors cursor-pointer select-none",
          isExpanded && "border-b border-border/70"
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle id="active-target-role-heading" className="text-sm sm:text-base font-bold text-foreground">
                Active Target Role
              </CardTitle>
              <Badge variant="success" className="gap-1 text-[10px] font-semibold py-0.5 whitespace-nowrap">
                <CheckCircle2 size={11} />
                <span>{roleSnapshot.name}</span>
              </Badge>
              <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                Revision {selection.data.targetRevision}
              </Badge>
            </div>
            {!isExpanded && (
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-primary font-mono">{roleSnapshot.code}</span>
                <span>•</span>
                <span className="font-medium text-foreground">Junior · Middle · Senior Tiers</span>
                <span>•</span>
                <span>{roleSnapshot.requirementCount ?? 0} Micro-skills</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded((prev) => !prev)
            }}
            rightIcon={
              <ChevronDown
                size={14}
                className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
              />
            }
            className="text-xs text-muted-foreground hover:text-foreground h-7.5 px-2 cursor-pointer whitespace-nowrap"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse active target role' : 'Expand active target role'}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid gap-4 text-xs sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground font-semibold">Standard Calibration</p>
              <p className="mt-1 font-semibold text-foreground">Junior · Middle · Senior</p>
            </div>
            <div>
              <p className="text-muted-foreground font-semibold">Curriculum Scope</p>
              <p className="mt-1 font-semibold text-foreground">{roleSnapshot.requirementCount ?? 0} Micro-skills</p>
            </div>
            <div>
              <p className="text-muted-foreground font-semibold">Selected</p>
              <p className="mt-1 font-semibold text-foreground">
                {selectedAtFormatter.format(new Date(selection.data.selectedAt))}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
