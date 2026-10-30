import { afterEach, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
it.each([undefined, 'http://127.0.0.1:8088', 'http://localhost:8088', 'https://external.example', 'http://127.0.0.1:28088'])('C3 refuses absent/shared/foreign URL %s', async url => {
  vi.stubEnv('SYSTEM_TEST_BASE_URL', url); vi.stubEnv('C3_COMPOSE_PROJECT', 'adapt-learn-graph-c3-pathway-test');vi.stubEnv('C3_ARTIFACT_DIR', '/tmp/test-artifacts')
  await expect(import('../../../../playwright.initial-pathway.config')).rejects.toThrow('shared8088 is forbidden')
})
it('C3 requires dedicated project identity even with isolated port', async () => {
  vi.stubEnv('SYSTEM_TEST_BASE_URL', 'http://127.0.0.1:38088'); vi.stubEnv('C3_COMPOSE_PROJECT', 'adapt-learn-graph-dev');vi.stubEnv('C3_ARTIFACT_DIR', '/tmp/test-artifacts')
  await expect(import('../../../../playwright.initial-pathway.config')).rejects.toThrow('dedicated Compose project')
})
it('C3 accepts explicit isolated identity and matches only the reconciled Expert spec', async () => {
  vi.stubEnv('SYSTEM_TEST_BASE_URL', 'http://127.0.0.1:38088');vi.stubEnv('C3_COMPOSE_PROJECT', 'adapt-learn-graph-c3-pathway-test');vi.stubEnv('C3_ARTIFACT_DIR', '/tmp/test-artifacts')
  const { default: config } = await import('../../../../playwright.initial-pathway.config')
  expect(config.testMatch).toBe('REQ-019-F01-expert-pathway-review-flow.spec.ts');expect(config.webServer).toBeUndefined();expect(config.retries).toBe(0)
})
