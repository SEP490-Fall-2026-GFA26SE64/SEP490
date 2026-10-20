import React, { useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Lightbulb,
  Play,
  Sparkles,
  Volume2,
  Award,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/components/ui/Card'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Progress } from '../../../shared/components/ui/Progress'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

export interface LessonItem {
  id: string
  title: string
  durationMinutes: number
  type: 'video' | 'reading' | 'practice'
  isCompleted: boolean
  content: {
    videoDuration?: string
    readingMarkdown?: string
    practiceQuestion?: {
      prompt: string
      options: string[]
      correctIndex: number
      explanation: string
    }
  }
}

interface ModuleData {
  id: string
  code: string
  title: string
  skillName: string
  skillCode: string
  description: string
  estimatedMinutes: number
  lessons: LessonItem[]
}

const DEFAULT_MODULE: ModuleData = {
  id: 'mod-cypher-mastery',
  code: 'MOD-CYP-101',
  title: 'Accelerated Cypher Querying & Pattern Traversal',
  skillName: 'Neo4j Cypher Traversal',
  skillCode: 'SKILL-CYPHER-01',
  description:
    'Master pattern matching, variable-length path traversal, aggregation pipelines, and graph index optimization using openCypher.',
  estimatedMinutes: 45,
  lessons: [
    {
      id: 'lesson-1',
      title: '1. Property Graph Core Concepts & Match Syntax',
      durationMinutes: 10,
      type: 'video',
      isCompleted: true,
      content: {
        videoDuration: '09:42',
      },
    },
    {
      id: 'lesson-2',
      title: '2. Variable-Length Paths & Graph Traversal Pipelines',
      durationMinutes: 15,
      type: 'reading',
      isCompleted: false,
      content: {
        readingMarkdown: `
### Understanding Variable-Length Path Matching in openCypher

When querying connected knowledge graphs, relationships often span multiple indirect hops. In standard SQL, this requires recursive Common Table Expressions (\`WITH RECURSIVE\`), which are expensive and computationally unwieldy.

In Cypher, variable-length relationship patterns allow concise graph traversal:

\`\`\`cypher
// Match all skills reachable from a Target Role within 1 to 3 prerequisite hops
MATCH (r:TargetRole {code: "JAVA-BACKEND-II"})-[:REQUIRES_COMPETENCY|HAS_MICRO_SKILL*1..3]->(s:MicroSkill)
RETURN s.code AS skillCode, s.name AS skillName, s.targetMastery AS mastery
ORDER BY s.code ASC;
\`\`\`

#### Key Architectural Rules:
- **Upper Bound Limits:** Always specify an upper bound on hops (e.g. \`*1..5\`) to prevent exponential memory consumption during deep graph traversals.
- **Relationship Type Disjunction:** Use the pipe operator \`|\` to traverse multiple semantic relationship types in a single pattern match.
- **Cartesian Product Guard:** Avoid unbounded patterns without starting node index filters.
        `,
      },
    },
    {
      id: 'lesson-3',
      title: '3. Formative Practice: Optimizing Cypher Aggregations',
      durationMinutes: 10,
      type: 'practice',
      isCompleted: false,
      content: {
        practiceQuestion: {
          prompt:
            'Which of the following Cypher patterns correctly retrieves all prerequisite skills up to 3 hops deep without causing infinite cyclic loops?',
          options: [
            'MATCH (a)-[:PREREQUISITE*]-(b) RETURN b',
            'MATCH (a)-[:PREREQUISITE*1..3]->(b) RETURN DISTINCT b',
            'SELECT * FROM graph WHERE hops <= 3',
            'MATCH (a) WHERE a.prereq = 3 RETURN a',
          ],
          correctIndex: 1,
          explanation:
            'Using MATCH (a)-[:PREREQUISITE*1..3]->(b) with directed relationships and RETURN DISTINCT b correctly bounds traversal depth to 3 hops and deduplicates visited nodes.',
        },
      },
    },
    {
      id: 'lesson-4',
      title: '4. Summary, Cheatsheet & RFC Specifications',
      durationMinutes: 10,
      type: 'reading',
      isCompleted: false,
      content: {
        readingMarkdown: `
### Module Summary & Engineering Standards

You have completed the core fundamentals of Cypher pattern querying:
1. Direct node matching with labeled constraints \`(n:MicroSkill)\`.
2. Bounded relationship traversals \`[:HAS_PREREQUISITE*1..3]\`.
3. Safe execution practices to avoid cartesian products.

Proceed to the end-of-module assessment to validate your knowledge tracing score and unlock the next pathway milestone!
        `,
      },
    },
  ],
}

export const LearningModuleReaderPage: React.FC = () => {
  // Module state
  const [module] = useState<ModuleData>(DEFAULT_MODULE)
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(1) // start on lesson 2

  // Lesson completion tracking
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => {
    return new Set(['lesson-1'])
  })

  // Practice state
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<number | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false)

  // Current lesson
  const currentLesson = module.lessons[currentLessonIndex] || module.lessons[0]

  // Overall progress
  const progressPercent = Math.round(
    (completedLessonIds.size / module.lessons.length) * 100
  )

  const handleToggleComplete = () => {
    setCompletedLessonIds((prev) => {
      const updated = new Set(prev)
      if (updated.has(currentLesson.id)) {
        updated.delete(currentLesson.id)
      } else {
        updated.add(currentLesson.id)
      }
      return updated
    })
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < module.lessons.length - 1) {
      setCurrentLessonIndex((prev) => prev + 1)
      setSelectedPracticeOption(null)
      setIsAnswerSubmitted(false)
    }
  }

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex((prev) => prev - 1)
      setSelectedPracticeOption(null)
      setIsAnswerSubmitted(false)
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Breadcrumb to go back to Adaptive Pathway */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            to="/employee/pathway"
            className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
          >
            <ChevronLeft size={14} />
            <span>Adaptive Pathway</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground truncate max-w-md">
            {module.title}
          </span>
        </nav>

        {/* Top Header & Context Actions */}
        <PageHeader
        title={module.title}
        description={`Teaches ${module.skillName} (${module.skillCode}) • Estimated study duration: ${module.estimatedMinutes} mins`}
      >
        <div className="flex items-center gap-2">
          <Link to="/employee/pathway">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Pathway
            </Button>
          </Link>
          <Link to="/employee/assessment">
            <Button variant="primary" size="sm">
              <Award className="w-4 h-4 mr-1.5" />
              Take Module Quiz
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Module Overview Progress Banner */}
      <div className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="text-xs">
              {module.code}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {module.skillCode}
            </Badge>
            <span className="text-caption text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {module.estimatedMinutes} minutes total
            </span>
          </div>
          <p className="text-caption text-muted-foreground">
            {completedLessonIds.size} of {module.lessons.length} lessons completed ({progressPercent}% mastery progression)
          </p>
        </div>
        <div className="w-full sm:w-56 space-y-1">
          <div className="flex justify-between text-caption font-semibold">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Main Workspace: Lesson Syllabus (Left 4 cols) & Content Player (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Drawer: Lesson Curriculum Syllabus */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-card font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Lesson Curriculum
              </CardTitle>
              <CardDescription>
                Progress through theory, practical code, and formative checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {module.lessons.map((lesson, idx) => {
                const isSelected = idx === currentLessonIndex
                const isDone = completedLessonIds.has(lesson.id)

                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setCurrentLessonIndex(idx)
                      setSelectedPracticeOption(null)
                      setIsAnswerSubmitted(false)
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-secondary border border-primary/20 shadow-xs'
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-semibold ${
                            isSelected
                              ? 'border-primary text-primary'
                              : 'border-muted-foreground text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div
                        className={`text-body-sm font-semibold truncate ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {lesson.title}
                      </div>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <span className="capitalize">{lesson.type}</span>
                        <span>•</span>
                        <span>{lesson.durationMinutes} mins</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Quick Support Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-card font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Knowledge Tracing Tip
              </CardTitle>
            </CardHeader>
            <CardContent className="text-caption text-muted-foreground leading-relaxed">
              Completing all lessons in this module prepares you for the formal module assessment quiz, which updates your estimated skill mastery in the Neo4j graph.
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Lesson Player & Interactive Content (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-border overflow-hidden">
            {/* Lesson Title & Type Banner */}
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-caption font-semibold text-primary uppercase tracking-wider">
                  Lesson {currentLessonIndex + 1} of {module.lessons.length}
                </span>
                <h2 className="text-subsection font-semibold text-foreground mt-0.5">
                  {currentLesson.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={completedLessonIds.has(currentLesson.id) ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleToggleComplete}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {completedLessonIds.has(currentLesson.id)
                    ? 'Completed ✓'
                    : 'Mark Complete'}
                </Button>
              </div>
            </div>

            {/* Lesson Body Content Based on Type */}
            <div className="p-6">
              {currentLesson.type === 'video' && (
                <div className="space-y-4">
                  {/* Simulated Video Player */}
                  <div className="relative aspect-video rounded-xl bg-slate-900 border border-border overflow-hidden flex flex-col justify-between p-4 text-white shadow-inner">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-white border-white/20 bg-black/40">
                        HD 1080p
                      </Badge>
                      <span className="text-xs font-mono text-white/80">
                        {currentLesson.content.videoDuration || '10:00'}
                      </span>
                    </div>

                    <div className="self-center">
                      <div className="w-16 h-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                        <Play className="w-8 h-8 ml-1" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full bg-white/20 rounded-full h-1.5 cursor-pointer">
                        <div className="bg-primary h-1.5 rounded-full w-1/3" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/80">
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4 cursor-pointer" />
                          <Volume2 className="w-4 h-4 cursor-pointer" />
                          <span>03:15 / {currentLesson.content.videoDuration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="cursor-pointer hover:underline">1.0x</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-body-sm text-muted-foreground leading-relaxed">
                    This video covers standard property graph modeling syntax, node label indexing, and relationship cardinality rules.
                  </div>
                </div>
              )}

              {currentLesson.type === 'reading' && (
                <div className="space-y-4">
                  <div className="prose max-w-none text-body text-foreground leading-relaxed whitespace-pre-line font-sans">
                    {currentLesson.content.readingMarkdown}
                  </div>
                </div>
              )}

              {currentLesson.type === 'practice' && currentLesson.content.practiceQuestion && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-primary/20 space-y-2">
                    <span className="text-caption font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Formative Knowledge Check
                    </span>
                    <h3 className="text-body font-semibold text-foreground">
                      {currentLesson.content.practiceQuestion.prompt}
                    </h3>
                  </div>

                  {/* Multiple Choice Options */}
                  <div className="space-y-2.5">
                    {currentLesson.content.practiceQuestion.options.map((opt, idx) => {
                      const isSelected = selectedPracticeOption === idx
                      const isCorrect =
                        idx === currentLesson.content.practiceQuestion?.correctIndex
                      const showResult = isAnswerSubmitted

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!isAnswerSubmitted) {
                              setSelectedPracticeOption(idx)
                            }
                          }}
                          className={`w-full text-left p-3.5 rounded-lg border text-body-sm transition-all flex items-center justify-between ${
                            showResult && isCorrect
                              ? 'bg-success/10 border-success text-success font-semibold'
                              : showResult && isSelected && !isCorrect
                              ? 'bg-destructive/10 border-destructive text-destructive font-semibold'
                              : isSelected
                              ? 'bg-secondary border-primary text-foreground font-semibold shadow-xs'
                              : 'bg-card border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          <span>{opt}</span>
                          {showResult && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Submit / Check Action */}
                  <div className="flex items-center justify-between pt-2">
                    {!isAnswerSubmitted ? (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={selectedPracticeOption === null}
                        onClick={() => {
                          setIsAnswerSubmitted(true)
                          if (
                            selectedPracticeOption ===
                            currentLesson.content.practiceQuestion?.correctIndex
                          ) {
                            handleToggleComplete()
                          }
                        }}
                      >
                        Submit Answer
                      </Button>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-muted/60 border border-border w-full space-y-1">
                        <div className="text-body-sm font-semibold text-foreground">
                          {selectedPracticeOption ===
                          currentLesson.content.practiceQuestion?.correctIndex
                            ? '✓ Correct Answer!'
                            : 'Incorrect, review explanation below:'}
                        </div>
                        <p className="text-caption text-muted-foreground leading-relaxed">
                          {currentLesson.content.practiceQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Footer */}
            <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentLessonIndex === 0}
                onClick={handlePrevLesson}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Lesson
              </Button>

              <div className="text-caption text-muted-foreground font-medium">
                {currentLessonIndex + 1} of {module.lessons.length}
              </div>

              {currentLessonIndex < module.lessons.length - 1 ? (
                <Button variant="primary" size="sm" onClick={handleNextLesson}>
                  Next Lesson
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Link to="/employee/assessment">
                  <Button variant="primary" size="sm">
                    Take Final Assessment
                    <Award className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </WorkspaceLayout>
  )
}
export default LearningModuleReaderPage
