import { CheckCircle2 } from 'lucide-react'
import type { BankContent } from '../../api/questionBankApi'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Text } from '../typography/Text'

export function QuestionContentPreview({ content, vi, variant = 'default' }: { content: BankContent; vi: boolean; variant?: 'default' | 'details' }) {
  if (variant === 'details') return <div className="space-y-4">
    <Text className="whitespace-pre-wrap [overflow-wrap:anywhere] text-[length:var(--text-card)] font-semibold leading-relaxed">{content.prompt || <span className="font-normal text-muted-foreground">{vi ? 'Chưa nhập nội dung câu hỏi.' : 'Question prompt has not been entered.'}</span>}</Text>
    <ol aria-label={vi ? 'Các đáp án' : 'Answer choices'} className="space-y-2">{content.options.map((option, index) => {
      const correct = content.correctAnswer === index
      return <li key={index} className={`flex items-start gap-3 rounded-lg border p-3 ${correct ? 'border-success/30 bg-success/5' : 'border-border bg-card'}`}>
        <Badge variant={correct ? 'success' : 'outline'} className="mt-0.5 size-7 shrink-0 self-start justify-center p-0">{String.fromCharCode(65 + index)}</Badge>
        <div className="min-w-0 flex-1"><Text variant="body-sm" tone={option ? 'foreground' : 'muted'} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{option || <span className="text-muted-foreground">{vi ? 'Chưa nhập đáp án.' : 'Answer has not been entered.'}</span>}</Text>{correct && <span className="mt-1 flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />{vi ? 'Đáp án đúng' : 'Correct answer'}</span>}</div>
      </li>
    })}</ol>
    {content.correctAnswer == null && <Text variant="caption" className="text-muted-foreground">{vi ? 'Chưa chọn đáp án đúng.' : 'Correct answer has not been selected.'}</Text>}
    <div className="border-t border-border pt-3"><Text variant="caption" className="mb-1 font-medium text-muted-foreground">{vi ? 'Giải thích' : 'Explanation'}</Text><Text variant="body-sm" tone={content.explanation?.trim() ? 'foreground' : 'muted'} className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${content.explanation?.trim() ? '' : 'text-muted-foreground'}`}>{content.explanation?.trim() ? content.explanation : vi ? 'Chưa có giải thích cho câu hỏi này.' : 'No explanation provided for this question.'}</Text></div>
  </div>
  return <Card className="rounded-xl border-border/80 shadow-2xs"><CardContent className="min-w-0 space-y-2.5 p-3.5">
    <Text className="whitespace-pre-wrap [overflow-wrap:anywhere] text-body-sm font-semibold">{content.prompt || <span className="font-normal text-muted-foreground">{vi ? 'Chưa nhập nội dung câu hỏi' : 'Question prompt is empty'}</span>}</Text>
    <ol aria-label={vi ? 'Các đáp án' : 'Answer choices'} className="space-y-2">{content.options.map((option, index) => {
      const correct = content.correctAnswer === index
      return <li key={index} className={`grid grid-cols-[1.625rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors ${correct ? 'border-success/40 bg-success/5' : 'border-border/80 bg-card'}`}>
        <Badge variant={correct ? 'success' : 'secondary'} className="size-6.5 shrink-0 self-start justify-center rounded-lg p-0 text-xs">{String.fromCharCode(65 + index)}</Badge>
        <Text className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] text-body-sm">{option || (vi ? 'Chưa nhập' : 'Not entered')}</Text>
        {correct && <CheckCircle2 className="size-4 shrink-0 text-success" aria-label={vi ? 'Đáp án đúng' : 'Correct answer'} />}
      </li>
    })}</ol>
    <Text className="whitespace-pre-wrap [overflow-wrap:anywhere] text-caption text-muted-foreground">{vi ? 'Giải thích' : 'Explanation'}: {content.explanation || (vi ? 'Chưa nhập' : 'Not entered')}</Text>
  </CardContent></Card>
}
