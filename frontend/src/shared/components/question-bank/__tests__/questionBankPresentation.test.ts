import { expect, it } from 'vitest'
import type { BankSession, BankQuestion, BankAudit } from '../../../api/questionBankApi'
import { expertIdentity, lastRecordedUpdate, latestAssignment } from '../questionBankPresentation'
const session = { experts: [{ id: 'owner', name: 'Actual Owner' }], people: [{ id: 'creator', name: 'Different Creator' }, { id: 'former', name: 'Former Expert' }] } as BankSession
it('distinguishes actual ownership from absent ownership and unavailable identity', () => {
 expect(expertIdentity('owner', session, false)).toEqual({ name: 'Actual Owner', initials: 'AO', eligible: true })
 expect(expertIdentity(null, session, false).name).toBe('Unassigned')
 expect(expertIdentity('missing', session, false).name).toBe('Expert unavailable')
 expect(expertIdentity('former', session, false)).toMatchObject({ name: 'Former Expert', eligible: false })
})
it('uses only recorded change timestamps, and does not fabricate assignment dates', () => {
 const q = { id: 'q', versions: [{ editedAt: null }] } as unknown as BankQuestion
 const history = [{ question: 'q', action: 'ASSIGNED', at: '2026-10-30T09:00:00Z' }, { question: 'q', action: 'EDITED', at: '2026-10-31T09:00:00Z' }, { question: 'other', action: 'ASSIGNED', at: '2026-11-01T09:00:00Z' }] as BankAudit[]
 expect(lastRecordedUpdate(q, history)).toBe('2026-10-31T09:00:00Z')
 expect(latestAssignment(history, 'q')).toBe('2026-10-30T09:00:00Z')
 expect(lastRecordedUpdate(q, [])).toBeNull()
 expect(latestAssignment([], 'q')).toBeNull()
})
