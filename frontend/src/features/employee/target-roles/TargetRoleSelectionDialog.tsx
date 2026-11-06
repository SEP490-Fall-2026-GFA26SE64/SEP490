import React from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, ShieldAlert, Target, TrendingUp } from 'lucide-react'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { TargetRoleSelectionApiError } from './targetRoleSelectionApi'
import type { ChooseTargetRoleCommand, TargetRoleSelection } from './targetRoleSelectionTypes'
import type { CareerTrack } from './targetRoleTypes'

export interface TargetRoleChoice {
  id: string
  code: string
  name: string
  track: CareerTrack
}

export interface PendingTargetRoleChoice {
  role: TargetRoleChoice
  command: ChooseTargetRoleCommand
}

function getLevelRank(levelName?: string | null): number {
  if (!levelName) return 3
  const lower = levelName.toLowerCase()
  if (lower.includes('level 1') || lower.includes('senior') || lower.includes('lead')) return 1
  if (lower.includes('level 2') || lower.includes('middle') || lower.includes('mid')) return 2
  if (lower.includes('level 3') || lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) return 3
  return 3
}

interface TargetRoleSelectionDialogProps {
  choice: PendingTargetRoleChoice | null
  currentSelection: TargetRoleSelection | null
  error: Error | null
  isPending: boolean
  onCancel: () => void
  onConfirm: (chosenLevel?: string) => void
  currentRole?: string | null
  currentLevel?: string | null
}

