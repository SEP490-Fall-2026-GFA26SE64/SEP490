// C3-only independent wire fixture. Never imported by runtime modules.
import type { ReviewDetail, TeachingTarget } from '../../../shared/api/initialPathway'
export const target: TeachingTarget = { skillId: 'S', instructionLevel: null, teachingFocus: 'PRIMARY', difficultyLevel: 'LOW', coverageRole: 'COVERAGE', expertAttention: false, attentionReason: null }
export function reviewFixture(state = 'AWAITING_EXPERT_REVIEW', unresolved = false): ReviewDetail {
  return {
    summary: { id: '00000000-0000-0000-0000-000000000019', revision: 4, contentHash: 'a'.repeat(64), reviewStatus: state, validationStatus: unresolved ? 'UNRESOLVED' : 'VALID', roleName: 'Test Role', levelName: 'Test Level', learnerId: 'employee-a', learnerLabel: 'Employee A' },
    gaps: { need: 'LEARNING_REQUIRED', skills: [{ skillId: 'S', name: 'Skill S', requiredScore: 0.8, mandatory: true, mastery: 0.2, confidence: 'known', gap: 0.6, evidenceState: 'KNOWN', unknownReason: null }] },
    revision: { revision: 4, contentHash: 'a'.repeat(64), selectedModules: unresolved ? [] : ['M-A', 'M-B'], overrides: [], plan: {
      modules: unresolved ? [] : ['M-A', 'M-B'].map((id, i) => ({ id, title: 'Module ' + id, ordinal: i + 1, contentVersion: 'content-1', durationMinutes: 30, priceVnd: 100, targets: [target] })),
      diagnostics: unresolved ? ['MISSING_PROVIDER:S'] : [], warnings: [], dependencies: [],
      quality: { moduleCount: unresolved ? 0 : 2, durationMinutes: unresolved ? 0 : 60, priceVnd: unresolved ? 0 : 200, supportingFallbacks: 0, firstFallbacks: 0, secondFallbacks: 0, supportingBeneficiaries: [] },
    } },
    candidates: [{ ...target, moduleId: 'M-REPAIR', title: 'Repair module', durationMinutes: 20, priceVnd: 100, reason: 'test suitability', preferredDifficulty: 'LOW', preference: 0 }],
  }
}
