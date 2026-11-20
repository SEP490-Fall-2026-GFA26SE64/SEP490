import type { ReactNode } from 'react'
import { Fragment, useState } from 'react'
import { Eye, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react'
import { QuestionId } from './QuestionId'
import type { BankAudit, BankQuestion, BankSession, BankVersion } from '../../api/questionBankApi'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ResponsibleExpert } from './ResponsibleExpert'
import { QuestionRowActions } from './QuestionRowActions'
import { lastRecordedUpdate } from './questionBankPresentation'
import { cn } from '../../lib/utils'

export function QuestionDirectory({ questions, history, session, selected, onSelect, onView, actions, busy, vi, levelName, stateName, date, primaryActions, hasActions }: {
 questions: BankQuestion[]; history: BankAudit[]; session: BankSession; selected: string[]; onSelect: (id: string, checked: boolean) => void
 onView: (q: BankQuestion) => void; actions: (q: BankQuestion) => ReactNode; busy: boolean; vi: boolean
 primaryActions: (q: BankQuestion) => ReactNode; hasActions: (q: BankQuestion) => boolean
 levelName: (value: string | null) => string; stateName: (value: BankVersion) => string; date: (value: string | null) => string
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copy = (en: string, vn: string) => vi ? vn : en
  const labels = [copy('Question', 'Câu hỏi'), 'MicroSkill', copy('Knowledge level', 'Mức kiến thức'), copy('Responsible Expert', 'Expert phụ trách'), copy('Status', 'Trạng thái'), copy('Last updated', 'Cập nhật gần nhất'), copy('Actions', 'Thao tác')]

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="block w-full table-fixed text-left text-xs xl:table">
        <caption className="sr-only">{copy('Question Bank Directory', 'Danh sách câu hỏi')}</caption>
        <thead className="hidden bg-muted/40 text-[11px] uppercase text-muted-foreground xl:table-header-group">
          <tr>
            {labels.map((label, i) => (
              <th key={label} scope="col" className={`px-3 py-2.5 font-semibold ${i === 6 ? 'text-right' : 'text-left'} ${['w-[25%]', 'w-[14%]', 'w-[11%]', 'w-[15%]', 'w-[9%]', 'w-[9%]', 'w-[17%]'][i]}`}>
                <span>{label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block divide-y divide-border xl:table-row-group">
          {questions.map(q => {
            const publishedVersion = [...q.versions].reverse().find(v => v.state === 'PUBLISHED')
            const primaryVersion = publishedVersion ?? q.versions.at(-1)!
            const childVersions = q.versions.filter(v => v.id !== primaryVersion.id)
            const isExpanded = expandedIds.has(q.id)

            const skill = primaryVersion.content.skillName || session.skills.find(s => s.id === primaryVersion.content.skillId)?.name || copy('Skill unavailable', 'Chưa có tên kỹ năng')
            const update = lastRecordedUpdate(q, history)
            const statusText = q.retired ? copy('Retired', 'Ngừng sử dụng') : stateName(primaryVersion)

            return (
              <Fragment key={q.id}>
                <tr
                  data-testid="question-row"
                  className={cn(
                    "grid grid-cols-2 items-start gap-3 p-3 transition-colors hover:bg-muted/40 xl:table-row xl:p-0",
                    isExpanded && childVersions.length > 0 && "bg-muted/5"
                  )}
                >
                  <td className="col-span-2 min-w-0 xl:px-3 xl:py-3">
                    <div className="flex items-start gap-2">
                      {session.actor.role === 'LD_MANAGER' && !q.retired && primaryVersion.state === 'SUBMITTED' && (
                        <input
                          className="mt-1 accent-primary"
                          type="checkbox"
                          aria-label={`${copy('Select', 'Chọn')} ${q.code}`}
                          checked={selected.includes(q.id)}
                          onChange={event => onSelect(q.id, event.target.checked)}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Button
                          variant="link"
                          className="h-auto w-full justify-start whitespace-normal p-0 text-left font-semibold leading-snug text-foreground hover:text-primary [&>span]:line-clamp-2 [&>span]:whitespace-normal"
                          aria-label={`${copy('View question', 'Xem câu hỏi')} ${q.code}`}
                          disabled={busy}
                          onClick={() => onView(q)}
                        >
                          {primaryVersion.content.prompt || copy('Question prompt is empty', 'Chưa nhập nội dung câu hỏi')}
                        </Button>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {childVersions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(q.id)}
                              className="text-primary hover:text-primary-hover shrink-0 p-0.5 rounded hover:bg-primary/10 transition-colors"
                              aria-label={isExpanded ? copy('Collapse versions', 'Thu gọn phiên bản') : copy('Expand versions', 'Mở rộng phiên bản')}
                              title={isExpanded ? copy('Collapse versions', 'Thu gọn phiên bản') : copy('Expand versions', 'Mở rộng phiên bản')}
                            >
                              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            </button>
                          )}
                          <QuestionId code={q.code} short vi={vi} />
                          <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1 text-primary">
                            v{primaryVersion.number}.0
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="col-span-2 min-w-0 xl:px-3 xl:py-3">
                    <span className="mb-1 block text-xs text-muted-foreground xl:hidden">MicroSkill</span>
                    <span className="block break-words">{skill}</span>
                  </td>
                  <td className="min-w-0 whitespace-nowrap xl:px-3 xl:py-3">
                    <span className="mb-1 block text-xs text-muted-foreground xl:hidden">{labels[2]}</span>
                    {levelName(primaryVersion.content.knowledgeLevel)}
                  </td>
                  <td className="min-w-0 xl:px-3 xl:py-3">
                    <span className="mb-1 block text-xs text-muted-foreground xl:hidden">{labels[3]}</span>
                    <ResponsibleExpert owner={q.owner} session={session} vi={vi} compact />
                  </td>
                  <td className="min-w-0 xl:px-3 xl:py-3" data-testid="question-status" title={statusText}>
                    <span className="mb-1 block text-xs text-muted-foreground xl:hidden">{labels[4]}</span>
                    {q.retired ? (
                      <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground font-bold whitespace-normal">RETIRED</Badge>
                    ) : primaryVersion.state === 'PUBLISHED' ? (
                      <Badge variant="success" className="whitespace-normal">PUBLISHED</Badge>
                    ) : primaryVersion.state === 'SUBMITTED' ? (
                      <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400 whitespace-normal">SUBMITTED</Badge>
                    ) : (
                      <Badge variant="warning" className="whitespace-normal">DRAFT</Badge>
                    )}
                    {q.request && <span title={copy('Availability request pending', 'Chờ duyệt yêu cầu sử dụng')} className="ml-2 inline-block size-2 rounded-full bg-warning" />}
                  </td>
                  <td className="min-w-0 break-words text-xs text-muted-foreground xl:px-3 xl:py-3" title={copy('Latest recorded content or activity change', 'Thay đổi nội dung hoặc hoạt động được ghi nhận gần nhất')}>
                    <span className="mb-1 block xl:hidden">{labels[5]}</span>
                    {update ? <time dateTime={update}>{date(update)}</time> : '–'}
                  </td>
                  <td className="col-span-2 text-right xl:px-3 xl:py-3">
                    <div className="flex items-center justify-end gap-2 [&>button]:shrink-0">
                      <Button variant="outline" size="icon" title={copy('View Details & History', 'Xem chi tiết và lịch sử')} aria-label={`${copy('View details', 'Xem chi tiết')} ${q.code}`} disabled={busy} onClick={() => onView(q)}>
                        <Eye className="size-4 text-primary" aria-hidden="true" />
                      </Button>
                      {primaryActions(q)}
                      {hasActions(q) && (
                        <QuestionRowActions label={`${copy('Actions for', 'Thao tác cho')} ${q.code}`} disabled={busy}>
                          {actions(q)}
                        </QuestionRowActions>
                      )}
                    </div>
                  </td>
                </tr>

                {isExpanded && childVersions.map(childV => {
                  const childSkill = childV.content.skillName || session.skills.find(s => s.id === childV.content.skillId)?.name || copy('Skill unavailable', 'Chưa có tên kỹ năng')
                  const childUpdate = childV.editedAt || childV.submittedAt || childV.reviewedAt || update

                  return (
                    <tr
                      key={childV.id}
                      data-testid="question-child-row"
                      className="grid grid-cols-2 items-start gap-3 p-3 bg-muted/10 border-l-4 border-l-primary/70 hover:bg-muted/20 xl:table-row xl:p-0 transition-colors"
                    >
                      <td className="col-span-2 min-w-0 xl:px-3 xl:py-3">
                        <div className="flex items-start gap-2 pl-3">
                          {session.actor.role === 'LD_MANAGER' && !q.retired && childV.state === 'SUBMITTED' && (
                            <input
                              className="mt-1 accent-primary"
                              type="checkbox"
                              aria-label={`${copy('Select', 'Chọn')} ${q.code}`}
                              checked={selected.includes(q.id)}
                              onChange={event => onSelect(q.id, event.target.checked)}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <Button
                              variant="link"
                              className="h-auto w-full justify-start whitespace-normal p-0 text-left font-semibold leading-snug text-foreground hover:text-primary [&>span]:line-clamp-2 [&>span]:whitespace-normal"
                              aria-label={`${copy('View question', 'Xem câu hỏi')} ${q.code}`}
                              disabled={busy}
                              onClick={() => onView(q)}
                            >
                              {childV.content.prompt || copy('Question prompt is empty', 'Chưa nhập nội dung câu hỏi')}
                            </Button>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1 text-primary">
                                <CornerDownRight className="size-3.5 shrink-0" />
                                <span className="font-mono text-xs font-semibold">{q.code}</span>
                              </div>
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1 text-primary">
                                v{childV.number}.0
                              </Badge>
                              {childV.state !== 'PUBLISHED' && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground border-border">
                                  {childV.state === 'DRAFT' ? copy('Draft revision', 'Bản nháp kế tiếp') : copy('Pending revision', 'Bản chờ duyệt')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="col-span-2 min-w-0 xl:px-3 xl:py-3">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">MicroSkill</span>
                        <span className="block break-words">{childSkill}</span>
                      </td>
                      <td className="min-w-0 whitespace-nowrap xl:px-3 xl:py-3">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">{labels[2]}</span>
                        {levelName(childV.content.knowledgeLevel)}
                      </td>
                      <td className="min-w-0 xl:px-3 xl:py-3">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">{labels[3]}</span>
                        <ResponsibleExpert owner={q.owner} session={session} vi={vi} compact />
                      </td>
                      <td className="min-w-0 xl:px-3 xl:py-3" data-testid="question-child-status">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">{labels[4]}</span>
                        {childV.state === 'PUBLISHED' ? (
                          <Badge variant="success" className="whitespace-normal">PUBLISHED</Badge>
                        ) : childV.state === 'SUBMITTED' ? (
                          <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400 whitespace-normal">SUBMITTED</Badge>
                        ) : (
                          <Badge variant="warning" className="whitespace-normal">DRAFT</Badge>
                        )}
                      </td>
                      <td className="min-w-0 break-words text-xs text-muted-foreground xl:px-3 xl:py-3">
                        <span className="mb-1 block xl:hidden">{labels[5]}</span>
                        {childUpdate ? <time dateTime={childUpdate}>{date(childUpdate)}</time> : '–'}
                      </td>
                      <td className="col-span-2 text-right xl:px-3 xl:py-3">
                        <div className="flex items-center justify-end gap-2 [&>button]:shrink-0">
                          <Button variant="outline" size="icon" title={copy('View Details & History', 'Xem chi tiết và lịch sử')} aria-label={`${copy('View details', 'Xem chi tiết')} ${q.code}`} disabled={busy} onClick={() => onView(q)}>
                            <Eye className="size-4 text-primary" aria-hidden="true" />
                          </Button>
                          {primaryActions(q)}
                          {hasActions(q) && (
                            <QuestionRowActions label={`${copy('Actions for', 'Thao tác cho')} ${q.code}`} disabled={busy}>
                              {actions(q)}
                            </QuestionRowActions>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
