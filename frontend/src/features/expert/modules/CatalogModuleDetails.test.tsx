import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { CatalogModule, ModuleContent } from '../../../shared/api/moduleAuthoringApi'
import { CatalogModuleDetails } from './CatalogModuleDetails'
import { moduleRequest } from '../../../shared/api/moduleAuthoringApi'
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../../../shared/api/moduleAuthoringApi', () => ({ moduleRequest: vi.fn(async (path, _method, input) => {
  if (path !== '/text/preview') throw new Error('Unexpected write')
  return { html: `<h1>${input.body.replace(/^# /, '')}</h1>` }
}) }))
afterEach(cleanup)
const module: CatalogModule = { metadata: { id: 'module', version: '2', status: 'DRAFT', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }, title: 'Module', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'module-content:two', contentType: 'text/markdown', contentVersion: '2', duration: 5, teachings: [], knowledgeLevel: 'FOUNDATION', skillVersion: '1' }
const content: ModuleContent = { id: 'two', title: 'Reading', markdown: '# Exact revision two', contentType: 'text/markdown', contentVersion: '2', jobPositionIds: [], createdBy: 'expert', createdAt: '2026-11-13T00:00:00Z' }
it('previews legacy Markdown and follows the supplied revision when it changes', async () => {
  const props = { module, hasHistory: true, onClose: () => {}, embedded: true }
  const view = render(<CatalogModuleDetails {...props} content={content} />)
  fireEvent.click(screen.getByRole('tab', { name: 'View as learner' }))
  expect(await screen.findByRole('heading', { name: 'Exact revision two' })).toBeTruthy()
  expect(screen.getByText(/Content version 2/)).toBeTruthy()
  view.rerender(<CatalogModuleDetails {...props} content={{ ...content, id: 'one', contentVersion: '1', markdown: '# Historical revision one' }} />)
  expect(screen.queryByRole('heading', { name: 'Exact revision two' })).toBeNull()
  expect(await screen.findByRole('heading', { name: 'Historical revision one' })).toBeTruthy()
  expect(vi.mocked(moduleRequest).mock.calls.every(([path]) => path === '/text/preview')).toBe(true)
})
it('shows unavailable content without inventing a lesson', () => {
  render(<CatalogModuleDetails module={module} hasHistory={false} onClose={() => {}} embedded />)
  fireEvent.click(screen.getByRole('tab', { name: 'View as learner' }))
  expect(screen.getByRole('status').textContent).toContain('unavailable for this revision')
})
it('shares information, learner and history tabs while preserving caller metadata and timeline', () => {
  render(<CatalogModuleDetails module={module} content={content} hasHistory onClose={() => {}} embedded information={<p>Responsible Expert remains in details</p>} history={<p>Recorded timeline</p>} />)
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Module information', 'View as learner', 'Version history'])
  expect(screen.getByText('Responsible Expert remains in details')).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: 'Version history' }))
  expect(screen.getByText('Recorded timeline')).toBeTruthy()
  expect(screen.queryByText('Responsible Expert remains in details')).toBeNull()
})
