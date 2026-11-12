import type { BankAudit, BankQuestion, BankSession } from '../../api/questionBankApi'
export function expertIdentity(owner: string | null, session: BankSession | null, vi: boolean) {
  if (!owner) return { name: vi ? 'Chưa phân công' : 'Unassigned', eligible: false, initials: '' }
  const known = session?.experts.find(person => person.id === owner) ?? session?.people.find(person => person.id === owner)
  const name = known?.name?.trim() || (vi ? 'Chưa có thông tin Expert' : 'Expert unavailable')
  return { name, eligible: !!session?.experts.some(person => person.id === owner), initials: known?.name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() ?? '' }
}
export function lastRecordedUpdate(question: BankQuestion, history: BankAudit[]) {
  const timestamps = [question.versions.at(-1)?.editedAt, ...history.filter(event => event.question === question.id).map(event => event.at)].filter((value): value is string => !!value && Number.isFinite(Date.parse(value)))
  return timestamps.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null
}
export function latestAssignment(history: BankAudit[], question: string) {
  return history.filter(event => event.question === question && event.action === 'ASSIGNED' && Number.isFinite(Date.parse(event.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at ?? null
}
