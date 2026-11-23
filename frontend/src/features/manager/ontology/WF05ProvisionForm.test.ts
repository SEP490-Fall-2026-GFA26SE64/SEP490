import { expect, it } from 'vitest'
import { provisionForm, provisionPayload } from './skillProvisionForm'
it('WF05 regression: save/reopen preserves exclusive per-knowledge module OR certificate provision', () => {
  const skill = { id: 'A', code: 'A', name: 'Skill A', moduleOnlyKnowledgeLevels: ['FOUNDATION'], certificateOnlyKnowledgeLevels: ['ADVANCED'] }
  const form = provisionForm(skill)
  expect(form.FOUNDATION.mode).toBe('MODULE_ONLY')
  expect(form.INTERMEDIATE.mode).toBe('')
  expect(form.ADVANCED.mode).toBe('CERTIFICATE_ONLY')
  const payload = provisionPayload(form)
  expect(payload).toEqual({ moduleOnlyKnowledgeLevels: ['FOUNDATION'], certificateOnlyKnowledgeLevels: ['ADVANCED'] })
  form.FOUNDATION.mode = 'CERTIFICATE_ONLY'
  const changed = provisionPayload(form)
  expect(changed.moduleOnlyKnowledgeLevels).not.toContain('FOUNDATION')
  expect(changed.certificateOnlyKnowledgeLevels).toContain('FOUNDATION')
  expect(provisionForm({ ...skill, ...changed }).FOUNDATION.mode).toBe('CERTIFICATE_ONLY')
})
