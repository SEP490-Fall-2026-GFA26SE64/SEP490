import { QuestionId } from './QuestionId'
import { useId, useState } from 'react'
import type { BankChoice, BankContent } from '../../api/questionBankApi'
import { Heading } from '../typography/Heading'
import { Text } from '../typography/Text'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/Accordion'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { Combobox } from '../ui/Combobox'
import { FormField } from '../ui/FormField'
import { QuestionTextArea } from './QuestionTextArea'
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup'
import { Select } from '../ui/Select'
import { QuestionContentPreview } from './QuestionContentPreview'

const control = 'min-h-9 w-full rounded-xl border border-border/80 bg-card px-3.5 py-2 text-body-sm text-foreground shadow-2xs transition-all placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50'
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
  const preview = (
    <aside aria-label={copy('Question preview', 'Xem trước câu hỏi')} className="min-w-0 rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
      <div className="hidden items-center justify-between gap-2 lg:flex">
        <Heading level={3} size="card" className="text-body font-semibold">{copy('Live preview', 'Xem trước')}</Heading>
        <Badge variant="outline" className="bg-card">{copy('Draft', 'Bản nháp')}</Badge>
      </div>
      <Text variant="caption" className="text-muted-foreground">{copy('Reflects your current draft. Empty fields are not completed automatically.', 'Hiển thị đúng bản nháp hiện tại. Các trường trống không được tự điền.')}</Text>
      <div role="region" tabIndex={0} aria-label={copy('Scrollable question preview', 'Nội dung xem trước có thể cuộn')} className="max-h-[65dvh] overflow-y-auto overscroll-contain rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <QuestionContentPreview content={content} vi={vi} />
      </div>
    </aside>
  )
  return <div className="grid items-start gap-5 px-1 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
    <div className="min-w-0 space-y-4">
      <section className="space-y-3.5" aria-label={copy('Question content', 'Nội dung câu hỏi')}>
        <Heading level={3} size="card" className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
          {copy('Question content', 'Nội dung câu hỏi')} <span className="text-destructive" aria-hidden="true">*</span>
        </Heading>
        <QuestionTextArea
          aria-label={copy('Question prompt', 'Nội dung câu hỏi')}
          aria-required="true"
          aria-invalid={!!promptError}
          className={`${control} min-h-16 max-h-36 ${promptError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20' : ''}`}
          rows={2}
          placeholder={copy('Enter the question prompt…', 'Nhập nội dung câu hỏi…')}
          value={content.prompt}
          disabled={busy}
          onBlur={() => setTouched(prev => ({ ...prev, prompt: true }))}
          onChange={e => onChange({ prompt: e.target.value })}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-medium text-foreground">{copy('Answer options', 'Các lựa chọn đáp án')}</span>
              <span className="text-caption text-muted-foreground">{copy('(Select correct radio)', '(Chọn nút tròn đáp án đúng)')}</span>
            </div>
            {content.correctAnswer !== null && <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" disabled={busy} onClick={() => onChange({ correctAnswer: null })}>{copy('Clear answer selection', 'Bỏ chọn đáp án')}</Button>}
          </div>
          <RadioGroup aria-label={copy('Correct answer', 'Đáp án đúng')} value={content.correctAnswer === null ? '' : String(content.correctAnswer)} disabled={busy} onChange={value => onChange({ correctAnswer: Number(value) })} className="space-y-2">
            {['A', 'B', 'C', 'D'].map((letter, index) => {
              const isCorrect = content.correctAnswer === index
              return (
                <div
                  key={letter}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 shadow-2xs transition-all focus-within:ring-2 ${
                    isCorrect
                      ? 'border-success/50 bg-success/5 focus-within:border-success focus-within:ring-success/20'
                      : 'border-border/80 bg-card hover:border-border focus-within:border-primary focus-within:ring-primary/20'
                  }`}
                >
                  <RadioGroupItem id={id + '-answer-' + index} name={id + '-correct-answer'} aria-label={copy(`Correct answer ${letter}`, `Đáp án đúng ${letter}`)} value={String(index)} />
                  <label htmlFor={id + '-option-' + index} className="cursor-pointer shrink-0">
                    <Badge variant={isCorrect ? 'success' : 'secondary'} className="size-6.5 justify-center rounded-lg p-0 text-xs font-semibold">
                      {letter}
                    </Badge>
                  </label>
                  <div className="min-w-0 flex-1">
                    <QuestionTextArea
                      id={id + '-option-' + index}
                      aria-label={copy(`Option ${letter}`, `Lựa chọn ${letter}`)}
                      className="min-h-7 w-full border-0 bg-transparent px-1 py-0.5 text-body-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50"
                      rows={1}
                      placeholder={copy(`Enter option ${letter}…`, `Nhập lựa chọn ${letter}…`)}
                      value={content.options[index] ?? ''}
                      disabled={busy}
                      onChange={e => { const options = [...content.options]; options[index] = e.target.value; onChange({ options }) }}
                    />
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        </div>
        <FormField label={copy('Answer explanation', 'Giải thích đáp án')}>
          <QuestionTextArea aria-label={copy('Answer explanation', 'Giải thích đáp án')} className={`${control} min-h-12 max-h-32`} rows={2} placeholder={copy('Optional explanation shown after answering…', 'Giải thích đáp án (tùy chọn)…')} value={content.explanation ?? ''} disabled={busy} onChange={e => onChange({ explanation: e.target.value })} />
        </FormField>
      </section>
      <section aria-label={copy('Basic information', 'Thông tin cơ bản')}>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="space-y-3.5 p-4">
            <Heading level={3} size="card" className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{copy('Classification & settings', 'Phân loại & cấu hình')}</Heading>
            {code && <div><Text variant="caption" className="text-muted-foreground">{copy('Question code', 'Mã câu hỏi')}</Text><div><QuestionId code={code} vi={vi} /></div></div>}
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FormField label={<>MicroSkill <span className="text-destructive" aria-hidden="true">*</span></>}>
                  <Combobox
                    size="md"
                    clearable={false}
                    aria-label="MicroSkill"
                    aria-invalid={!!skillError}
                    aria-describedby={skillError ? id + '-skill-error' : undefined}
                    disabled={busy}
                    value={content.skillId}
                    onBlur={() => setTouched(prev => ({ ...prev, skill: true }))}
                    onChange={value => {
                      setTouched(prev => ({ ...prev, skill: true }))
                      onChange({ skillId: value, knowledgeLevel: null })
                    }}
                    options={skills.map(skill => ({ value: skill.id, label: skill.name, description: skill.id }))}
                    placeholder={copy('Select a skill', 'Chọn kỹ năng')}
                    searchPlaceholder={copy('Search skill by name or code…', 'Tìm kỹ năng theo tên hoặc mã…')}
                    emptyMessage={copy('No matching skill found.', 'Không tìm thấy kỹ năng.')}
                  />
                </FormField>
                {skillError && <Text id={id + '-skill-error'} role="alert" variant="caption" className="text-destructive">{copy('Choose a MicroSkill to save a draft.', 'Chọn MicroSkill để lưu nháp.')}</Text>}
              </div>
              <FormField label={copy('Knowledge level', 'Mức kiến thức')}>
                <Select
                  size="md"
                  aria-label={copy('Knowledge level', 'Mức kiến thức')}
                  disabled={busy || !content.skillId || !knowledgeLevels.length}
                  value={content.knowledgeLevel ?? ''}
                  onChange={value => onChange({ knowledgeLevel: value || null })}
                  placeholder={copy('Select level', 'Chọn mức')}
                  options={(['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const).map(level => ({
                    value: level,
                    label: levelName(level) ?? level,
                    disabled: !knowledgeLevels.includes(level),
                  }))}
                />
              </FormField>
            </div>
            {content.skillId && !knowledgeLevels.length && <Text role="status" variant="caption">{copy('This skill has no configured knowledge levels. Complete the catalog definition before classifying a question.', 'Kỹ năng này chưa có mức kiến thức được cấu hình. Cần hoàn thiện định nghĩa danh mục trước khi phân loại câu hỏi.')}</Text>}
            <label className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-body-sm cursor-pointer hover:bg-muted/30 transition-colors">
              <input type="checkbox" className="mt-0.5 size-4 rounded accent-primary cursor-pointer" checked={content.mandatory} disabled={busy} onChange={e => onChange({ mandatory: e.target.checked })} />
              <span>
                <span className="font-medium text-foreground">{copy('Mandatory in Skill Assessment', 'Bắt buộc trong Skill Assessment')}</span>
                <span className="mt-0.5 block text-caption text-muted-foreground">{copy('Ignored by Baseline assessment.', 'Không áp dụng cho Baseline assessment.')}</span>
              </span>
            </label>
          </CardContent>
        </Card>
      </section>
      <div className="lg:hidden"><Accordion><AccordionItem value="preview"><AccordionTrigger>{copy('Live preview', 'Xem trước')}</AccordionTrigger><AccordionContent>{preview}</AccordionContent></AccordionItem></Accordion></div>
    </div>
    <div className="hidden min-w-0 lg:sticky lg:top-0 lg:block">{preview}</div>
  </div>
}
