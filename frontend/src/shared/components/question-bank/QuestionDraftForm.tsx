import { QuestionId } from './QuestionId'
import { useId, useState } from 'react'
import type { BankChoice, BankContent } from '../../api/questionBankApi'
import { Heading } from '../typography/Heading'
import { Text } from '../typography/Text'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/Accordion'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { QuestionTextArea } from './QuestionTextArea'
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup'
import { QuestionContentPreview } from './QuestionContentPreview'

const control = 'min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50'
export function QuestionDraftForm({ content, code, skills, knowledgeLevels, busy, onChange, vi }: {
  content: BankContent; code: string | null; skills: BankChoice[]; knowledgeLevels: string[]; busy: boolean
  onChange: (patch: Partial<BankContent>) => void; vi: boolean
}) {
  const copy = (en: string, vn: string) => vi ? vn : en
  const id = useId()
  const [touched, setTouched] = useState({ prompt: false, skill: false })
  const promptError = touched.prompt && !content.prompt.trim()
  const skillError = touched.skill && !content.skillId
  const levelName = (level: string) => ({ FOUNDATION: copy('Foundation', 'Nền tảng'), INTERMEDIATE: copy('Intermediate', 'Trung cấp'), ADVANCED: copy('Advanced', 'Nâng cao') })[level]
  const preview = <aside aria-label={copy('Question preview', 'Xem trước câu hỏi')} className="min-w-0 space-y-3"><div className="hidden items-center justify-between gap-2 lg:flex"><Heading level={3} size="card">{copy('Live preview', 'Xem trước')}</Heading><Badge variant="outline">{copy('Draft', 'Bản nháp')}</Badge></div><Text variant="caption" className="text-muted-foreground">{copy('Reflects your current draft. Empty fields are not completed automatically.', 'Hiển thị đúng bản nháp hiện tại. Các trường trống không được tự điền.')}</Text><div role="region" tabIndex={0} aria-label={copy('Scrollable question preview', 'Nội dung xem trước có thể cuộn')} className="max-h-[65dvh] overflow-y-auto overscroll-contain rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><QuestionContentPreview content={content} vi={vi} /></div></aside>
  return <div className="grid items-start gap-6 px-1.5 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
    <div className="min-w-0 space-y-6">
      <section className="space-y-4" aria-label={copy('Basic information', 'Thông tin cơ bản')}>
        <Heading level={3} size="card">{copy('Basic information', 'Thông tin cơ bản')}</Heading>
        <div><Text variant="caption" className="text-muted-foreground">{copy('Question code', 'Mã câu hỏi')}</Text><div>{code ? <QuestionId code={code} vi={vi} /> : <Text variant="body-sm">{copy('Generated automatically when saved.', 'Hệ thống tự sinh khi lưu câu hỏi.')}</Text>}</div></div>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><FormField label={copy('MicroSkill *', 'MicroSkill *')}><select className={control} aria-label="MicroSkill" aria-required="true" aria-invalid={!!skillError} aria-describedby={skillError ? id + '-skill-error' : undefined} disabled={busy} value={content.skillId} onBlur={() => setTouched(prev => ({ ...prev, skill: true }))} onChange={e => onChange({ skillId: e.target.value, knowledgeLevel: null })}><option value="">{copy('Select a skill', 'Chọn kỹ năng')}</option>{skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></FormField>{skillError && <Text id={id + '-skill-error'} role="alert" variant="caption" className="text-destructive">{copy('Choose a MicroSkill to save a draft.', 'Chọn MicroSkill để lưu nháp.')}</Text>}</div>
          <FormField label={copy('Knowledge level', 'Mức kiến thức')}><select className={control} aria-label={copy('Knowledge level', 'Mức kiến thức')} disabled={busy || !content.skillId} value={content.knowledgeLevel ?? ''} onChange={e => onChange({ knowledgeLevel: e.target.value || null })}><option value="">{copy('Select a configured level', 'Chọn mức đã cấu hình')}</option>{['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].filter(level => knowledgeLevels.includes(level)).map(level => <option key={level} value={level}>{levelName(level)}</option>)}</select></FormField>
        </div>
        <Text variant="caption" className="text-muted-foreground">{copy('* Prompt and MicroSkill are required to save. Knowledge level and complete answers are required before submission.', '* Cần nội dung và MicroSkill để lưu. Cần mức kiến thức và đáp án đầy đủ trước khi gửi duyệt.')}</Text>
        {content.skillId && !knowledgeLevels.length && <Text role="status" variant="caption">{copy('This skill has no configured knowledge levels. Complete the catalog definition before classifying a question.', 'Kỹ năng này chưa có mức kiến thức được cấu hình. Cần hoàn thiện định nghĩa danh mục trước khi phân loại câu hỏi.')}</Text>}
        <label className="flex items-start gap-2 text-body-sm"><input type="checkbox" className="mt-1 accent-primary" checked={content.mandatory} disabled={busy} onChange={e => onChange({ mandatory: e.target.checked })} /><span>{copy('Mandatory in Skill Assessment', 'Bắt buộc trong Skill Assessment')}<span className="mt-1 block text-caption text-muted-foreground">{copy('Ignored by Baseline assessment.', 'Không áp dụng cho Baseline assessment.')}</span></span></label>
      </section>
      <section className="space-y-4 border-t border-border pt-5">
        <Heading level={3} size="card">{copy('Question content', 'Nội dung câu hỏi')}</Heading>
        <div className="space-y-1.5"><FormField label={copy('Question prompt *', 'Nội dung câu hỏi *')}><QuestionTextArea aria-label={copy('Question prompt', 'Nội dung câu hỏi')} aria-required="true" aria-invalid={!!promptError} aria-describedby={promptError ? id + '-prompt-error' : undefined} className={`${control} max-h-56`} rows={4} value={content.prompt} disabled={busy} onBlur={() => setTouched(prev => ({ ...prev, prompt: true }))} onChange={e => onChange({ prompt: e.target.value })} /></FormField>{promptError && <Text id={id + '-prompt-error'} role="alert" variant="caption" className="text-destructive">{copy('Enter a question prompt to save a draft.', 'Nhập nội dung câu hỏi để lưu nháp.')}</Text>}</div>
        <div className="space-y-2"><Text variant="body-sm" className="font-medium">{copy('Answer options', 'Các lựa chọn đáp án')}</Text><Text variant="caption" className="text-muted-foreground">{copy('Select the radio button beside the correct answer. You can leave it unset in a draft.', 'Chọn nút tròn cạnh đáp án đúng. Có thể chưa chọn khi lưu nháp.')}</Text>
          <RadioGroup aria-label={copy('Correct answer', 'Đáp án đúng')} value={content.correctAnswer === null ? '' : String(content.correctAnswer)} disabled={busy} onChange={value => onChange({ correctAnswer: Number(value) })}>
            {['A', 'B', 'C', 'D'].map((letter, index) => <div key={letter} className="flex items-start gap-3 rounded-lg border border-border p-3"><RadioGroupItem id={id + '-answer-' + index} name={id + '-correct-answer'} aria-label={copy(`Correct answer ${letter}`, `Đáp án đúng ${letter}`)} value={String(index)} /><div className="min-w-0 flex-1"><FormField label={copy(`Option ${letter}`, `Lựa chọn ${letter}`)}><QuestionTextArea className={`${control} max-h-32`} rows={2} value={content.options[index] ?? ''} disabled={busy} onChange={e => { const options = [...content.options]; options[index] = e.target.value; onChange({ options }) }} /></FormField></div></div>)}
          </RadioGroup>
          {content.correctAnswer !== null && <Button variant="ghost" size="sm" disabled={busy} onClick={() => onChange({ correctAnswer: null })}>{copy('Clear answer selection', 'Bỏ chọn đáp án')}</Button>}
        </div>
        <FormField label={copy('Answer explanation', 'Giải thích đáp án')}><QuestionTextArea aria-label={copy('Answer explanation', 'Giải thích đáp án')} className={`${control} max-h-48`} rows={3} value={content.explanation ?? ''} disabled={busy} onChange={e => onChange({ explanation: e.target.value })} /></FormField>
      </section>
      <div className="lg:hidden"><Accordion><AccordionItem value="preview"><AccordionTrigger>{copy('Live preview', 'Xem trước')}</AccordionTrigger><AccordionContent>{preview}</AccordionContent></AccordionItem></Accordion></div>
    </div>
    <div className="hidden min-w-0 lg:sticky lg:top-0 lg:block">{preview}</div>
  </div>
}
