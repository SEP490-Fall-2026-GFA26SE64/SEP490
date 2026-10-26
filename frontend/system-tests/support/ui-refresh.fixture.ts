import type { AdaptivePreview } from '../../src/features/manager/baseline-assessments/adaptiveBaselineApi'
// Independent synthetic UI fixture, no development seeds or learner identity.
export const previewFixture: AdaptivePreview = { feasible: true, shortages: [], sample: Array.from({ length: 5 }, (_, q) => ({
  itemVersionId: `fixture-item-${q}`, microSkillId: `fixture-skill-${q}`, reason: 'SKILL_COVERAGE' as const,
  prompt: q === 0 ? Array.from({ length: 130 }, (_, n) => `[${n}] Tiếng Việt 😀 é 安全 question ${n}. `).join('') : `Question ${q + 1}: retained independent content.`,
  options: { A: q === 0 ? Array.from({ length: 50 }, (_, n) => `(${n}) Long option 😀 ${n} `).join('') : 'Option A', B: 'Option B – cuối cùng' },
})) }
