import * as React from 'react'
import {
  BookOpen,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flame,
  Layers,
  Lock,
  Search,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Dialog } from '../../../shared/components/ui/Dialog'
import { Progress } from '../../../shared/components/ui/Progress'
import { cn } from '../../../shared/lib/utils'
import {
  type LearningModuleNode,
  type MicroSkillNode,
  TARGET_ROLE_ROADMAPS,
  type TargetRoleRoadmap,
} from '../data/roadmapData'
import './InteractiveRoleRoadmap.css'

export function InteractiveRoleRoadmap() {
  const [selectedRoleKey, setSelectedRoleKey] = React.useState('ai-knowledge-architect')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedDetailSkill, setSelectedDetailSkill] = React.useState<MicroSkillNode | null>(null)
  const [selectedDetailModule, setSelectedDetailModule] = React.useState<LearningModuleNode | null>(null)

  const roadmapData: TargetRoleRoadmap =
    TARGET_ROLE_ROADMAPS[selectedRoleKey] || TARGET_ROLE_ROADMAPS['ai-knowledge-architect']

  // Derive counts from fixed learner data
  const totalMicroSkills = roadmapData.modules.reduce((acc, m) => acc + m.microSkills.length, 0)
  const achievedMicroSkills = roadmapData.modules.reduce(
    (acc, m) => acc + m.microSkills.filter((s) => s.status === 'achieved').length,
    0
  )
  const notAchievedMicroSkills = totalMicroSkills - achievedMicroSkills
  const overallRoadmapProgress = Math.round(
    (achievedMicroSkills / (totalMicroSkills || 1)) * 100
  )

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Search, Role Switcher, Legend & Progress Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-primary shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Role:
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedRoleKey}
              onChange={(e) => setSelectedRoleKey(e.target.value)}
              aria-label="Select target role for roadmap"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted/60 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ai-knowledge-architect">AI Knowledge Architect</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Quick status counters */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-foreground">
              {achievedMicroSkills} / {totalMicroSkills} Achieved ({notAchievedMicroSkills} Remaining)
            </span>
            <Badge variant="success" className="font-mono font-bold text-xs">
              {overallRoadmapProgress}% Progress
            </Badge>
          </div>
        </div>

        {/* Search & System Color Legend */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search micro-skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Design System Status Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-muted-foreground border-l border-border pl-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-primary inline-block" />
              <span>Module (Primary)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success inline-block" />
              <span>Success / Achieved</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning inline-block" />
              <span>In Progress</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary border border-primary/40 inline-block" />
              <span>Not Achieved (Secondary)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Roadmap Canvas (Styled with strict system tokens) */}
      <div className="roadmap-container">
        <div className="roadmap-canvas">
          {/* =========================================================================
              ROOT NODE: TARGET ROLE
             ========================================================================= */}
          <div className="roadmap-target-role-node group">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles size={18} className="text-primary animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                Target Role
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {roadmapData.name}
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 font-medium">
              {roadmapData.domain} • {roadmapData.jobLevel}
            </p>
          </div>

          {/* Vertical Connecting Spine descending from Target Role */}
          <div className="w-[2px] h-12 bg-primary my-0" />

          {/* =========================================================================
              ROADMAP MODULES & FLANKING MICRO-SKILLS
             ========================================================================= */}
          <div className="w-full flex flex-col items-center">
            {roadmapData.modules.map((module, index) => {
              const leftSkills = module.microSkills.slice(
                0,
                Math.ceil(module.microSkills.length / 2)
              )
              const rightSkills = module.microSkills.slice(
                Math.ceil(module.microSkills.length / 2)
              )
              const isLast = index === roadmapData.modules.length - 1

              // Module class based on progress
              const moduleClass =
                module.status === 'completed'
                  ? 'is-completed'
                  : module.status === 'in_progress'
                    ? 'is-in-progress'
                    : 'is-not-started'

              return (
                <div key={module.id} className="w-full flex flex-col items-center relative">
                  {/* Row containing Left Micro-Skills, Center Module, Right Micro-Skills */}
                  <div className="w-full flex items-center justify-center relative py-5">
                    {/* LEFT MICRO-SKILLS FLANK */}
                    <div className="flex-1 flex flex-col items-end gap-2.5 pr-8 max-w-[340px]">
                      {leftSkills.map((skill) => {
                        const isMatch =
                          !searchQuery ||
                          skill.name.toLowerCase().includes(searchQuery.toLowerCase())
                        const isAchieved = skill.status === 'achieved'

                        return (
                          <div key={skill.id} className="relative group">
                            <div
                              onClick={() => setSelectedDetailSkill(skill)}
                              className={`roadmap-skill-box ${
                                isAchieved ? 'is-achieved' : 'is-not-achieved'
                              } ${!isMatch ? 'opacity-30' : ''}`}
                              title="Click to view micro-skill details"
                            >
                              <span
                                className={`text-[10px] font-mono px-1 py-0.5 rounded font-bold ${
                                  isAchieved
                                    ? 'bg-success/15 text-success'
                                    : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {skill.skillCode}
                              </span>
                              <span className="text-left flex-1 font-medium">{skill.name}</span>
                              {isAchieved ? (
                                <Check size={14} className="text-success shrink-0 stroke-[2.5]" />
                              ) : (
                                <span className="h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                              )}
                            </div>

                            {/* Dotted Connector Line to Center Module */}
                            <svg
                              className="absolute top-1/2 -right-8 w-8 h-4 pointer-events-none overflow-visible"
                              style={{ transform: 'translateY(-50%)' }}
                            >
                              <line
                                x1="0"
                                y1="8"
                                x2="32"
                                y2="8"
                                stroke={isAchieved ? 'hsl(var(--success))' : 'hsl(var(--primary) / 0.35)'}
                                strokeWidth="1.8"
                                strokeDasharray="3 3"
                              />
                            </svg>
                          </div>
                        )
                      })}
                    </div>

                    {/* CENTER LEARNING MODULE (Primary Fill with Status Badges) */}
                    <div className="flex flex-col items-center justify-center shrink-0 z-10 px-2">
                      <div
                        onClick={() => setSelectedDetailModule(module)}
                        className={`roadmap-module-box ${moduleClass}`}
                        title="Click to view module curriculum"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 border-b border-white/25 pb-1 text-white/90">
                          <span className="font-mono tracking-wider">{module.moduleCode}</span>
                          <Badge
                            variant={
                              module.status === 'completed'
                                ? 'success'
                                : module.status === 'in_progress'
                                  ? 'warning'
                                  : 'outline'
                            }
                            className={cn(
                              'text-[10px] uppercase font-bold shadow-xs',
                              module.status === 'not_started'
                                ? 'gap-1 text-white bg-black/40 border-white/30 backdrop-blur-xs'
                                : ''
                            )}
                          >
                            {module.status === 'completed' ? (
                              'Success'
                            ) : module.status === 'in_progress' ? (
                              'In Progress'
                            ) : (
                              <>
                                <Lock size={10} className="inline mr-1 text-white/90" />
                                Locked
                              </>
                            )}
                          </Badge>
                        </div>
                        <span className="leading-snug block font-bold text-white">{module.title}</span>
                      </div>
                    </div>

                    {/* RIGHT MICRO-SKILLS FLANK */}
                    <div className="flex-1 flex flex-col items-start gap-2.5 pl-8 max-w-[340px]">
                      {rightSkills.map((skill) => {
                        const isMatch =
                          !searchQuery ||
                          skill.name.toLowerCase().includes(searchQuery.toLowerCase())
                        const isAchieved = skill.status === 'achieved'

                        return (
                          <div key={skill.id} className="relative group">
                            {/* Dotted Connector Line from Center Module */}
                            <svg
                              className="absolute top-1/2 -left-8 w-8 h-4 pointer-events-none overflow-visible"
                              style={{ transform: 'translateY(-50%)' }}
                            >
                              <line
                                x1="0"
                                y1="8"
                                x2="32"
                                y2="8"
                                stroke={isAchieved ? 'hsl(var(--success))' : 'hsl(var(--primary) / 0.35)'}
                                strokeWidth="1.8"
                                strokeDasharray="3 3"
                              />
                            </svg>

                            <div
                              onClick={() => setSelectedDetailSkill(skill)}
                              className={`roadmap-skill-box ${
                                isAchieved ? 'is-achieved' : 'is-not-achieved'
                              } ${!isMatch ? 'opacity-30' : ''}`}
                              title="Click to view micro-skill details"
                            >
                              <span
                                className={`text-[10px] font-mono px-1 py-0.5 rounded font-bold ${
                                  isAchieved
                                    ? 'bg-success/15 text-success'
                                    : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {skill.skillCode}
                              </span>
                              <span className="text-left flex-1 font-medium">{skill.name}</span>
                              {isAchieved ? (
                                <Check size={14} className="text-success shrink-0 stroke-[2.5]" />
                              ) : (
                                <span className="h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Vertical Spine segment to next module */}
                  {!isLast && (
                    <div
                      className={`w-[2px] h-12 my-0 ${
                        module.status === 'completed'
                          ? 'bg-success'
                          : module.status === 'in_progress'
                            ? 'bg-warning'
                            : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Roadmap Completion Target Checkpoint */}
          <div className="w-[2px] h-10 bg-border" />
          <div className="p-3.5 px-6 rounded-xl border border-success bg-success/10 text-foreground flex items-center gap-2 font-bold text-sm shadow-xs">
            <CheckCircle2 size={18} className="text-success" />
            <span>Target Role Verified: Production Readiness Capstone</span>
          </div>
        </div>
      </div>

      {/* Detail Dialog for Learning Module */}
      <Dialog
        open={!!selectedDetailModule}
        onOpenChange={(open) => !open && setSelectedDetailModule(null)}
        className="max-w-2xl p-0 sm:p-0 overflow-hidden"
      >
        {selectedDetailModule && (() => {
          const modAchieved = selectedDetailModule.microSkills.filter((s) => s.status === 'achieved').length
          const modTotal = selectedDetailModule.microSkills.length
          const modPct = Math.round((modAchieved / (modTotal || 1)) * 100)

          return (
            <div>
              {/* Hero Banner / Header */}
              <div className="bg-gradient-to-br from-secondary/50 via-card to-card border-b border-border p-6 sm:p-7 pr-16">
                <div className="flex flex-wrap items-center gap-2 mb-2.5 max-w-[calc(100%-2.5rem)]">
                  <Badge variant="primary" className="font-mono text-xs font-bold px-2.5 py-0.5 shadow-2xs">
                    {selectedDetailModule.moduleCode}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground bg-card border border-border/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Stage {selectedDetailModule.order} of {roadmapData.modules.length}
                  </span>
                  <Badge
                    variant={
                      selectedDetailModule.status === 'completed'
                        ? 'success'
                        : selectedDetailModule.status === 'in_progress'
                          ? 'warning'
                          : 'outline'
                    }
                    className={cn(
                      'font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-2xs',
                      selectedDetailModule.status === 'not_started' && 'bg-muted/80 text-muted-foreground border-border'
                    )}
                  >
                    {selectedDetailModule.status === 'completed' ? (
                      <>
                        <CheckCircle2 size={12} /> Completed
                      </>
                    ) : selectedDetailModule.status === 'in_progress' ? (
                      <>
                        <Flame size={12} /> In Progress
                      </>
                    ) : (
                      <>
                        <Lock size={12} /> Locked
                      </>
                    )}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {selectedDetailModule.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {selectedDetailModule.description}
                </p>
              </div>

              {/* Body Content */}
              <div className="p-6 sm:p-7 space-y-5">
                {/* 2-Column KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Estimated Duration
                      </div>
                      <div className="text-sm font-bold text-foreground mt-0.5">
                        {Math.round(selectedDetailModule.estimatedDurationMinutes / 60)} Hours (
                        {selectedDetailModule.estimatedDurationMinutes} mins)
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-success/10 text-success shrink-0">
                          <Sparkles size={15} />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Skills Mastery
                        </span>
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {modAchieved} / {modTotal} ({modPct}%)
                      </span>
                    </div>
                    <Progress
                      value={modPct}
                      variant={modPct === 100 ? 'success' : modPct > 0 ? 'warning' : 'secondary'}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Micro-Skills Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Micro-Skills Taught by this Module
                      </span>
                      <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0.2">
                        {selectedDetailModule.microSkills.length}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Evaluated via Bayesian Knowledge Tracing
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                    {selectedDetailModule.microSkills.map((sk) => {
                      const isAchieved = sk.status === 'achieved'
                      return (
                        <div
                          key={sk.id}
                          onClick={() => setSelectedDetailSkill(sk)}
                          className={cn(
                            'p-3.5 rounded-xl border transition-all duration-150 cursor-pointer group',
                            isAchieved
                              ? 'bg-success/5 border-success/30 hover:border-success/60 hover:bg-success/10'
                              : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border shrink-0 mt-0.5">
                                {sk.skillCode}
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                                  {sk.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                  {sk.description}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={isAchieved ? 'success' : 'outline'}
                              className={cn(
                                'text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs',
                                !isAchieved && 'bg-muted/40 text-muted-foreground border-border'
                              )}
                            >
                              {isAchieved ? (
                                <>
                                  <CheckCircle2 size={12} /> Achieved
                                </>
                              ) : (
                                <>
                                  <CircleDashed size={12} /> Not Achieved
                                </>
                              )}
                            </Badge>
                          </div>

                          {/* Skill card footer: time + mini mastery bar */}
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock size={12} className="text-primary" /> {sk.estimatedMinutes} mins estimated
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Mastery:</span>
                              <span className={cn('font-bold', isAchieved ? 'text-success' : 'text-foreground')}>
                                {sk.masteryPercentage}%
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full transition-all', isAchieved ? 'bg-success' : 'bg-primary/50')}
                                  style={{ width: `${sk.masteryPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/20 px-6 sm:px-7 py-3.5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target size={14} className="text-primary shrink-0" />
                  <span className="truncate">
                    Part of <strong className="text-foreground">{roadmapData.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedDetailModule(null)}
                    className="shadow-xs"
                  >
                    Close View
                  </Button>
                </div>
              </div>
            </div>
          )
        })()}
      </Dialog>

      {/* Detail Dialog for Micro-Skill */}
      <Dialog
        open={!!selectedDetailSkill}
        onOpenChange={(open) => !open && setSelectedDetailSkill(null)}
        className="max-w-xl p-0 sm:p-0 overflow-hidden"
      >
        {selectedDetailSkill && (() => {
          const parentModule = roadmapData.modules.find((m) =>
            m.microSkills.some((s) => s.id === selectedDetailSkill.id)
          )
          const isAchieved = selectedDetailSkill.status === 'achieved'

          return (
            <div>
              {/* Hero Banner / Header */}
              <div className="bg-gradient-to-br from-secondary/50 via-card to-card border-b border-border p-6 sm:p-7 pr-16">
                <div className="flex flex-wrap items-center gap-2 mb-2.5 max-w-[calc(100%-2.5rem)]">
                  <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5 border border-primary/25">
                    {selectedDetailSkill.skillCode}
                  </Badge>
                  {parentModule && (
                    <span className="text-xs font-semibold text-muted-foreground bg-card border border-border/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                      Module: {parentModule.moduleCode}
                    </span>
                  )}
                  <Badge
                    variant={isAchieved ? 'success' : 'outline'}
                    className={cn(
                      'font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-2xs',
                      !isAchieved && 'bg-muted/40 text-muted-foreground border-border'
                    )}
                  >
                    {isAchieved ? (
                      <>
                        <CheckCircle2 size={12} /> Achieved
                      </>
                    ) : (
                      <>
                        <CircleDashed size={12} /> Not Achieved
                      </>
                    )}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {selectedDetailSkill.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {selectedDetailSkill.description}
                </p>
              </div>

              {/* Body Content */}
              <div className="p-6 sm:p-7 space-y-5">
                {/* 2-Column KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Estimated Study Time
                      </div>
                      <div className="text-sm font-bold text-foreground mt-0.5">
                        {selectedDetailSkill.estimatedMinutes} Minutes
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-md shrink-0', isAchieved ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary')}>
                          <Zap size={15} />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Mastery Calibrated
                        </span>
                      </div>
                      <span className={cn('text-sm font-bold', isAchieved ? 'text-success' : 'text-primary')}>
                        {selectedDetailSkill.masteryPercentage}%
                      </span>
                    </div>
                    <Progress
                      value={selectedDetailSkill.masteryPercentage}
                      variant={isAchieved ? 'success' : 'primary'}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Ontology Hierarchy Context Box */}
                {parentModule && (
                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <BookOpen size={14} className="text-primary" />
                      <span>Parent Curriculum Module</span>
                    </div>
                    <div className="pl-6">
                      <div className="text-xs font-semibold text-foreground">
                        {parentModule.moduleCode}: {parentModule.title}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {parentModule.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Info Note */}
                <div className="p-3 rounded-xl border border-border/80 bg-secondary/30 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                  <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    This micro-skill represents an atomic competency in the adaptive knowledge graph. Mastery is evaluated automatically via Bayesian Knowledge Tracing based on diagnostic assessment performance.
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/20 px-6 sm:px-7 py-3.5 flex items-center justify-between">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Target size={14} className="text-primary" />
                  <span>Calibrated via Knowledge Graph Engine</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedDetailSkill(null)}
                  className="shadow-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )
        })()}
      </Dialog>
    </div>
  )
}