export function TargetRoleSelectionDialog({
  choice,
  currentSelection,
  error,
  isPending,
  onCancel,
  onConfirm,
  currentRole,
  currentLevel,
}: TargetRoleSelectionDialogProps) {
  const isChange = currentSelection !== null
  const requiresNewAction = isTerminalSelectionError(error)

  const comp = getActiveCompany()
  const matchedRole = comp?.targetRoles?.find(
    (tr) => tr.id === choice?.role?.id || tr.code === choice?.role?.code,
  )
  const roleLevels =
    matchedRole?.levels && matchedRole.levels.length > 0
      ? matchedRole.levels
      : ['Senior', 'Middle', 'Junior']

  const isSameRole = Boolean(
    currentRole &&
      choice &&
      (choice.role.name.toLowerCase().trim() === currentRole.toLowerCase().trim() ||
        choice.role.name.toLowerCase().includes(currentRole.toLowerCase().trim()) ||
        currentRole.toLowerCase().includes(choice.role.name.toLowerCase().trim()) ||
        (choice.role.code && currentRole.toLowerCase().includes(choice.role.code.toLowerCase()))),
  )

  const currentRank = getLevelRank(currentLevel)

  const defaultSelectableLevel = React.useMemo(() => {
    if (!isSameRole) return roleLevels[roleLevels.length - 1] || 'Junior'
    const higherLevel = roleLevels.find((_, idx) => idx + 1 < currentRank)
    return higherLevel || ''
  }, [roleLevels, isSameRole, currentRank])

  const [selectedLevel, setSelectedLevel] = React.useState<string>('')

  React.useEffect(() => {
    if (choice) {
      setSelectedLevel(defaultSelectableLevel)
    }
  }, [choice, defaultSelectableLevel])

  return (
    <Dialog
      open={choice !== null}
      onOpenChange={(open) => !open && !isPending && onCancel()}
      ariaLabel={isChange ? 'Change target role' : 'Choose target role'}
    >
      {choice && (
        <div>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target size={21} />
              </div>
              <div>
                <DialogTitle>{isChange ? 'Change target role' : 'Choose target role'}</DialogTitle>
                <DialogDescription>
                  {isChange
                    ? 'Confirm the role change against your current selection.'
                    : 'Confirm this role as your active learning target.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {isChange && currentSelection ? (
              <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <RoleCard label="Current role" name={currentSelection.roleSnapshot.name} code={currentSelection.roleSnapshot.code} />
                <ArrowRight size={16} className="mx-auto rotate-90 text-muted-foreground sm:rotate-0" />
                <RoleCard label="New role" name={choice.role.name} code={choice.role.code} highlighted />
              </div>
            ) : (
              <RoleCard label="Selected role" name={choice.role.name} code={choice.role.code} highlighted />
            )}

            {/* Target Level Selection Section */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-primary" />
                  Select Target Level
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isSameRole
                    ? 'Advancement: Only higher levels allowed'
                    : 'Choose target proficiency level'}
                </span>
              </div>

              {isSameRole && currentRank === 1 ? (
                <div className="p-2.5 rounded-lg border border-warning/30 bg-warning/10 text-[11px] text-warning font-medium">
                  You have already reached the highest level (Level 1 - Senior) for this role. You cannot choose a lower or equal level.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {roleLevels.map((lvl, idx) => {
                    const levelRank = idx + 1
                    const isLowerOrEqual = isSameRole && levelRank >= currentRank
                    const isSelected = selectedLevel === lvl

                    return (
                      <label
                        key={lvl}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          isLowerOrEqual
                            ? 'opacity-40 cursor-not-allowed bg-muted/30 border-border'
                            : isSelected
                              ? 'border-primary bg-primary/5 cursor-pointer'
                              : 'border-border bg-card hover:border-primary/40 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="target-level"
                            disabled={isLowerOrEqual}
                            checked={isSelected}
                            onChange={() => setSelectedLevel(lvl)}
                            className="accent-primary"
                          />
                          <Badge
                            variant={levelRank === 1 ? 'primary' : 'secondary'}
                            className="font-mono text-[10px]"
                          >
                            Level {levelRank}
                          </Badge>
                          <span className="font-semibold text-xs text-foreground">{lvl}</span>
                        </div>

                        {isLowerOrEqual && (
                          <span className="text-[10px] text-muted-foreground italic">
                            {levelRank === currentRank ? 'Current Level' : 'Lower Level (Blocked)'}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-muted-foreground">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldAlert size={14} className="text-warning" />
                {isChange ? 'Before changing roles' : 'What this confirmation does'}
              </div>
              <p className="leading-relaxed">
                {isChange
                  ? 'An assessment in progress blocks this change. If accepted, the current pathway is archived while assessment evidence and mastery history remain unchanged.'
                  : 'This records the target role only. It does not start an assessment, calculate gaps, or generate a pathway.'}
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <p className="leading-relaxed">{selectionErrorMessage(error)}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" disabled={isPending} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              disabled={requiresNewAction || (isSameRole && currentRank === 1) || !selectedLevel}
              leftIcon={<CheckCircle2 size={15} />}
              onClick={() => onConfirm(selectedLevel)}
            >
              {isChange ? 'Confirm role change' : 'Confirm target role'}
            </Button>
          </DialogFooter>
        </div>
      )}
    </Dialog>
  )
}

function RoleCard({
  label,
  name,
  code,
  highlighted = false,
}: {
  label: string
  name: string
  code: string
  highlighted?: boolean
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlighted ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{name}</p>
      <Badge variant={highlighted ? 'primary' : 'outline'} className="mt-2 font-mono text-[10px]">{code}</Badge>
    </div>
  )
}

function selectionErrorMessage(error: Error): string {
  if (!(error instanceof TargetRoleSelectionApiError)) {
    return 'The target role could not be saved. Please retry.'
  }
  switch (error.code) {
    case 'ASSESSMENT_IN_PROGRESS':
      return 'Close this dialog, finish or exit the active assessment, then start the role change again.'
    case 'STALE_SELECTION':
    case 'SELECTION_STATE_CONFLICT':
      return 'Your active target role changed in another request. Close this dialog and review the latest selection.'
    case 'ROLE_NOT_AVAILABLE':
      return 'This role is no longer available to your organization.'
    case 'IDEMPOTENCY_CONFLICT':
      return 'This confirmation can no longer be reused. Close the dialog and start the action again.'
    case 'REQUEST_IN_PROGRESS':
      return 'This role change is already being processed. Wait briefly before retrying.'
    case 'CATALOG_UNAVAILABLE':
    case 'DEPENDENCY_UNAVAILABLE':
      return 'A required service is temporarily unavailable. No selection was changed.'
    default:
      return error.message || 'The target role could not be saved. Please retry.'
  }
}

function isTerminalSelectionError(error: Error | null): boolean {
  if (!(error instanceof TargetRoleSelectionApiError)) return false
  return [
    'ASSESSMENT_IN_PROGRESS',
    'STALE_SELECTION',
    'SELECTION_STATE_CONFLICT',
    'ROLE_NOT_AVAILABLE',
    'IDEMPOTENCY_CONFLICT',
  ].includes(error.code)
}
