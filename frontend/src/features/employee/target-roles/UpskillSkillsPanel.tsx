import * as React from 'react'
import {
  BarChart2,
  Check,
  ChevronDown,
  Clock,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  fetchMacroCompetencies,
  fetchMicroSkills,
  type MacroCompetencyDto,
  type MicroSkillDto,
} from '../../../shared/api/microSkillApi'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { cn } from '../../../shared/lib/utils'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { getActiveCompanyId } from '../../../shared/stores/companyStore'

interface EnrichedSkill extends MicroSkillDto {
  durationHours: number
  durationLabel: string
  durationBracket: '< 2 Hours' | '2-5 Hours' | '6-15 Hours' | '15+ Hours'
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  macroName: string
}

const DURATION_BRACKETS = ['All Durations', '< 2 Hours', '2-5 Hours', '6-15 Hours', '15+ Hours'] as const
const LEVEL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const

function calculateSkillMetadata(skill: MicroSkillDto, macroMap: Map<string, string>): EnrichedSkill {
  const hash = (skill.code || skill.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  let durationHours = (hash % 18) + 2
  if (skill.code === 'PROMPT_PATTERNS' || skill.code === 'AI_LITERACY') durationHours = 2
  else if (skill.code === 'GEMINI_MODELS' || skill.code === 'AI_ENABLEMENT') durationHours = 4
  else if (skill.code === 'RESPONSIBLE_AI_PRIN') durationHours = 3
  else if (skill.code === 'MS-PY-001') durationHours = 8
  else if (skill.code === 'MS-DL-001') durationHours = 14
  else if (skill.code === 'JAVA_CORE') durationHours = 16

  let durationBracket: EnrichedSkill['durationBracket'] = '2-5 Hours'
  if (durationHours < 2) durationBracket = '< 2 Hours'
  else if (durationHours <= 5) durationBracket = '2-5 Hours'
  else if (durationHours <= 15) durationBracket = '6-15 Hours'
  else durationBracket = '15+ Hours'

  let level: EnrichedSkill['level'] = 'Intermediate'
  if (durationHours <= 4) level = 'Beginner'
  else if (durationHours >= 12) level = 'Advanced'

  const macroCode = skill.macroCompetencyCode || 'KNOWLEDGE'
  const macroName = macroMap.get(macroCode) || macroCode

  return {
    ...skill,
    durationHours,
    durationLabel: `${durationHours} Hours`,
    durationBracket,
    level,
    macroName,
  }
}

const PAGE_SIZE = 12

function getSearchFromLocation(): string {
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get('search') ?? ''
  } catch {
    return ''
  }
}

