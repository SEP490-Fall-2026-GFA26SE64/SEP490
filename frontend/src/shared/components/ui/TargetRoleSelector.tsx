import * as React from 'react'
import { Check, ChevronDown, Sparkles, Target } from 'lucide-react'
import { useEmployeeLearningState } from '../../hooks/useEmployeeLearningState'
import { useTranslation } from '../../i18n/LanguageContext'
import { Badge } from './Badge'
import { cn } from '../../lib/utils'

export function TargetRoleSelector() {
  const {
    profile,
    setSelectedViewRoleKey,
    setSelectedViewType,
    setSelectedViewSkillKey,
    isViewingActiveRole,
    isLearningLocked,
  } = useEmployeeLearningState()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const viewType = profile.selectedViewType || 'role'

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Resolve current title based on active view mode (Role vs Skill)
  const isViewingActiveSkill = (profile.selectedViewSkillKey || 'active') === 'active'

  const currentRoleTitle = isViewingActiveRole
    ? profile.targetRole || 'No Active Goal'
    : profile.previousRoles.find((r) => r.roleKey === profile.selectedViewRoleKey)?.roleTitle ||
      'Previous Goal'

  const currentSkillTitle = isViewingActiveSkill
    ? profile.targetSkill || 'No Active Skill'
    : (profile.previousSkills || []).find((s) => s.skillKey === profile.selectedViewSkillKey)?.skillName ||
      'Previous Skill'

  const isRoleActive = isViewingActiveRole
  const isSkillActive = isViewingActiveSkill

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center gap-2">
      {/* Segmented Mode Toggle: [ Role | Skill ] */}
      <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border/70 shadow-2xs shrink-0">
        <button
          type="button"
          onClick={() => {
            setSelectedViewType('role')
            setIsOpen(false)
          }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
            viewType === 'role'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="View Target Roles"
        >
          <Target size={13} className={viewType === 'role' ? 'text-primary' : 'text-muted-foreground'} />
          <span>Role</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedViewType('skill')
            setIsOpen(false)
          }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
            viewType === 'skill'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="View Tracked Skills"
        >
          <Sparkles size={13} className={viewType === 'skill' ? 'text-primary' : 'text-muted-foreground'} />
          <span>Skill</span>
        </button>
      </div>

      {/* Container matching standard bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card shadow-2xs">
        {/* Dynamic Icon */}
        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {viewType === 'role' ? (
            <Target size={14} className="text-primary" />
          ) : (
            <Sparkles size={14} className="text-primary" />
          )}
        </div>

        {/* Dynamic Label */}
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
          {viewType === 'role' ? `${t('header.targetRole')}:` : 'TARGET SKILL:'}
        </span>

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer border border-border/60"
          aria-expanded={isOpen}
        >
          <span className="truncate max-w-[180px] sm:max-w-[240px]">
            {viewType === 'role' ? currentRoleTitle : currentSkillTitle}
          </span>
          <ChevronDown
            size={13}
            className={`text-muted-foreground transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {/* Status indicator badge (Active vs Completed) */}
        {viewType === 'role' ? (
          isRoleActive ? (
            isLearningLocked ? (
              <Badge variant="warning" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
                {t('header.diagnosticRequired')}
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
                {t('roles.active')}
              </Badge>
            )
          ) : (
            <Badge variant="secondary" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
              Completed
            </Badge>
          )
        ) : isSkillActive ? (
          profile.targetSkill ? (
            <Badge variant="success" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
              {t('roles.active')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex text-muted-foreground">
              None
            </Badge>
          )
        ) : (
          <Badge variant="secondary" className="text-[10px] font-semibold py-0.5 hidden sm:inline-flex">
            Completed
          </Badge>
        )}
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 p-1.5 text-xs">
          {viewType === 'role' ? (
            /* --- TARGET ROLE VIEW --- */
            <>
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
              </div>

              {/* Completed Pathways */}
              {profile.previousRoles && profile.previousRoles.length > 0 && (
                <div className="pt-2">
                  <div className="px-3 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Completed Pathways
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
            </>
          ) : (
            /* --- TARGET SKILL VIEW --- */
            <>
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Current Active Skill
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (setSelectedViewSkillKey) setSelectedViewSkillKey('active')
                    setIsOpen(false)
                  }}
                  className={`w-full text-left p-2 rounded-lg mt-1 transition-colors flex items-center justify-between cursor-pointer ${
                    isViewingActiveSkill ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'
                  }`}
                >
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <span>{profile.targetSkill || 'No Skill Selected'}</span>
                      {profile.targetSkillLevel && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ({profile.targetSkillLevel})
                        </span>
                      )}
                    </div>
                    {profile.targetSkillMacroCode && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Domain: {profile.targetSkillMacroCode}
                      </div>
                    )}
                  </div>
                  {isViewingActiveSkill && <Check size={15} className="text-primary shrink-0" />}
                </button>
              </div>

              {/* Completed Skills */}
              {(profile.previousSkills || []).length > 0 && (
                <div className="pt-2">
                  <div className="px-3 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Completed Skills
                    </span>
                  </div>

                  <div className="space-y-1 mt-1">
                    {(profile.previousSkills || []).map((skill) => {
                      const isSelected = (profile.selectedViewSkillKey || 'active') === skill.skillKey
                      return (
                        <button
                          key={skill.skillKey}
                          type="button"
                          onClick={() => {
                            if (setSelectedViewSkillKey) setSelectedViewSkillKey(skill.skillKey)
                            setIsOpen(false)
                          }}
                          className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected ? 'bg-secondary text-primary font-bold' : 'hover:bg-muted'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate">{skill.skillName}</span>
                              {skill.macroCode && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  ({skill.macroCode})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              Completed on {skill.completedAt} &bull; Score: {skill.masteryScore}%
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
