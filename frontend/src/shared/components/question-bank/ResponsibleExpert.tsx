import type { BankSession } from '../../api/questionBankApi'
import { expertIdentity } from './questionBankPresentation'
export function ResponsibleExpert({ owner, session, vi, compact = false }: { owner: string | null; session: BankSession | null; vi: boolean; compact?: boolean }) {
  const person = expertIdentity(owner, session, vi)
  return <div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-muted ${compact ? 'text-xs' : 'text-caption'} font-semibold text-muted-foreground`}>{person.initials || '—'}</span><div className="min-w-0"><span className={`block break-words ${compact ? 'text-sm' : 'text-body-sm'} font-medium`}>{person.name}</span>{person.eligible && <span className={`block ${compact ? 'text-xs' : 'text-caption'} text-muted-foreground`}>Expert</span>}</div></div>
}
