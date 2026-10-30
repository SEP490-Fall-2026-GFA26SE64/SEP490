import * as React from 'react'
import { AlertCircle, Loader2, Search, Sparkles, Target, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchMicroSkills, type MicroSkillDto } from '../../api/microSkillApi'
import { currentRoles, type CurrentRole } from '../../../features/employee/target-roles/currentRoleFlowApi'
import { getActiveCompanyId } from '../../stores/companyStore'
import { Badge } from './Badge'
import { cn } from '../../lib/utils'

export function GlobalSearchbar({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [roles, setRoles] = React.useState<CurrentRole[]>([])
  const [skills, setSkills] = React.useState<MicroSkillDto[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Fetch roles and skills data once or when company changes
  React.useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadCatalog() {
      try {
        setIsLoading(true)
        const orgId = getActiveCompanyId() || '00000000-0000-0000-0000-000000000001'
        const [rolesData, skillsData] = await Promise.all([
          currentRoles(controller.signal).catch(() => [] as CurrentRole[]),
          fetchMicroSkills(orgId).catch(() => [] as MicroSkillDto[]),
        ])

        if (isMounted) {
          setRoles(rolesData)
          setSkills(skillsData)
        }
      } catch {
        // Silently fall back to empty catalogs
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCatalog()

    const handleOrgChange = () => {
      void loadCatalog()
    }
    window.addEventListener('active_company_changed', handleOrgChange)

    return () => {
      isMounted = false
      controller.abort()
      window.removeEventListener('active_company_changed', handleOrgChange)
    }
  }, [])

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const trimmedQuery = query.trim().toLowerCase()

  // Filtered matching items (max 5 each for snug density)
  const matchingRoles = React.useMemo(() => {
    if (!trimmedQuery) return []
    return roles
      .filter((r) =>
        r.name.toLowerCase().includes(trimmedQuery) ||
        r.scope.toLowerCase().includes(trimmedQuery) ||
        r.occupationName.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 5)
  }, [roles, trimmedQuery])

  const matchingSkills = React.useMemo(() => {
    if (!trimmedQuery) return []
    return skills
      .filter((s) =>
        s.name.toLowerCase().includes(trimmedQuery) ||
        (s.description && s.description.toLowerCase().includes(trimmedQuery)) ||
        (s.macroCompetencyCode && s.macroCompetencyCode.toLowerCase().includes(trimmedQuery))
      )
      .slice(0, 5)
  }, [skills, trimmedQuery])

  const hasMatches = matchingRoles.length > 0 || matchingSkills.length > 0

  const handleSelectRole = (role: CurrentRole) => {
    setIsOpen(false)
    navigate(`/employee/upskilling?tab=roles&search=${encodeURIComponent(role.name)}`)
  }

  const handleSelectSkill = (skill: MicroSkillDto) => {
    setIsOpen(false)
    navigate(`/employee/upskilling?tab=skills&search=${encodeURIComponent(skill.name)}`)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!trimmedQuery) return
    setIsOpen(false)
    // If top match is a role and query strongly matches, navigate to roles, else generic
    if (matchingRoles.length > 0 && matchingSkills.length === 0) {
      navigate(`/employee/upskilling?tab=roles&search=${encodeURIComponent(query.trim())}`)
    } else if (matchingSkills.length > 0 && matchingRoles.length === 0) {
      navigate(`/employee/upskilling?tab=skills&search=${encodeURIComponent(query.trim())}`)
    } else {
      navigate(`/employee/upskilling?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-xl mx-auto', className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="relative flex items-center w-full rounded-full border border-border bg-muted/40 hover:bg-card focus-within:bg-card shadow-2xs hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => {
              if (query.trim().length > 0) setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search skills, target roles, competencies..."
            className="w-full bg-transparent pl-4 pr-11 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
            aria-label="Search skills and target roles directly"
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors mr-1 cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {/* Coursera-style prominent circular search CTA button */}
          <button
            type="submit"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shrink-0 mr-1 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
            title="Search"
            aria-label="Submit search"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} className="stroke-[2.5]" />
            )}
          </button>
        </div>
      </form>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && trimmedQuery.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-border/60 animate-in fade-in-50 slide-in-from-top-1">
          {hasMatches ? (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
              {/* Target Roles section */}
              {matchingRoles.length > 0 && (
                <div>
                  <div className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                    <Target size={13} className="text-primary" />
                    <span>Target Roles ({matchingRoles.length})</span>
                  </div>
                  <div className="py-1">
                    {matchingRoles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className="w-full text-left px-3.5 py-2 hover:bg-primary/5 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {role.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="font-mono">{role.code}</span>
                            {role.occupationName && <span>• {role.occupationName}</span>}
                          </div>
                        </div>
                        {role.catalogVersion ? (
                          <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-bold">
                            {role.catalogVersion}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-bold text-primary border-primary/30">
                            J · M · S
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Micro-Skills section */}
              {matchingSkills.length > 0 && (
                <div>
                  <div className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" />
                    <span>Micro-Skills ({matchingSkills.length})</span>
                  </div>
                  <div className="py-1">
                    {matchingSkills.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleSelectSkill(skill)}
                        className="w-full text-left px-3.5 py-2 hover:bg-primary/5 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {skill.name}
                          </div>
                          {skill.description && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-sm">
                              {skill.description}
                            </div>
                          )}
                        </div>
                        {skill.macroCompetencyCode && (
                          <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
                            {skill.macroCompetencyCode.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <AlertCircle size={20} className="text-muted-foreground/60" />
              <span>No target roles or skills found matching &ldquo;{query}&rdquo;</span>
            </div>
          )}

          {/* Dropdown Footer */}
          <div className="px-3.5 py-2 text-[11px] text-muted-foreground bg-muted/20 flex items-center justify-between">
            <span className="flex items-center gap-1">
              Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] border border-border">Enter</kbd> to view all
            </span>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="text-primary font-semibold hover:underline cursor-pointer"
            >
              Search all &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
