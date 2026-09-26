import * as React from 'react'
import { ArrowRight, Check, ChevronDown, Compass, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEmployeeLearningState } from '../../hooks/useEmployeeLearningState'
import { Badge } from './Badge'

export function TargetRoleSelector() {
  const { profile, setSelectedViewRoleKey, isViewingActiveRole, isLearningLocked } =
    useEmployeeLearningState()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentRoleTitle = isViewingActiveRole
    ? profile.targetRole || 'No Active Goal'
    : profile.previousRoles.find((r) => r.roleKey === profile.selectedViewRoleKey)?.roleTitle ||
      'Previous Goal'

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center gap-2">
      {/* Container matching standard bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card shadow-2xs">
        {/* Target Icon */}
        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Target size={14} className="text-primary" />
        </div>

        {/* Label */}
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
          Target Role:
        </span>

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer border border-border/60"
          aria-expanded={isOpen}
        >
          <span className="truncate max-w-[200px] sm:max-w-[260px]">{currentRoleTitle}</span>
          <ChevronDown
            size={13}
            className={`text-muted-foreground transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {/* Active status indicator badge */}
        {isViewingActiveRole ? (
          isLearningLocked ? (
            <Badge variant="warning" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
              Diagnostic Required
            </Badge>
          ) : (
            <Badge variant="success" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
              Active Pathway
            </Badge>
          )
        ) : (
          <Badge variant="secondary" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
            Previous Completed
          </Badge>
        )}
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 p-1.5 text-xs">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Current Active Goal
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedViewRoleKey('active')
                setIsOpen(false)
              }}
              className={`w-full text-left p-2 rounded-lg mt-1 transition-colors flex items-center justify-between cursor-pointer ${
                isViewingActiveRole ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'
              }`}
            >
              <div>
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <span>{profile.targetRole || 'No Target Selected'}</span>
                  {profile.targetRoleVersion && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({profile.targetRoleVersion.split(' ')[0]})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Target Benchmark: {profile.targetReadinessScore}% Minimum
                </div>
              </div>
              {isViewingActiveRole && <Check size={15} className="text-primary shrink-0" />}
            </button>

            {/* Direct Link to Role Selection Catalog */}
            <div className="pt-2">
              <Link
                to="/employee/target-roles"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/80 hover:bg-secondary text-primary font-semibold transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Compass size={14} />
                  <span>Browse &amp; Change Target Roles</span>
                </span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Previous / Finished Target Roles */}
          {profile.previousRoles && profile.previousRoles.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Previous &amp; Completed Pathways
                </span>
              </div>

              <div className="space-y-1 mt-1">
                {profile.previousRoles.map((role) => {
                  const isSelected = profile.selectedViewRoleKey === role.roleKey
                  return (
                    <button
                      key={role.roleKey}
                      type="button"
                      onClick={() => {
                        setSelectedViewRoleKey(role.roleKey)
                        setIsOpen(false)
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected ? 'bg-secondary text-primary font-bold' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground truncate">{role.roleTitle}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({role.version})
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {role.status === 'completed' ? 'Completed' : 'Superseded'} on {role.completedAt}{' '}
                          &bull; Score: {role.readinessScore}%
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
