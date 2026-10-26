import React, { useState } from 'react'
import {
  Award,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileCode,
  Maximize2,
  Pause,
  Play,
  ShieldCheck,
  Terminal,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { cn } from '../../../shared/lib/utils'

export type LessonType = 'reading' | 'video'

export interface StructuredReadingSection {
  heading?: string
  content?: string
  bulletPoints?: { label: string; text: string }[]
  codeSnippet?: { language: string; code: string; label?: string }
  guidelines?: string[]
}

export interface CourseraLessonItem {
  id: string
  title: string
  type: LessonType
  durationMinutes: number
  videoDuration?: string
  leadParagraph?: string
  videoSummary?: string
  videoHighlights?: string[]
  readingSections?: StructuredReadingSection[]
}

export interface LearningModuleDetails {
  id: string
  code: string
  title: string
  skillName: string
  skillCode: string
  description: string
  lessons: CourseraLessonItem[]
}

const MODULE_DATA: LearningModuleDetails = {
  id: 'mod-cypher-mastery',
  code: 'MOD-CYP-101',
  title: 'Accelerated Cypher Querying & Pattern Traversal',
  skillName: 'Neo4j Cypher Traversal',
  skillCode: 'SKILL-CYPHER-01',
  description:
    'Master pattern matching, variable-length path traversal, aggregation pipelines, and graph index optimization using openCypher.',
  lessons: [
    {
      id: 'lesson-1',
      title: 'Define and Aggregate Relevant Graph Data',
      type: 'reading',
      durationMinutes: 5,
      leadParagraph:
        'Property graph modeling is the foundational architectural discipline every graph engineer applies to transform relational schema tables into high-throughput connected structures.',
      readingSections: [
        {
          heading: 'Why Graph Data Aggregation Matters',
          content:
            'When designing enterprise skill graphs, nodes represent discrete competencies while directed relationships describe prerequisite pipelines and taxonomic hierarchies. Unlike traditional relational database architectures that rely on expensive recursive multi-table joins, graph databases treat relationships as first-class physical pointers that can be traversed in constant time.',
        },
        {
          heading: 'Core Structural Concepts',
          bulletPoints: [
            {
              label: 'Labeled Node Constraints',
              text: 'Nodes are grouped under strict semantic labels such as :MicroSkill, :TargetRole, and :LearningModule to support high-efficiency schema-level range index scans.',
            },
            {
              label: 'Directed Typed Edges',
              text: 'Every relationship maintains an explicit directional orientation and type descriptor, such as [:REQUIRES_SKILL] or [:HAS_SKILL_PREREQUISITE], eliminating ambiguous bidirectional pointer traversal.',
            },
            {
              label: 'Internal Node Key Indexing',
              text: 'Each node carries uniquely indexed immutable keys (e.g. code: "JAVA-BACKEND-II") to guarantee O(1) initial pattern lookups before index-free adjacency traversal begins.',
            },
          ],
        },
        {
          heading: 'Pattern Matching Example',
          content:
            'Below is a standard production query retrieving all immediate competency dependencies for a target job role. Notice how the visual ASCII-art pattern maps directly to connected graph entities.',
          codeSnippet: {
            language: 'cypher',
            label: 'Cypher Query — Immediate Dependencies',
            code: `// Retrieve all immediate skill dependencies for a target job role
MATCH (role:TargetRole {code: "JAVA-BACKEND-II"})-[:REQUIRES_COMPETENCY]->(skill:MicroSkill)
RETURN skill.code AS code, skill.name AS name, skill.targetMastery AS mastery
ORDER BY skill.name ASC;`,
          },
        },
        {
          heading: 'Production Architectural Guidelines',
          guidelines: [
            'Keep relationship cardinalities bounded to prevent supernode skew during deep graph walks.',
            'Aggregate temporal attributes (such as verification timestamps and attempt dates) directly onto relationship properties.',
            'Always apply label filters at pattern match start points to leverage schema-level range indexes.',
          ],
        },
      ],
    },
    {
      id: 'lesson-2',
      title: 'Filtering with WHERE Predicates and Property Lookups',
      type: 'reading',
      durationMinutes: 5,
      leadParagraph:
        'Filtering in openCypher occurs through declarative WHERE conditions that reduce candidate node sets early in the query planning pipeline.',
      readingSections: [
        {
          heading: 'Optimizing Query Planning with Filter Predicates',
          content:
            'Predicate pushdown is essential for ensuring graph traversals only examine pertinent subgraphs. Placing filters in inline patterns versus separate WHERE clauses can alter the execution strategy chosen by the graph database planner, significantly impacting memory consumption.',
        },
        {
          heading: 'Parameterized Filter Pattern',
          content:
            'This pattern demonstrates filtering micro-skills by status and minimum benchmark mastery percentage prior to traversing prerequisite relationships.',
          codeSnippet: {
            language: 'cypher',
            label: 'Cypher Query — Filtered Pattern Retrieval',
            code: `// Combined label match with parameterized WHERE condition
MATCH (m:MicroSkill)
WHERE m.status = "ACTIVE" AND m.masteryPercentage >= 75
RETURN m.code, m.name, m.masteryPercentage
ORDER BY m.masteryPercentage DESC
LIMIT 10;`,
          },
        },
        {
          heading: 'Key Rules for Production Filtering',
          bulletPoints: [
            {
              label: 'Equality & Range Predicates',
              text: 'Prefer equality and numeric range comparisons over wildcard regular expressions to maximize B-tree index lookup efficiency.',
            },
            {
              label: 'Early Pipeline Pruning',
              text: 'Filter node sets as early as possible before chaining unbounded path traversal clauses.',
            },
            {
              label: 'IN Collection Lookups',
              text: 'Use IN collections to evaluate multi-value inclusion in a single index pass rather than cascading OR disjunctions.',
            },
          ],
        },
      ],
    },
    {
      id: 'lesson-3',
      title: 'Property Graph Core Concepts & Match Syntax',
      type: 'video',
      durationMinutes: 14,
      videoDuration: '14:20',
      videoSummary:
        'This video lecture demonstrates property graph syntax, index-free adjacency execution, and fundamental MATCH queries in the openCypher specification. Learn how pattern matching visually mimics graph topology.',
      videoHighlights: [
        'Index-free adjacency: pointer structures vs. relational foreign keys',
        'Syntax walkthrough: nodes (), relationships [], and directionality ->',
        'Visualizing execution profiles inside the database query engine',
        'Avoiding accidental Cartesian product traps in graph queries',
      ],
    },
    {
      id: 'lesson-4',
      title: 'Variable-Length Paths & Bounded Traversal Pipelines',
      type: 'reading',
      durationMinutes: 8,
      leadParagraph:
        'When navigating prerequisite graphs, dependencies often span multiple indirect hops. In Cypher, variable-length relationship patterns allow concise, bounded graph walks.',
      readingSections: [
        {
          heading: 'Deep Path Matching with Bounded Upper Limits',
          content:
            'In relational SQL, querying multi-level prerequisites requires complex recursive Common Table Expressions (WITH RECURSIVE) that quickly become unwieldy. In openCypher, variable-length relationship syntax is elegant, performant, and succinct.',
        },
        {
          heading: 'Bounded Traversal Query Syntax',
          content:
            'The pattern below retrieves all skills reachable within 1 to 3 hops across multiple relationship types, ensuring execution bounds are strictly respected.',
          codeSnippet: {
            language: 'cypher',
            label: 'Cypher Query — Multi-Hop Traversal',
            code: `// Match all prerequisite skills reachable within 1 to 3 hops
MATCH (r:TargetRole {code: "JAVA-BACKEND-II"})-[:REQUIRES_COMPETENCY|HAS_MICRO_SKILL*1..3]->(s:MicroSkill)
RETURN DISTINCT s.code AS skillCode, s.name AS skillName, s.targetMastery AS mastery
ORDER BY s.code ASC;`,
          },
        },
        {
          heading: 'Architectural Rules for Bounded Traversal',
          bulletPoints: [
            {
              label: 'Upper Bound Mandatory',
              text: 'Always declare an explicit upper bound (e.g. *1..3) to prevent runaway execution or out-of-memory errors on cyclic graph paths.',
            },
            {
              label: 'Distinct Result Deduplication',
              text: 'Always specify RETURN DISTINCT when multiple traversal paths converge on shared prerequisite nodes.',
            },
          ],
        },
      ],
    },
    {
      id: 'lesson-5',
      title: 'Shortest Path Algorithms & Prerequisite Resolution',
      type: 'video',
      durationMinutes: 16,
      videoDuration: '16:05',
      videoSummary:
        'Explore built-in shortestPath and allShortestPaths algorithms to identify the quickest prerequisite pathway for a learner between baseline competencies and target job role requirements.',
      videoHighlights: [
        'Bidirectional breadth-first search mechanics in graph traversal',
        'shortestPath() syntax and execution constraints',
        'Comparing unweighted hop count against weighted difficulty scoring',
        'Integrating path results into dynamic employee learning pathways',
      ],
    },
    {
      id: 'lesson-6',
      title: 'Constraint Engineering & Schema Integrity',
      type: 'reading',
      durationMinutes: 10,
      leadParagraph:
        'Schema constraints and vector indexes ensure data uniqueness, referential integrity, and ultra-fast similarity searches across enterprise competency models.',
      readingSections: [
        {
          heading: 'Schema Integrity in Enterprise Knowledge Graphs',
          content:
            'Production graph databases require rigorous schema constraints to prevent duplicate entries, ensure code uniqueness, and enforce non-null invariants across entities.',
          codeSnippet: {
            language: 'cypher',
            label: 'Cypher DDL — Schema Constraints',
            code: `// Ensure unique micro-skill codes
CREATE CONSTRAINT unique_micro_skill_code IF NOT EXISTS
FOR (s:MicroSkill) REQUIRE s.code IS UNIQUE;

// Ensure non-null titles on learning modules
CREATE CONSTRAINT require_module_title IF NOT EXISTS
FOR (m:LearningModule) REQUIRE m.title IS NOT NULL;`,
          },
        },
        {
          heading: 'Vector Index Integration for Semantic Matching',
          content:
            'For semantic competency matching and AI recommendations, vector indexes store dense embeddings directly on graph nodes, enabling sub-millisecond cosine similarity searches.',
          codeSnippet: {
            language: 'cypher',
            label: 'Cypher DDL — Vector Index Creation',
            code: `CREATE VECTOR INDEX skill_embeddings IF NOT EXISTS
FOR (s:MicroSkill) ON (s.embedding)
OPTIONS {indexConfig: {"vector.dimensions": 1536, "vector.similarity_function": 'cosine'}};`,
          },
        },
        {
          heading: 'Production Checklist',
          guidelines: [
            'Declare uniqueness constraints during initial Flyway or database migration scripts.',
            'Vector index dimensions must match the embedding model (e.g. 1536 for text-embedding-3-small).',
            'Run index status queries after deployment to verify full index population before accepting production queries.',
          ],
        },
      ],
    },
  ],
}

// Code Block Component with Copy Action
const CodeSnippetBlock: React.FC<{ code: string; label?: string }> = ({ code, label }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-xs my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-xs font-mono">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Terminal size={14} />
          <span>{label || 'Cypher Query'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <CheckCheck size={13} className="text-success" />
              <span className="text-success font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-xs sm:text-[13px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export const LearningModuleReaderPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId?: string }>()
  const moduleCode = moduleId ? moduleId.toUpperCase() : MODULE_DATA.code

  // Active lesson selection (default to lesson 1)
  const [activeLessonId, setActiveLessonId] = useState<string>(MODULE_DATA.lessons[0].id)

  // Track completed lessons
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => {
    return new Set(['lesson-1'])
  })

  // Video player state
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false)
  const [videoSpeed, setVideoSpeed] = useState<string>('1x')
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false)

  // Locate active lesson
  const activeIndex = MODULE_DATA.lessons.findIndex((l) => l.id === activeLessonId)
  const currentLesson = MODULE_DATA.lessons[activeIndex] || MODULE_DATA.lessons[0]

  // Toggle completion of current lesson
  const toggleComplete = (id: string) => {
    setCompletedLessonIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Next item progression
  const handleGoToNextItem = () => {
    setCompletedLessonIds((prev) => new Set(prev).add(currentLesson.id))
    if (activeIndex < MODULE_DATA.lessons.length - 1) {
      const nextLesson = MODULE_DATA.lessons[activeIndex + 1]
      setActiveLessonId(nextLesson.id)
      setIsVideoPlaying(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Completion calculation
  const completedCount = completedLessonIds.size
  const totalCount = MODULE_DATA.lessons.length
  const completionPercentage = Math.round((completedCount / totalCount) * 100)
  const isCurrentCompleted = completedLessonIds.has(currentLesson.id)
  const isLastLesson = activeIndex === totalCount - 1

  return (
    <WorkspaceLayout>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* ========================================================= */}
        {/* TOP NAVIGATION BAR: Back to Pathway on Left + Exam on Right */}
        {/* ========================================================= */}
        <header className="sticky top-0 z-30 bg-card border-b border-border shadow-2xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* LEFT: Prominent Back to Pathway CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/employee/pathway">
              <Button
                variant="ghost"
                size="sm"
                className="font-semibold text-xs sm:text-sm gap-1.5 text-foreground hover:bg-muted hover:text-primary transition-colors px-3 py-1.5"
              >
                <ChevronLeft size={16} className="text-primary shrink-0" />
                <span>Back to Pathway</span>
              </Button>
            </Link>
          </div>

          {/* RIGHT: Progress Counter + Take Module Exam CTA */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>
                <strong className="text-foreground">{completedCount}</strong> of {totalCount} Completed
              </span>
              <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-success h-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <Link
              to={`/employee/assessment?tab=pathway&module=${moduleCode || 'MOD-101'}&start=true`}
            >
              <Button
                variant="primary"
                size="sm"
                className="font-bold text-xs sm:text-sm gap-1.5 shadow-xs px-3.5 py-1.5"
              >
                <Award size={15} />
                <span>Take Module Exam</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* ========================================================= */}
        {/* WORKSPACE BODY: SINGLE-MODULE SYLLABUS + MAIN CONTENT     */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col md:flex-row relative">
          {/* ------------------------------------------------------- */}
          {/* LEFT DRAWER: UNIFIED MODULE LESSON LIST (ALWAYS VISIBLE)*/}
          {/* ------------------------------------------------------- */}
          <aside className="w-full md:w-80 lg:w-84 border-r border-border bg-card shrink-0 flex flex-col z-20">
            {/* Module Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="primary" className="text-[10px] font-mono font-bold">
                  {MODULE_DATA.code}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {totalCount} Lessons
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground leading-snug">
                {MODULE_DATA.title}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {completedCount} of {totalCount} completed ({completionPercentage}%)
              </p>
            </div>

            {/* Direct List of Lessons (Single Module, Reading & Video only) */}
            <div className="flex-1 py-2 divide-y divide-border/60 overflow-y-auto">
              {MODULE_DATA.lessons.map((lesson, idx) => {
                const isSelected = lesson.id === activeLessonId
                const isDone = completedLessonIds.has(lesson.id)

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setActiveLessonId(lesson.id)
                      setIsVideoPlaying(false)
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all cursor-pointer relative',
                      isSelected
                        ? 'bg-secondary text-primary font-semibold border-l-4 border-primary'
                        : 'hover:bg-muted/50 text-foreground border-l-4 border-transparent'
                    )}
                  >
                    {/* Coursera-style Checkmark / Circle */}
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-success text-white flex items-center justify-center shadow-2xs">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full border-2',
                            isSelected ? 'border-primary' : 'border-muted-foreground/40'
                          )}
                        />
                      )}
                    </div>

                    {/* Lesson Title, Type & Duration */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className={cn(
                          'text-xs leading-snug',
                          isSelected ? 'text-primary font-bold' : 'text-foreground'
                        )}
                      >
                        {idx + 1}. {lesson.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-normal">
                        <span className="capitalize">{lesson.type}</span>
                        <span>&bull;</span>
                        <span>{lesson.durationMinutes} min</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* ------------------------------------------------------- */}
          {/* MAIN PANE: ELEVATED CARD CONTAINER FOR LEARNING CONTENT */}
          {/* ------------------------------------------------------- */}
          <main className="flex-1 min-w-0 bg-background overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col">
            {/* Elevated Content Container (fills available space like Coursera) */}
            <div className="w-full bg-card rounded-2xl border border-border shadow-xs p-6 sm:p-8 lg:p-12 space-y-8 flex-1 flex flex-col justify-between">
              {/* =================================================== */}
              {/* READING LESSON VIEW                                 */}
              {/* =================================================== */}
              {currentLesson.type === 'reading' && (
                <article className="space-y-6">
                  {/* Lesson Eyebrow and H2 Title (Satisfies REQ-004 test) */}
                  <div className="space-y-1.5">
                    <div className="text-xs uppercase font-bold tracking-wider text-primary">
                      Reading &bull; {currentLesson.durationMinutes} min read
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                      {currentLesson.title}
                    </h2>
                  </div>

                  {/* Italicized Lead Paragraph */}
                  {currentLesson.leadParagraph && (
                    <p className="italic text-base sm:text-lg text-foreground/90 font-serif leading-relaxed border-l-3 border-primary/60 pl-4 py-2 bg-muted/30 rounded-r-xl">
                      {currentLesson.leadParagraph}
                    </p>
                  )}

                  {/* Clean Structured Reading Sections (Zero raw markdown syntax!) */}
                  <div className="space-y-6 pt-2">
                    {currentLesson.readingSections?.map((section, sIdx) => (
                      <div key={sIdx} className="space-y-3">
                        {section.heading && (
                          <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight border-b border-border/70 pb-2">
                            {section.heading}
                          </h3>
                        )}

                        {section.content && (
                          <p className="text-body leading-relaxed text-foreground/90">
                            {section.content}
                          </p>
                        )}

                        {/* Structured Bullet Points */}
                        {section.bulletPoints && section.bulletPoints.length > 0 && (
                          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 my-3">
                            <ul className="space-y-2.5">
                              {section.bulletPoints.map((bp, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-2.5 text-sm leading-relaxed">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                  <span>
                                    <strong className="text-foreground font-semibold">{bp.label}: </strong>
                                    <span className="text-foreground/85">{bp.text}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Interactive Styled Code Block */}
                        {section.codeSnippet && (
                          <CodeSnippetBlock
                            code={section.codeSnippet.code}
                            label={section.codeSnippet.label}
                          />
                        )}

                        {/* Production Architectural Guidelines */}
                        {section.guidelines && section.guidelines.length > 0 && (
                          <div className="rounded-xl border border-primary/25 bg-secondary/35 p-4.5 space-y-2.5 my-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                              <ShieldCheck size={16} />
                              <span>Production Guidelines</span>
                            </div>
                            <ul className="space-y-2">
                              {section.guidelines.map((g, gIdx) => (
                                <li key={gIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                                  <span className="text-primary font-bold mt-0.5 shrink-0">✓</span>
                                  <span>{g}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {/* =================================================== */}
              {/* VIDEO LESSON VIEW                                   */}
              {/* =================================================== */}
              {currentLesson.type === 'video' && (
                <div className="space-y-6">
                  {/* 16:9 Video Player Container */}
                  <div className="relative aspect-video rounded-2xl bg-slate-950 border border-border overflow-hidden shadow-md flex flex-col justify-between text-white group">
                    {/* Top Video Overlay Bar */}
                    <div className="p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between z-10">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-white border-white/20 bg-black/40 text-[10px]">
                          HD 1080p
                        </Badge>
                        <span className="text-xs font-semibold text-white/90 truncate max-w-sm">
                          {currentLesson.title}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-white/80">
                        {currentLesson.videoDuration || '14:20'}
                      </span>
                    </div>

                    {/* Center Big Play Button */}
                    <div className="self-center z-10">
                      <button
                        type="button"
                        onClick={() => setIsVideoPlaying((prev) => !prev)}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-primary/95 text-primary-foreground flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title={isVideoPlaying ? 'Pause video' : 'Play video'}
                        aria-label="Play Video"
                      >
                        {isVideoPlaying ? (
                          <Pause className="w-8 h-8 sm:w-10 sm:h-10" />
                        ) : (
                          <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1.5" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Video Controls Bar */}
                    <div className="p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2.5 z-10">
                      <div className="w-full bg-white/25 rounded-full h-1.5 cursor-pointer hover:h-2 transition-all relative">
                        <div className="bg-primary h-full rounded-full w-2/5" />
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/90">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsVideoPlaying((prev) => !prev)}
                            className="cursor-pointer hover:text-primary transition-colors"
                          >
                            {isVideoPlaying ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsVideoMuted((prev) => !prev)}
                            className="cursor-pointer hover:text-primary transition-colors"
                          >
                            {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          </button>
                          <span className="font-mono text-[11px] text-white/80">
                            03:45 / {currentLesson.videoDuration || '14:20'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const speeds = ['0.75x', '1x', '1.25x', '1.5x', '2x']
                              const next = (speeds.indexOf(videoSpeed) + 1) % speeds.length
                              setVideoSpeed(speeds[next])
                            }}
                            className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                          >
                            {videoSpeed}
                          </button>
                          <Maximize2 size={15} className="cursor-pointer hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Title and Summary */}
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <div className="text-xs uppercase font-bold tracking-wider text-primary">
                        Video Lecture &bull; {currentLesson.durationMinutes} mins
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        {currentLesson.title}
                      </h2>
                    </div>

                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {currentLesson.videoSummary}
                    </p>

                    {/* Key Highlights Covered */}
                    {currentLesson.videoHighlights && (
                      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <FileCode size={15} />
                          <span>Key Topics Covered in this Video</span>
                        </h4>
                        <ul className="space-y-1.5">
                          {currentLesson.videoHighlights.map((hl, hIdx) => (
                            <li key={hIdx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/85">
                              <span className="text-primary font-bold mt-0.5 shrink-0">&bull;</span>
                              <span>{hl}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =================================================== */}
              {/* ACTION FOOTER: MARK COMPLETE & "GO TO NEXT ITEM →"  */}
              {/* =================================================== */}
              <div className="pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
                <button
                  type="button"
                  onClick={() => toggleComplete(currentLesson.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-all cursor-pointer self-start sm:self-auto',
                    isCurrentCompleted
                      ? 'bg-success/15 border-success/30 text-success'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  )}
                >
                  <Check size={14} className={isCurrentCompleted ? 'text-success' : 'text-muted-foreground'} />
                  <span>{isCurrentCompleted ? 'Lesson Completed ✓' : 'Mark as completed'}</span>
                </button>

                {!isLastLesson ? (
                  <Button
                    variant="primary"
                    size="default"
                    onClick={handleGoToNextItem}
                    className="font-bold text-xs sm:text-sm px-6 shadow-xs gap-1.5"
                    rightIcon={<ChevronRight size={16} />}
                  >
                    Go to next item
                  </Button>
                ) : (
                  <Link
                    to={`/employee/assessment?tab=pathway&module=${moduleCode || 'MOD-101'}&start=true`}
                  >
                    <Button
                      variant="primary"
                      size="default"
                      className="font-bold text-xs sm:text-sm px-6 shadow-xs gap-1.5"
                      rightIcon={<Award size={16} />}
                    >
                      Take Module Exam
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

export default LearningModuleReaderPage
