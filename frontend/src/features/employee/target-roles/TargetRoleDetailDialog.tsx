import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw, Target } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { TargetRoleApiError } from './targetRoleApi'
import { useTargetRole } from './targetRoleQueries'
import type { TargetRoleDetail } from './targetRoleTypes'

interface TargetRoleDetailDialogProps {
  roleId: string | null
  activeRoleId: string | null
  selectionUnavailable: boolean
  selectionPending: boolean
  isCompleted?: boolean
  onClose: () => void
  onChoose: (role: TargetRoleDetail) => void
}

export function TargetRoleDetailDialog({
  roleId,
  activeRoleId,
  selectionUnavailable,
  selectionPending,
  isCompleted = false,
  onClose,
  onChoose,
}: TargetRoleDetailDialogProps) {
  const detail = useTargetRole(roleId)
  const notAvailable = detail.error instanceof TargetRoleApiError
    && detail.error.code === 'ROLE_NOT_AVAILABLE'
  const isActive = !isCompleted && detail.data?.id === activeRoleId

  return (
    <Dialog
      open={roleId !== null}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-2xl"
      ariaLabel={detail.data?.name ?? 'Target role details'}
    >
      {detail.isPending ? (
        <div role="status">
          <DialogHeader>
            <DialogTitle>Loading role details</DialogTitle>
            <DialogDescription>Reading the current target-role catalog state...</DialogDescription>
          </DialogHeader>
        </div>
      ) : detail.isError ? (
        <div role="alert">
          <DialogHeader>
            <DialogTitle>{notAvailable ? 'This role is no longer available' : 'Unable to load role details'}</DialogTitle>
            <DialogDescription>
              {notAvailable
                ? 'This role may have been removed, retired, or become unavailable to your organization.'
                : 'The catalog request failed. You can retry or return to the role list.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
            <AlertCircle size={28} className="mx-auto text-destructive" />
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={onClose}>
              Back to roles
            </Button>
            {!notAvailable && (
              <Button variant="primary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => void detail.refetch()}>
                Retry
              </Button>
            )}
          </DialogFooter>
        </div>
      ) : detail.data ? (
        <div className="flex min-h-0 flex-col">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{detail.data.name}</DialogTitle>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold text-primary border-primary/30">
                {detail.data.code}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-medium">
                Junior · Middle · Senior Tiers
              </Badge>
              {isCompleted ? (
                <Badge
                  variant="outline"
                  className="text-[10px] text-success border-success/30 bg-success/5 font-semibold gap-1"
                >
                  <CheckCircle2 size={11} className="text-success shrink-0" />
                  <span>Done</span>
                </Badge>
              ) : isActive ? (
                <Badge variant="success" className="text-[10px]">Active role</Badge>
              ) : null}
            </div>
            <DialogDescription>
              Target role profile in knowledge graph with multi-tier competency calibration.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-5 overflow-y-auto pr-1 text-xs">
            <section>
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</h3>
              <p className="leading-relaxed text-foreground">
                {detail.data.description ?? 'No role description is currently available.'}
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Responsibilities</h3>
              {detail.data.responsibilities.length === 0 ? (
                <p className="text-muted-foreground">No responsibilities are currently listed.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-foreground">
                  {detail.data.responsibilities.map((responsibility) => (
                    <li key={responsibility}>{responsibility}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Required micro-skills
              </h3>
              <div className="space-y-2">
                {detail.data.requirements.map((requirement) => (
                  <div key={requirement.skillId} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3">
                    <div>
                      <p className="font-semibold text-foreground">{requirement.skillName}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{requirement.skillCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-primary">
                        {Math.round(requirement.targetMastery * 100)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">required mastery</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={onClose}>
              Back to roles
            </Button>
            {isCompleted ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="bg-success/5 text-success border-success/30 font-semibold cursor-default opacity-95"
                leftIcon={<CheckCircle2 size={14} className="text-success" />}
              >
                Done
              </Button>
            ) : (
              <Button
                variant={isActive ? 'secondary' : 'primary'}
                size="sm"
                disabled={isActive || selectionUnavailable || selectionPending}
                leftIcon={isActive ? <CheckCircle2 size={14} /> : <Target size={14} />}
                onClick={() => {
                  onClose()
                  onChoose(detail.data)
                }}
              >
                {isActive ? 'Current target role' : selectionPending ? 'Loading selection...' : 'Choose this role'}
              </Button>
            )}
          </DialogFooter>
        </div>
      ) : null}
    </Dialog>
  )
}
