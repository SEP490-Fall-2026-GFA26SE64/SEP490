import { useState } from 'react'
import type { BankQuestion, BankRow, BankContent } from '../../api/questionBankApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { AssessmentQuestionContent } from '../ui/AssessmentQuestionContent'
import { Button } from '../ui/Button'
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../ui/Dialog'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/Accordion'
import { Heading } from '../typography/Heading'

function QuestionPreview({ content, vi }: { content: BankContent | undefined; vi: boolean }) {
  const [choice, setChoice] = useState('')
  if (!content) return <p role="status">{vi ? 'Chưa có nội dung câu hỏi.' : 'Question content is unavailable.'}</p>
  return <div className="min-w-0 space-y-5">
    <p className="text-caption text-muted-foreground">{content.knowledgeLevel ?? '—'} · {content.skillName ?? content.skillId}</p>
    <AssessmentQuestionContent prompt={content.prompt || (vi ? 'Chưa nhập câu hỏi.' : 'Question prompt is empty.')} options={content.options.map((text, index) => ({ id: String(index), text: text || (vi ? 'Chưa nhập đáp án.' : 'Answer is empty.') }))} value={choice} onChange={setChoice} answerLabel={vi ? 'Chọn đáp án xem thử' : 'Preview answer choices'} />
    <Accordion><AccordionItem value="answer"><AccordionTrigger>{vi ? 'Đáp án & giải thích — chỉ dành cho người soạn / duyệt' : 'Answer key & explanation — staff only'}</AccordionTrigger><AccordionContent><p className="mb-2 text-body-sm font-semibold">{vi ? 'Đáp án đúng' : 'Correct answer'}: {content.correctAnswer == null ? '—' : String.fromCharCode(65 + content.correctAnswer)}</p><p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-body-sm">{content.explanation || (vi ? 'Chưa có giải thích.' : 'No explanation provided.')}</p></AccordionContent></AccordionItem></Accordion>
  </div>
}

export function ImportedQuestionsPreview({ questions = [], reviewRows, initialIndex = 0, onClose }: { questions?: BankQuestion[]; reviewRows?: BankRow[]; initialIndex?: number; onClose: () => void }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const [position, setPosition] = useState(initialIndex), [mobile, setMobile] = useState(false), [expanded, setExpanded] = useState(false)
  const items = reviewRows ? reviewRows.map((row, i) => ({ id: row.code ?? `row-${i}`, content: row.content })) : questions.map(q => ({ id: q.id + ':' + q.versions.at(-1)?.id, content: q.versions.at(-1)?.content }))
  const index = Math.min(position, Math.max(items.length - 1, 0)), current = items[index]
  const title = vi ? 'Xem như người làm bài' : 'View as test taker'
  const preview = <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><Heading level={3} size="card">{title}</Heading><div className="flex flex-wrap gap-2"><Button size="sm" variant={!mobile ? 'secondary' : 'ghost'} aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</Button><Button size="sm" variant={mobile ? 'secondary' : 'ghost'} aria-pressed={mobile} onClick={() => setMobile(true)}>Mobile</Button>{!expanded && <Button size="sm" variant="outline" onClick={() => setExpanded(true)}>{vi ? 'Toàn màn hình' : 'Open full preview'}</Button>}</div></div>
    <p className="rounded-lg bg-muted p-3 text-body-sm text-muted-foreground">{vi ? 'Xem thử · Không lưu câu trả lời hoặc điểm' : 'Preview · No answers or scores are saved'}</p>
    <div data-question-preview-viewport={mobile ? 'mobile' : 'desktop'} className={`mx-auto min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5 ${mobile ? 'max-w-[390px]' : 'w-full'}`}>{current ? <QuestionPreview key={current.id} content={current.content} vi={vi} /> : <p role="status">{vi ? 'Chưa tải được câu hỏi vừa nhập. Hãy mở lại từ ngân hàng câu hỏi.' : 'Imported questions are unavailable. Open them from the bank.'}</p>}</div>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-caption text-muted-foreground">{vi ? 'Câu' : 'Question'} {items.length ? index + 1 : 0} / {items.length}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={index === 0} onClick={() => setPosition(index - 1)}>{vi ? 'Câu trước' : 'Previous question'}</Button><Button size="sm" variant="outline" disabled={index >= items.length - 1} onClick={() => setPosition(index + 1)}>{vi ? 'Câu tiếp theo' : 'Next question'}</Button></div></div>
  </div>
  return <>
    <Dialog open onOpenChange={open => { if (!open) onClose() }} size="wide" className="w-[96vw] max-w-7xl max-h-[94dvh]" ariaLabel={reviewRows ? (vi ? 'Xem thử câu hỏi đang import' : 'Review question preview') : (vi ? 'Câu hỏi vừa nhập' : 'Imported questions')}>
      <DialogHeader><DialogTitle>{reviewRows ? (vi ? `Xem trước khi import · ${items.length} câu hỏi` : `Review import · ${items.length} questions`) : (vi ? `Import thành công · ${items.length} câu hỏi nháp` : `Import completed · ${items.length} draft questions`)}</DialogTitle></DialogHeader>
      <DialogBody><div className="grid min-w-0 gap-3 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-border bg-background p-2">
          <select className="h-10 w-full min-w-0 rounded border border-border bg-card px-2 lg:hidden" aria-label={vi ? 'Chọn câu hỏi vừa nhập' : 'Select imported question'} value={index} onChange={event => setPosition(Number(event.target.value))}>{items.map((q, i) => <option key={q.id} value={i}>{i + 1}. {q.content?.prompt}</option>)}</select>
          <nav className="hidden max-h-[65dvh] space-y-1 overflow-y-auto lg:block" aria-label={vi ? 'Câu hỏi vừa nhập' : 'Imported questions'}>{items.map((q, i) => <Button key={q.id} variant={i === index ? 'secondary' : 'ghost'} aria-current={i === index ? 'step' : undefined} className="h-auto min-h-12 w-full justify-start whitespace-normal p-3 text-left [&>span]:min-w-0 [&>span]:whitespace-normal" onClick={() => setPosition(i)}><span className="line-clamp-3 [overflow-wrap:anywhere]">{i + 1}. {q.content?.prompt}</span></Button>)}</nav>
        </aside>
        <div className="min-w-0">{!expanded && preview}</div>
      </div></DialogBody>
      <DialogFooter><Button onClick={onClose}>{reviewRows ? (vi ? 'Quay lại kiểm tra file' : 'Back to import review') : (vi ? 'Về ngân hàng câu hỏi' : 'Back to question bank')}</Button></DialogFooter>
    </Dialog>
    <Dialog open={expanded} onOpenChange={setExpanded} size="wide" className="h-[94dvh] max-h-[94dvh] max-w-[96vw]" ariaLabel={title}><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><DialogBody>{preview}</DialogBody></Dialog>
  </>
}
