import { expect, it } from 'vitest'
import { adaptiveConfiguration, adaptiveErrors, boundsDraft, editAdaptiveBounds } from './adaptiveBaselineDraft'
import type { AdaptiveCapacity } from './adaptiveBaselineApi'
const capacity: AdaptiveCapacity = { occupationName: 'Fixture', catalogFingerprint: 'f1', explorationCapacity: 135, explorationMissingParameterCount: 0, roles: {}, occupation: { eligibleCapacity: 135, skillCount: 15, minimumPerSkill: 3, minimumQuestions: 45, modelMaxQuestions: 4096 } }
it('MM04 retains exactly 3000 seconds through clear/reentry and fresh record switch', () => {
 const original=boundsDraft({ maxQuestions: 45, timeLimitSeconds: 3000 })
 expect(original.totalSeconds).toBe('3000')
 const cleared=editAdaptiveBounds(original,'totalMinutes','')
 expect(cleared.totalSeconds).toBe(''); expect(cleared.secondsPerQuestion).toBe('')
 const restored=editAdaptiveBounds(cleared,'totalMinutes','50')
 expect(adaptiveConfiguration({ name: 'v1', occupation: restored },capacity)?.occupationBounds.timeLimitSeconds).toBe(3000)
 const other=boundsDraft({ maxQuestions: 100, timeLimitSeconds: 6600 })
 expect(other.totalSeconds).toBe('6600'); expect(original.totalSeconds).toBe('3000')
})
it('AB-C03/04 requires explicit values after clearing all time inputs', () => {
 const blank=editAdaptiveBounds(boundsDraft(),'secondsPerQuestion','')
 const count=editAdaptiveBounds(blank,'maxQuestions','45')
 expect(adaptiveConfiguration({ name: 'Blank', occupation: count },capacity)).toBeNull()
 expect(adaptiveErrors({ name: 'Blank', occupation: count },capacity).totalMinutes).toBe('durationRequired')
 const explicit=editAdaptiveBounds(count,'secondsPerQuestion','60')
 expect(adaptiveConfiguration({ name: 'Valid', occupation: explicit },capacity)?.occupationBounds.timeLimitSeconds).toBe(2700)
})
it('AB-C03 validates Unicode name, integer maximum and duration boundaries', () => {
 const occupation=boundsDraft({ maxQuestions: 45, timeLimitSeconds: 1350 })
 expect(adaptiveConfiguration({ name: '😀'.repeat(100), occupation },capacity)).not.toBeNull()
 expect(adaptiveConfiguration({ name: '😀'.repeat(101), occupation },capacity)).toBeNull()
 expect(adaptiveConfiguration({ name: 'x', occupation: { ...occupation, maxQuestions: '45.5' } },capacity)).toBeNull()
 expect(adaptiveConfiguration({ name: 'x', occupation: boundsDraft({ maxQuestions: 45, timeLimitSeconds: 1349 }) },capacity)).toBeNull()
})
