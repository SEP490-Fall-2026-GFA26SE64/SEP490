import * as React from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Filter,
  GitBranch,
  Layers,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  Sliders,
} from 'lucide-react'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import type { TargetRoleModel, SkillTargetConfig } from '../../data/ldManagerMockData'

export interface TargetRoleVersionDiffProps {
  currentRole: TargetRoleModel
  allRoles: TargetRoleModel[]
  competencies?: Array<{ id: string; code?: string; name: string; description?: string }>
  microSkills?: Array<{ id: string; code: string; name: string }>
}

export function compareRoleVersions(vA: string = '1.0', vB: string = '1.0'): number {
  const partsA = vA.split('.').map((p) => parseInt(p, 10) || 0)
  const partsB = vB.split('.').map((p) => parseInt(p, 10) || 0)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const a = partsA[i] || 0
    const b = partsB[i] || 0
    if (a !== b) return a - b
  }
  return 0
}

export type DiffFilterType = 'ALL' | 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED'

export function TargetRoleVersionDiff({
  currentRole,
  allRoles,
  competencies = [],
  microSkills = [],
}: TargetRoleVersionDiffProps) {
  // Find predecessor in the same lineage
  const predecessorRole = React.useMemo(() => {
    const lineageKey = currentRole.stableId || currentRole.code
    const candidates = allRoles.filter(
      (r) =>
        (r.stableId === lineageKey || r.code === currentRole.code) &&
        r.id !== currentRole.id &&
        compareRoleVersions(r.version, currentRole.version) < 0
    )
    candidates.sort((a, b) => compareRoleVersions(b.version, a.version))
    return candidates[0] || null
  }, [currentRole, allRoles])

  // Discover all distinct levels present across current role, predecessor, and competencies
  const allLevels = React.useMemo(() => {
    const lvlSet = new Set<string>()
    ;(currentRole.levels || []).forEach((l) => lvlSet.add(l))
    if (predecessorRole) {
      ;(predecessorRole.levels || []).forEach((l) => lvlSet.add(l))
    }
    Object.keys(currentRole.levelCompetencies || {}).forEach((l) => lvlSet.add(l))
    if (predecessorRole) {
      Object.keys(predecessorRole.levelCompetencies || {}).forEach((l) => lvlSet.add(l))
    }
    currentRole.skillTargets.forEach((st) => {
      if (st.level) lvlSet.add(st.level)
    })
    if (predecessorRole) {
      predecessorRole.skillTargets.forEach((st) => {
        if (st.level) lvlSet.add(st.level)
      })
    }
    if (lvlSet.size === 0) {
      return ['Junior', 'Middle', 'Senior']
    }
    return Array.from(lvlSet)
  }, [currentRole, predecessorRole])

  // Active filters: Level filter + Change type filter
  const [selectedLevel, setSelectedLevel] = React.useState<string>('ALL')
  const [activeFilter, setActiveFilter] = React.useState<DiffFilterType>('ALL')

  // Compute Full Diff
  const diff = React.useMemo(() => {
    if (!predecessorRole) return null

    const defaultLevel = currentRole.levels?.[0] || 'Junior'

    const currentSkillMap = new Map<string, SkillTargetConfig>()
    currentRole.skillTargets.forEach((st: SkillTargetConfig) => {
      const key = `${st.level || defaultLevel}::${st.skillId || st.skillCode}`
      currentSkillMap.set(key, { ...st, level: st.level || defaultLevel })
    })

    const prevSkillMap = new Map<string, SkillTargetConfig>()
    predecessorRole.skillTargets.forEach((st: SkillTargetConfig) => {
      const key = `${st.level || defaultLevel}::${st.skillId || st.skillCode}`
      prevSkillMap.set(key, { ...st, level: st.level || defaultLevel })
    })

    const addedSkills: SkillTargetConfig[] = []
    const removedSkills: SkillTargetConfig[] = []
    const modifiedSkills: Array<{ current: SkillTargetConfig; previous: SkillTargetConfig }> = []
    const unchangedSkills: SkillTargetConfig[] = []

    currentSkillMap.forEach((st, key) => {
      if (!prevSkillMap.has(key)) {
        addedSkills.push(st)
      } else {
        const prevSt = prevSkillMap.get(key)!
        if (prevSt.threshold !== st.threshold) {
          modifiedSkills.push({ current: st, previous: prevSt })
        } else {
          unchangedSkills.push(st)
        }
      }
    })

    prevSkillMap.forEach((prevSt, key) => {
      if (!currentSkillMap.has(key)) {
        removedSkills.push(prevSt)
      }
    })

    // Competency comparison across all levels + role-wide union
    const addedComps: Array<{ level: string; compId: string }> = []
    const removedComps: Array<{ level: string; compId: string }> = []

    allLevels.forEach((lvl) => {
      const curLevelComps: string[] = currentRole.levelCompetencies?.[lvl] || []
      const prevLevelComps: string[] = predecessorRole.levelCompetencies?.[lvl] || []

      curLevelComps.forEach((cid: string) => {
        if (!prevLevelComps.includes(cid)) {
          addedComps.push({ level: lvl, compId: cid })
        }
      })

      prevLevelComps.forEach((cid: string) => {
        if (!curLevelComps.includes(cid)) {
          removedComps.push({ level: lvl, compId: cid })
        }
      })
    })

    // Fallback: Check role-wide competencyIds if competencies were stored at role level
    const curAllComps = Array.from(
      new Set([
        ...(currentRole.competencyIds || []),
        ...Object.values(currentRole.levelCompetencies || {}).flat(),
      ])
    )
    const prevAllComps = Array.from(
      new Set([
        ...(predecessorRole.competencyIds || []),
        ...Object.values(predecessorRole.levelCompetencies || {}).flat(),
      ])
    )

    curAllComps.forEach((cid) => {
      if (!prevAllComps.includes(cid) && !addedComps.some((a) => a.compId === cid)) {
        const lvl =
          Object.entries(currentRole.levelCompetencies || {}).find(([, list]) => list.includes(cid))?.[0] ||
          currentRole.levels?.[0] ||
          'All'
        addedComps.push({ level: lvl, compId: cid })
      }
    })

    prevAllComps.forEach((cid) => {
      if (!curAllComps.includes(cid) && !removedComps.some((r) => r.compId === cid)) {
        const lvl =
          Object.entries(predecessorRole.levelCompetencies || {}).find(([, list]) => list.includes(cid))?.[0] ||
          predecessorRole.levels?.[0] ||
          'All'
        removedComps.push({ level: lvl, compId: cid })
      }
    })

    const totalChanges =
      addedSkills.length +
      removedSkills.length +
      modifiedSkills.length +
      addedComps.length +
      removedComps.length

    return {
      addedSkills,
      removedSkills,
      modifiedSkills,
      unchangedSkills,
      addedComps,
      removedComps,
      totalChanges,
    }
  }, [currentRole, predecessorRole, allLevels])

  if (!predecessorRole || !diff) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
        <GitBranch className="h-6 w-6 mx-auto text-primary" />
        <h4 className="text-sm font-bold text-foreground">
          Initial Baseline Version (v{currentRole.version})
        </h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          This is the founding version of <strong>{currentRole.title}</strong>. No prior version exists in this role
          lineage to compare against.
        </p>
      </div>
    )
  }

  // Filter items by level
  const filteredAddedSkills = diff.addedSkills.filter(
    (st) => selectedLevel === 'ALL' || (st.level || allLevels[0]) === selectedLevel
  )
  const filteredRemovedSkills = diff.removedSkills.filter(
    (st) => selectedLevel === 'ALL' || (st.level || allLevels[0]) === selectedLevel
  )
  const filteredModifiedSkills = diff.modifiedSkills.filter(
    ({ current: cur }) => selectedLevel === 'ALL' || (cur.level || allLevels[0]) === selectedLevel
  )
  const filteredUnchangedSkills = diff.unchangedSkills.filter(
    (st) => selectedLevel === 'ALL' || (st.level || allLevels[0]) === selectedLevel
  )
  const filteredAddedComps = diff.addedComps.filter(
    (c) => selectedLevel === 'ALL' || c.level === selectedLevel
  )
  const filteredRemovedComps = diff.removedComps.filter(
    (c) => selectedLevel === 'ALL' || c.level === selectedLevel
  )

  const levelTotalChanges =
    filteredAddedSkills.length +
    filteredRemovedSkills.length +
    filteredModifiedSkills.length +
    filteredAddedComps.length +
    filteredRemovedComps.length

  const handleToggleFilter = (filter: DiffFilterType) => {
    setActiveFilter((prev) => (prev === filter ? 'ALL' : filter))
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Version Meta */}
      <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="font-mono text-xs">
              Previous: v{predecessorRole.version}
            </Badge>
            <span className="text-muted-foreground text-[11px] uppercase font-semibold">
              ({predecessorRole.status})
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="primary" className="font-mono text-xs">
              Current: v{currentRole.version}
            </Badge>
            <span className="text-primary text-[11px] uppercase font-bold">
              ({currentRole.status})
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Author: <strong className="text-foreground">{currentRole.assignedExpertName || 'Domain Expert'}</strong>
          </div>
        </div>

        {/* Level Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-primary" /> Level:
            </span>
            <button
              type="button"
              onClick={() => setSelectedLevel('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                selectedLevel === 'ALL'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border'
              }`}
            >
              All Levels ({diff.totalChanges} changes)
            </button>
            {allLevels.map((lvl) => {
              const lvlChanges =
                diff.addedSkills.filter((s) => (s.level || allLevels[0]) === lvl).length +
                diff.removedSkills.filter((s) => (s.level || allLevels[0]) === lvl).length +
                diff.modifiedSkills.filter((s) => (s.current.level || allLevels[0]) === lvl).length +
                diff.addedComps.filter((c) => c.level === lvl).length +
                diff.removedComps.filter((c) => c.level === lvl).length
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLevel === lvl
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border'
                  }`}
                >
                  <span>{lvl}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      selectedLevel === lvl
                        ? 'bg-white/25 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {lvlChanges}
                  </span>
                </button>
              )
            })}
          </div>

          {activeFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Show All Changes
            </button>
          )}
        </div>

        {/* 2. Interactive Change Metric Badges (Strict Design System Tokens) */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          {/* Added Badge (Skills + Competencies) */}
          <button
            type="button"
            onClick={() => handleToggleFilter('ADDED')}
            title="Click to view Added Skills and Competencies"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeFilter === 'ADDED'
                ? 'bg-success text-success-foreground border-success shadow-xs ring-2 ring-success/25'
                : 'bg-success/15 text-success border-success/30 hover:bg-success/25 hover:border-success/50'
            }`}
          >
            <PlusCircle className={`h-3.5 w-3.5 shrink-0 ${activeFilter === 'ADDED' ? 'text-success-foreground' : 'text-success'}`} />
            <span className={activeFilter === 'ADDED' ? 'text-success-foreground' : 'text-success'}>
              +{filteredAddedSkills.length} Skills · +{filteredAddedComps.length} Competencies Added
            </span>
            {activeFilter === 'ADDED' && <Check className="h-3 w-3 ml-0.5 text-success-foreground" />}
          </button>

          {/* Removed Badge (Skills + Competencies) */}
          <button
            type="button"
            onClick={() => handleToggleFilter('REMOVED')}
            title="Click to view Removed Skills and Competencies"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeFilter === 'REMOVED'
                ? 'bg-destructive text-destructive-foreground border-destructive shadow-xs ring-2 ring-destructive/25'
                : 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25 hover:border-destructive/50'
            }`}
          >
            <MinusCircle className={`h-3.5 w-3.5 shrink-0 ${activeFilter === 'REMOVED' ? 'text-destructive-foreground' : 'text-destructive'}`} />
            <span className={activeFilter === 'REMOVED' ? 'text-destructive-foreground' : 'text-destructive'}>
              -{filteredRemovedSkills.length} Skills · -{filteredRemovedComps.length} Competencies Removed
            </span>
            {activeFilter === 'REMOVED' && <Check className="h-3 w-3 ml-0.5 text-destructive-foreground" />}
          </button>

          {/* Modified Skills Badge */}
          <button
            type="button"
            onClick={() => handleToggleFilter('MODIFIED')}
            title="Click to view Target Mastery Adjusted skills"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeFilter === 'MODIFIED'
                ? 'bg-warning text-warning-foreground border-warning shadow-xs ring-2 ring-warning/25'
                : 'bg-warning/20 text-amber-900 dark:text-amber-200 border-warning/40 hover:bg-warning/30 hover:border-warning/60'
            }`}
          >
            <Sliders className={`h-3.5 w-3.5 shrink-0 ${activeFilter === 'MODIFIED' ? 'text-warning-foreground' : 'text-amber-900 dark:text-amber-200'}`} />
            <span className={activeFilter === 'MODIFIED' ? 'text-warning-foreground' : 'text-amber-900 dark:text-amber-200'}>
              {filteredModifiedSkills.length} Target Mastery Adjusted
            </span>
            {activeFilter === 'MODIFIED' && <Check className="h-3 w-3 ml-0.5 text-warning-foreground" />}
          </button>

          {/* Unchanged Skills Badge */}
          <button
            type="button"
            onClick={() => handleToggleFilter('UNCHANGED')}
            title="Click to view Unchanged skills"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeFilter === 'UNCHANGED'
                ? 'bg-secondary text-secondary-foreground border-primary/40 shadow-xs ring-2 ring-primary/25 font-bold'
                : 'bg-muted/70 text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${activeFilter === 'UNCHANGED' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={activeFilter === 'UNCHANGED' ? 'text-secondary-foreground' : 'text-muted-foreground'}>
              {filteredUnchangedSkills.length} Unchanged
            </span>
            {activeFilter === 'UNCHANGED' && <Check className="h-3 w-3 ml-0.5 text-primary" />}
          </button>
        </div>
      </div>

      {/* 3. Empty State or Filtered Tables */}
      {levelTotalChanges === 0 && activeFilter !== 'UNCHANGED' ? (
        <div className="p-6 rounded-xl border border-dashed border-border bg-muted/10 text-center space-y-2">
          <CheckCircle2 className="h-6 w-6 mx-auto text-success" />
          <h4 className="text-xs font-bold text-foreground">
            {selectedLevel === 'ALL' ? 'Identical Configuration' : `No Changes on ${selectedLevel} Level`}
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            {selectedLevel === 'ALL'
              ? `No skill target, competency, or target mastery changes between v${predecessorRole.version} and v${currentRole.version}.`
              : `All micro-skills and competencies for ${selectedLevel} remain identical between revisions.`}
          </p>
          {filteredUnchangedSkills.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFilter('UNCHANGED')}
              className="text-xs mt-1"
            >
              View {filteredUnchangedSkills.length} Unchanged Skills
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Filter Helper Bar */}
          {activeFilter !== 'ALL' && (
            <div className="px-3.5 py-1.5 rounded-lg bg-muted border border-border flex items-center justify-between text-xs">
              <span className="text-foreground font-semibold">
                Viewing filtered changes:{' '}
                <strong className="text-foreground font-bold">
                  {activeFilter === 'ADDED' &&
                    `Added (+${filteredAddedSkills.length} Skills, +${filteredAddedComps.length} Competencies)`}
                  {activeFilter === 'REMOVED' &&
                    `Removed (-${filteredRemovedSkills.length} Skills, -${filteredRemovedComps.length} Competencies)`}
                  {activeFilter === 'MODIFIED' &&
                    `Target Mastery Adjusted (${filteredModifiedSkills.length})`}
                  {activeFilter === 'UNCHANGED' &&
                    `Unchanged Skills (${filteredUnchangedSkills.length})`}
                </strong>
                {selectedLevel !== 'ALL' && ` on ${selectedLevel} Level`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilter('ALL')}
                className="h-6 px-2 text-xs text-foreground hover:text-foreground font-bold"
              >
                Clear Filter
              </Button>
            </div>
          )}

          {/* TABLE: Micro-skill Changes (Added, Modified, Removed) */}
          {(activeFilter === 'ALL' ||
            activeFilter === 'ADDED' ||
            activeFilter === 'REMOVED' ||
            activeFilter === 'MODIFIED') &&
            (filteredAddedSkills.length > 0 ||
              filteredRemovedSkills.length > 0 ||
              filteredModifiedSkills.length > 0) && (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    Micro-skill Target Changes (
                    {(activeFilter === 'ADDED'
                      ? filteredAddedSkills.length
                      : activeFilter === 'REMOVED'
                      ? filteredRemovedSkills.length
                      : activeFilter === 'MODIFIED'
                      ? filteredModifiedSkills.length
                      : filteredAddedSkills.length + filteredRemovedSkills.length + filteredModifiedSkills.length)}
                    )
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Comparison against baseline v{predecessorRole.version}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Level</th>
                        <th className="py-2 px-3">Skill Code &amp; Title</th>
                        <th className="py-2 px-3 text-center">Previous Mastery</th>
                        <th className="py-2 px-3 text-center">Current Mastery</th>
                        <th className="py-2 px-3 text-right">Change Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* Added Skills */}
                      {(activeFilter === 'ALL' || activeFilter === 'ADDED') &&
                        filteredAddedSkills.map((st) => {
                          const skill = microSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                          return (
                            <tr
                              key={`added-${st.level}-${st.skillId || st.skillCode}`}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {st.level || allLevels[0]}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-foreground mr-1.5">
                                  {st.skillCode || skill?.code}
                                </span>
                                <span className="text-muted-foreground">{st.skillName || skill?.name}</span>
                              </td>
                              <td className="py-2 px-3 text-center text-muted-foreground font-mono">—</td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                                {st.threshold}%
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success border border-success/30">
                                  + Added
                                </span>
                              </td>
                            </tr>
                          )
                        })}

                      {/* Modified Skills */}
                      {(activeFilter === 'ALL' || activeFilter === 'MODIFIED') &&
                        filteredModifiedSkills.map(({ current: cur, previous: prev }) => {
                          const skill = microSkills.find((s) => s.id === cur.skillId || s.code === cur.skillCode)
                          const diffPct = cur.threshold - prev.threshold
                          return (
                            <tr
                              key={`mod-${cur.level}-${cur.skillId || cur.skillCode}`}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {cur.level || allLevels[0]}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-foreground mr-1.5">
                                  {cur.skillCode || skill?.code}
                                </span>
                                <span className="text-muted-foreground">{cur.skillName || skill?.name}</span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-muted-foreground line-through">
                                {prev.threshold}%
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                                {cur.threshold}%
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/20 text-amber-900 dark:text-amber-200 border border-warning/40">
                                  ~ {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                                </span>
                              </td>
                            </tr>
                          )
                        })}

                      {/* Removed Skills */}
                      {(activeFilter === 'ALL' || activeFilter === 'REMOVED') &&
                        filteredRemovedSkills.map((st) => {
                          const skill = microSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                          return (
                            <tr
                              key={`rem-${st.level}-${st.skillId || st.skillCode}`}
                              className="hover:bg-muted/30 transition-colors opacity-80"
                            >
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {st.level || allLevels[0]}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-foreground line-through mr-1.5">
                                  {st.skillCode || skill?.code}
                                </span>
                                <span className="text-muted-foreground line-through">{st.skillName || skill?.name}</span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-muted-foreground line-through">
                                {st.threshold}%
                              </td>
                              <td className="py-2 px-3 text-center text-muted-foreground font-mono">—</td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                                  - Removed
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* TABLE: Competency Changes (Added, Removed) */}
          {(activeFilter === 'ALL' || activeFilter === 'ADDED' || activeFilter === 'REMOVED') &&
            ((activeFilter !== 'REMOVED' && filteredAddedComps.length > 0) ||
              (activeFilter !== 'ADDED' && filteredRemovedComps.length > 0)) && (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Domain Competency Changes (
                    {(activeFilter === 'ADDED'
                      ? filteredAddedComps.length
                      : activeFilter === 'REMOVED'
                      ? filteredRemovedComps.length
                      : filteredAddedComps.length + filteredRemovedComps.length)}
                    )
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Comparison against baseline v{predecessorRole.version}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Level</th>
                        <th className="py-2 px-3">Competency Code &amp; Name</th>
                        <th className="py-2 px-3 text-right">Change Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* Added Competencies */}
                      {(activeFilter === 'ALL' || activeFilter === 'ADDED') &&
                        filteredAddedComps.map(({ level, compId }) => {
                          const comp = competencies.find((c) => c.id === compId || c.code === compId)
                          return (
                            <tr key={`add-comp-${level}-${compId}`} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {level}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-foreground mr-1.5">
                                  {comp?.code || compId}
                                </span>
                                <span className="text-muted-foreground">{comp?.name || compId}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success border border-success/30">
                                  + Added
                                </span>
                              </td>
                            </tr>
                          )
                        })}

                      {/* Removed Competencies */}
                      {(activeFilter === 'ALL' || activeFilter === 'REMOVED') &&
                        filteredRemovedComps.map(({ level, compId }) => {
                          const comp = competencies.find((c) => c.id === compId || c.code === compId)
                          return (
                            <tr key={`rem-comp-${level}-${compId}`} className="hover:bg-muted/30 transition-colors opacity-80">
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {level}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-foreground line-through mr-1.5">
                                  {comp?.code || compId}
                                </span>
                                <span className="text-muted-foreground line-through">{comp?.name || compId}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                                  - Removed
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* TABLE: Unchanged Skills (Shown when filter is UNCHANGED) */}
          {activeFilter === 'UNCHANGED' && (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Unchanged Micro-skills ({filteredUnchangedSkills.length})
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Skills that retain the same target mastery from v{predecessorRole.version}
                </span>
              </div>

              {filteredUnchangedSkills.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No unchanged skills on this level filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Level</th>
                        <th className="py-2 px-3">Skill Code &amp; Title</th>
                        <th className="py-2 px-3 text-center">Target Mastery</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUnchangedSkills.map((st) => {
                        const skill = microSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                        return (
                          <tr key={`unchanged-${st.level}-${st.skillId || st.skillCode}`} className="hover:bg-muted/20">
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {st.level || allLevels[0]}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-foreground mr-1.5">
                                {st.skillCode || skill?.code}
                              </span>
                              <span className="text-muted-foreground">{st.skillName || skill?.name}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                              {st.threshold}%
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                <Check className="h-3 w-3" /> Unchanged
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
