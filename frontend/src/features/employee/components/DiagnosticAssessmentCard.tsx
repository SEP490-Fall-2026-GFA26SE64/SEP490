import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, RefreshCw, Zap } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { useToast } from '../../../shared/hooks/useToast'

interface Question {
  id: string
  concept: string
  prerequisiteSkill: string
  remedyModule: string
  questionText: string
  options: { id: string; text: string }[]
  correctOptionId: string
  explanation: string
}

const SAMPLE_QUESTION: Question = {
  id: 'q-gnn-1',
  concept: 'Graph Neural Networks (GNN) Message Passing',
  prerequisiteSkill: 'Sparse Matrix Adjacency & Vector Projection',
  remedyModule: 'REM-102: Linear Algebra for Graph Algorithms',
  questionText:
    'In a Spatial Graph Convolutional Network (GCN) layer, how are node feature representations aggregated across localized neighbor nodes before non-linear activation?',
  options: [
    {
      id: 'opt-a',
      text: 'A) Normalized graph Laplacian adjacency matrix multiplication with neighbor feature vectors (Ã = D̃^-1/2 (A + I) D̃^-1/2)',
    },
    {
      id: 'opt-b',
      text: 'B) Standard multi-layer perceptron (MLP) flattening of all adjacent vertices into a single 1D concatenation vector',
    },
    {
      id: 'opt-c',
      text: 'C) Independent random dropout of edges without permutation invariance normalization',
    },
    {
      id: 'opt-d',
      text: 'D) Recursive breadth-first search string serialization into a natural language transformer prompt',
    },
  ],
  correctOptionId: 'opt-a',
  explanation:
    'Option A is correct: GCNs aggregate localized neighborhood representations using normalized graph adjacency (renormalization trick) to maintain scale invariance across irregular node degrees.',
}

export function DiagnosticAssessmentCard() {
  const [selectedOption, setSelectedOption] = React.useState<string>('')
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const { toast } = useToast()

  const isCorrect = selectedOption === SAMPLE_QUESTION.correctOptionId

  const handleSubmit = () => {
    if (!selectedOption) return
    setIsSubmitted(true)

    if (selectedOption === SAMPLE_QUESTION.correctOptionId) {
      toast({
        title: 'Mastery Validated!',
        description: 'You mastered Graph Message Passing. Advanced pathway accelerated.',
        variant: 'success',
      })
    } else {
      toast({
        title: 'Knowledge Tracing Activated!',
        description: `Prerequisite deficiency detected: "${SAMPLE_QUESTION.prerequisiteSkill}". Remedy module "${SAMPLE_QUESTION.remedyModule}" scheduled.`,
        variant: 'warning',
      })
    }
  }

  const handleReset = () => {
    setSelectedOption('')
    setIsSubmitted(false)
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-md">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Adaptive Diagnostic Assessment
            </span>
          </div>
          <Badge variant="secondary">Target: GNN Competency Gate</Badge>
        </div>

        <CardTitle className="text-xl mt-2">{SAMPLE_QUESTION.concept}</CardTitle>
        <CardDescription>
          This evaluation dynamically updates your Knowledge Tracing mastery probability in real time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <p className="text-base font-medium text-foreground leading-relaxed">
          {SAMPLE_QUESTION.questionText}
        </p>

        {/* Radio Option Choices */}
        <RadioGroup value={selectedOption} onChange={setSelectedOption} disabled={isSubmitted}>
          {SAMPLE_QUESTION.options.map((opt) => {
            const isSelected = selectedOption === opt.id
            let optionStyle = 'border-border bg-card hover:bg-muted/40'

            if (isSubmitted) {
              if (opt.id === SAMPLE_QUESTION.correctOptionId) {
                optionStyle = 'border-success bg-green-50/50 text-foreground font-medium ring-1 ring-success'
              } else if (isSelected) {
                optionStyle = 'border-destructive bg-red-50/50 text-foreground ring-1 ring-destructive'
              }
            } else if (isSelected) {
              optionStyle = 'border-primary bg-secondary/40 ring-1 ring-primary'
            }

            return (
              <label
                key={opt.id}
                htmlFor={opt.id}
                className={`flex items-start p-4 rounded-lg border transition-all cursor-pointer ${optionStyle}`}
              >
                <div className="pt-0.5 mr-3">
                  <RadioGroupItem id={opt.id} value={opt.id} />
                </div>
                <span className="text-sm leading-relaxed">{opt.text}</span>
              </label>
            )
          })}
        </RadioGroup>

        {/* Knowledge Tracing Feedback Box when submitted */}
        {isSubmitted && (
          <div
            className={`p-4 rounded-lg border space-y-3 animate-in fade-in-50 ${
              isCorrect ? 'bg-green-50/60 border-green-200' : 'bg-amber-50/60 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-success">Correct Answer — Concept Mastered</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span className="text-warning-foreground font-bold">
                    Knowledge Tracing: Root Prerequisite Gap Isolated
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed">{SAMPLE_QUESTION.explanation}</p>

            {!isCorrect && (
              <div className="bg-card p-3 rounded-md border border-border space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-warning font-semibold">
                  <Zap className="h-4 w-4" />
                  <span>Adaptive Recommendation Engine Response:</span>
                </div>
                <p className="text-muted-foreground">
                  The algorithm inferred that lack of foundational proficiency in{' '}
                  <strong className="text-foreground">{SAMPLE_QUESTION.prerequisiteSkill}</strong> caused this failure.
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="font-semibold text-primary">Injected Remedy: {SAMPLE_QUESTION.remedyModule}</span>
                  <Badge variant="warning">Pathway Recalculated</Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Reset Question
          </Button>

          {!isSubmitted ? (
            <Button
              variant="primary"
              disabled={!selectedOption}
              onClick={handleSubmit}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Submit Answer
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleReset}>
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