export function UpskillSkillsPanel() {
  const { profile, selectTargetSkill, clearTargetSkill } = useEmployeeLearningState()
  const [macroCompetencies, setMacroCompetencies] = React.useState<MacroCompetencyDto[]>([])
  const [skills, setSkills] = React.useState<EnrichedSkill[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // Filters state
  const initialSearch = getSearchFromLocation()
  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [selectedTopic, setSelectedTopic] = React.useState<string>('All')
  const [selectedLevel, setSelectedLevel] = React.useState<string>('All')
  const [selectedDuration, setSelectedDuration] = React.useState<string>('All Durations')
  const [currentPage, setCurrentPage] = React.useState(1)

  React.useEffect(() => {
    const handleLocationChange = () => {
      setSearchQuery(getSearchFromLocation())
      setCurrentPage(1)
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTopic, selectedLevel, selectedDuration])
  
  // Topic Modal state
  const [isTopicModalOpen, setIsTopicModalOpen] = React.useState(false)
  const [tempTopic, setTempTopic] = React.useState<string>('All')

  // Detail Modal state
  const [detailSkill, setDetailSkill] = React.useState<EnrichedSkill | null>(null)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const orgId = getActiveCompanyId() || '00000000-0000-0000-0000-000000000001'
      
      const [macrosData, skillsData] = await Promise.all([
        fetchMacroCompetencies(orgId).catch(() => [] as MacroCompetencyDto[]),
        fetchMicroSkills(orgId).catch(() => [] as MicroSkillDto[]),
      ])

      const macroMap = new Map<string, string>()
      macrosData.forEach((m) => {
        macroMap.set(m.code, m.name)
      })

      // Strictly deduplicate micro-skills by unique code or id so that duplicate entries cannot collide
      const uniqueSkillsMap = new Map<string, MicroSkillDto>()
      for (const s of skillsData) {
        const key = s.code || s.id
        if (!uniqueSkillsMap.has(key)) {
          uniqueSkillsMap.set(key, s)
        }
      }
      const uniqueSkills = Array.from(uniqueSkillsMap.values())

      const enriched = uniqueSkills.map((s) => calculateSkillMetadata(s, macroMap))
      setMacroCompetencies(macrosData)
      setSkills(enriched)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  // Topic options
  const topicOptions = React.useMemo(() => {
    const set = new Set<string>()
    macroCompetencies.forEach((m) => {
      if (m.name) set.add(m.name)
    })
    skills.forEach((s) => {
      if (s.name) set.add(s.name)
    })
    return ['All', ...Array.from(set)]
  }, [macroCompetencies, skills])

  // Filter skills
  const filteredSkills = React.useMemo(() => {
    return skills.filter((item) => {
      // Topic match
      if (selectedTopic !== 'All') {
        const matchesTopic =
          item.macroName.toLowerCase() === selectedTopic.toLowerCase() ||
          item.name.toLowerCase() === selectedTopic.toLowerCase()
        if (!matchesTopic) return false
      }

      // Level match
      if (selectedLevel !== 'All') {
        if (item.level !== selectedLevel) return false
      }

      // Duration match
      if (selectedDuration !== 'All Durations') {
        if (item.durationBracket !== selectedDuration) return false
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          item.macroName.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }

      return true
    })
  }, [skills, selectedTopic, selectedLevel, selectedDuration, searchQuery])

  const hasFilters =
    searchQuery.trim().length > 0 ||
    selectedTopic !== 'All' ||
    selectedLevel !== 'All' ||
    selectedDuration !== 'All Durations'

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTopic('All')
    setSelectedLevel('All')
    setSelectedDuration('All Durations')
    setCurrentPage(1)
  }

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTopic, selectedLevel, selectedDuration])

  const totalItems = filteredSkills.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const paginatedSkills = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSkills.slice(start, start + PAGE_SIZE)
  }, [filteredSkills, currentPage])

  const catalogRef = React.useRef<HTMLElement | null>(null)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openTopicModal = () => {
    setTempTopic(selectedTopic)
    setIsTopicModalOpen(true)
  }

  const applyTopicModal = () => {
    setSelectedTopic(tempTopic)
    setIsTopicModalOpen(false)
  }

  return (
    <section ref={catalogRef} className="space-y-4" aria-labelledby="skills-catalog-heading">
      {/* Header Row matching Roles tab structure */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="skills-catalog-heading" className="flex items-center gap-2 text-base font-bold text-foreground">
            <Sparkles size={18} className="text-primary" />
            Explore Skills
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Browse verified micro-skills and competency requirements for your organization.
          </p>
        </div>
        {!isLoading && !isError && (
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
            {filteredSkills.length} Skills Available
          </Badge>
        )}
      </div>

      {/* Unified Search & Filter Toolbar matching Roles tab layout */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-2xs md:flex-row md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="skill-search"
            type="search"
            maxLength={100}
            placeholder="Search skills by name, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Controls Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Topic Modal Trigger Button */}
          <button
            type="button"
            onClick={openTopicModal}
            className={cn(
              "h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-all cursor-pointer shadow-2xs select-none",
              selectedTopic !== 'All'
                ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-background hover:bg-muted/60 text-foreground"
            )}
            title="Filter by Topic / Competency"
          >
            <SlidersHorizontal size={13} className={selectedTopic !== 'All' ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-muted-foreground font-normal">Topic:</span>
            <span className="font-semibold text-foreground truncate max-w-[120px]">
              {selectedTopic === 'All' ? 'All' : selectedTopic}
            </span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5 shrink-0" />
          </button>

          {/* Level Filter Dropdown Pill */}
          <div
            className={cn(
              "relative h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-all cursor-pointer shadow-2xs select-none",
              selectedLevel !== 'All'
                ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-background hover:bg-muted/60 text-foreground"
            )}
          >
            <BarChart2 size={13} className={selectedLevel !== 'All' ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-muted-foreground font-normal">Level:</span>
            <span className="font-semibold text-foreground">
              {selectedLevel === 'All' ? 'All levels' : selectedLevel}
            </span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5 shrink-0" />
            <select
              aria-label="Filter by level"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl} className="bg-card text-foreground">
                  {lvl === 'All' ? 'All levels' : lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Filter Dropdown Pill */}
          <div
            className={cn(
              "relative h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-all cursor-pointer shadow-2xs select-none",
              selectedDuration !== 'All Durations'
                ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-background hover:bg-muted/60 text-foreground"
            )}
          >
            <Clock size={13} className={selectedDuration !== 'All Durations' ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-muted-foreground font-normal">Duration:</span>
            <span className="font-semibold text-foreground">
              {selectedDuration}
            </span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5 shrink-0" />
            <select
              aria-label="Filter by duration"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              {DURATION_BRACKETS.map((bracket) => (
                <option key={bracket} value={bracket} className="bg-card text-foreground">
                  {bracket}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 px-3 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div role="status" className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading skills...
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">Failed to load skills</p>
            <p className="text-xs text-muted-foreground">Unable to fetch verified micro-skills from the server.</p>
            <Button variant="outline" size="sm" onClick={() => void loadData()} leftIcon={<RefreshCw size={14} />}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredSkills.length === 0 ? (
        <EmptyState
          title="No skills match your filters"
          description="Try broadening your search, level, or topic filter to see available skills."
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedSkills.map((skill) => (
              <Card
                key={skill.id}
                className="flex flex-col justify-between hover:shadow-md transition-all duration-150 border-border bg-card group"
              >
                <div className="p-5 space-y-2.5">
                  {/* Badges: Competency Domain & Level */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[11px] font-semibold text-primary truncate max-w-[170px]">
                      {skill.macroName}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        skill.level === 'Beginner'
                          ? 'bg-success/10 text-success'
                          : skill.level === 'Intermediate'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {skill.level}
                    </span>
                  </div>

                  {/* Skill Name (without code) */}
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {skill.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {skill.description || 'Verified organizational micro-skill for role capability enhancement.'}
                  </p>
                </div>

                {/* Card Footer matching Roles cards */}
                <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Clock size={13} className="text-muted-foreground" />
                    <span>{skill.durationLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7.5 px-3"
                      onClick={() => setDetailSkill(skill)}
                    >
                      View details
                    </Button>
                    {profile.targetSkill === skill.name ? (
                      <Badge variant="success" className="gap-1 text-[11px] h-7.5 px-2.5 font-semibold">
                        <Check size={12} strokeWidth={3} />
                        Tracking
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7.5 px-3 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        onClick={() => selectTargetSkill(skill.name, skill.macroCompetencyCode, skill.level)}
                      >
                        Track
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              itemLabel="skills"
              className="rounded-xl border border-border"
            />
          )}
        </div>
      )}

      {/* Filter by Competency / Topic Modal Popup */}
      <Dialog
        open={isTopicModalOpen}
        onOpenChange={setIsTopicModalOpen}
        className="max-w-md p-6"
        ariaLabel="Filter by Competency / Topic"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-primary" />
            Filter by Competency / Topic
          </DialogTitle>
          <DialogDescription>
            Choose a competency domain or topic to focus your skills view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2 max-h-[50vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            {topicOptions.map((topic) => {
              const active = tempTopic === topic
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setTempTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-muted/50 hover:bg-muted text-foreground border border-border/70'
                  }`}
                >
                  {active && <Check size={12} strokeWidth={3} />}
                  <span>{topic === 'All' ? 'All Topics' : topic}</span>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTempTopic('All')}
            className="text-xs text-muted-foreground"
          >
            Reset to All
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTopicModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={applyTopicModal}
            >
              Apply Filter
            </Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* Skill Detail Dialog (Clean without code) */}
      {detailSkill && (
        <Dialog
          open={Boolean(detailSkill)}
          onOpenChange={(open) => !open && setDetailSkill(null)}
          className="max-w-lg p-6"
          ariaLabel="Skill Details"
        >
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {detailSkill.macroName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {detailSkill.level}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold">{detailSkill.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div>
              <span className="font-semibold text-foreground block mb-1">Overview</span>
              <p className="text-muted-foreground leading-relaxed">
                {detailSkill.description ||
                  'Comprehensive micro-skill covering essential engineering principles, hands-on application, and real-world implementation.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Estimated Duration</span>
                <span className="font-bold text-foreground text-sm flex items-center gap-1 mt-0.5">
                  <Clock size={14} className="text-primary" /> {detailSkill.durationLabel}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Proficiency Target</span>
                <span className="font-bold text-foreground text-sm flex items-center gap-1 mt-0.5">
                  <TrendingUp size={14} className="text-success" /> Level 3 (Applied)
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-foreground block mb-1.5">Learning Objectives</span>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>Domain foundations and operational patterns for {detailSkill.name}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>Cross-functional alignment and integration into target role responsibilities.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>Verification via baseline assessments and adaptive quizzes.</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailSkill(null)}>
              Close
            </Button>
            {profile.targetSkill === detailSkill.name ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearTargetSkill()
                  setDetailSkill(null)
                }}
                className="text-destructive hover:bg-destructive/10 hover:border-destructive/30"
              >
                Untrack Skill
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  selectTargetSkill(detailSkill.name, detailSkill.macroCompetencyCode, detailSkill.level)
                  setDetailSkill(null)
                }}
              >
                Track This Skill
              </Button>
            )}
          </DialogFooter>
        </Dialog>
      )}
    </section>
  )
}
