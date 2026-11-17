import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RiasecExperience } from './RiasecExperience'
import { RiasecScoreRadar } from './RiasecScoreRadar'
import { riasecRequest, type Draft, type View } from './riasecApi'
import { manifest } from './riasecInstrument'
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key.replace('riasecUi.', '') }) }))
vi.mock('./riasecApi', async original => ({ ...await original<typeof import('./riasecApi')>(), riasecRequest: vi.fn() }))
vi.mock('./RiasecAttemptPanel', () => ({ RiasecAttemptPanel: ({ locked, onRate, onReview }: { locked: boolean; onRate: (n: number) => void; onReview: () => void }) => <><button disabled={locked} onClick={() => onRate(3)}>Answer 3</button><button disabled={locked} onClick={() => onRate(4)}>Answer 4</button><button onClick={onReview}>Review answers</button></> }))
const editor = '00000000-0000-4000-8000-000000000001'
let server: View
beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(editor)
  server = { draft: { draftId: null, revision: 0, editorId: null, answers: {} }, currentId: null, results: [], activePositionIds: [] }
  vi.mocked(riasecRequest).mockImplementation(async (path = '', method = 'GET', body?: unknown) => {
    if (path === '' && method === 'GET') return structuredClone(server) as never
    if (path === '/draft' && method === 'POST') { server.draft = { draftId: 'DRAFT', revision: 1, editorId: editor, answers: {} }; return structuredClone(server.draft) as never }
    if (path === '/draft/takeover') { server.draft = { ...server.draft, editorId: editor, revision: server.draft.revision + 1 }; return structuredClone(server.draft) as never }
    if (path === '/draft' && method === 'PUT') { const edit = body as Draft; server.draft = { ...server.draft, answers: edit.answers, revision: edit.revision + 1 }; return structuredClone(server.draft) as never }
    throw Error('Unexpected request: ' + path)
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks() })
const show = () => render(<MemoryRouter><RiasecExperience scope="ORG:EMPLOYEE" active enabled /></MemoryRouter>)
it('serial autosave retains rapid edits and uses the accepted revision', async () => {
  show(); fireEvent.click(await screen.findByText('start')); await screen.findByText('Answer 3')
  let finish!: (d: Draft) => void
  const implementation = vi.mocked(riasecRequest).getMockImplementation()!
  let intercepted = false
  vi.mocked(riasecRequest).mockImplementation(async (path, method, body) => {
    if (path === '/draft' && method === 'PUT' && !intercepted) { intercepted = true; return await new Promise<Draft>(resolve => { finish = resolve }) as never }
    return implementation(path, method, body)
  })
  fireEvent.click(screen.getByText('Answer 3')); fireEvent.click(screen.getByText('Answer 4'))
  expect(riasecRequest).toHaveBeenCalledWith('/draft', 'PUT', expect.objectContaining({ revision: 1, answers: { R01: 3 } }))
  await act(async () => { finish({ draftId: 'DRAFT', editorId: editor, revision: 2, answers: { R01: 3 } }) })
  await waitFor(() => expect(riasecRequest).toHaveBeenCalledWith('/draft', 'PUT', expect.objectContaining({ revision: 2, answers: { R01: 4 } })))
  await screen.findByText('Saved to your account')
})
it('a later tab only reads until explicit takeover; incomplete drafts cannot submit', async () => {
  server.draft = { draftId: 'DRAFT', editorId: 'other-tab', revision: 7, answers: { R01: 2 } }
  show(); const answer = await screen.findByText('Answer 3'); expect((answer as HTMLButtonElement).disabled).toBe(true)
  expect(riasecRequest).not.toHaveBeenCalledWith('/draft/takeover', expect.anything(), expect.anything())
  fireEvent.click(screen.getByText('Continue here'))
  await waitFor(() => expect((screen.getByText('Answer 3') as HTMLButtonElement).disabled).toBe(false))
  expect(riasecRequest).toHaveBeenCalledWith('/draft/takeover', 'POST', expect.objectContaining({ draftId: 'DRAFT', revision: 7 }))
  fireEvent.click(screen.getByText('Review answers'))
  expect((screen.getByRole('button', { name: 'submit' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText(/Unanswered questions:/)).toBeTruthy()
})
it('preserves the complete original 60 EN/VI activities and integer response scale', () => {
  expect(manifest.items).toHaveLength(60)
  expect(new Set(manifest.items.map(q => q.id)).size).toBe(60)
  for (const d of ['R', 'I', 'A', 'S', 'E', 'C']) expect(manifest.items.filter(q => q.id.startsWith(d))).toHaveLength(10)
  expect(manifest.responses.map(r => r.code)).toEqual([0, 1, 2, 3, 4])
  expect(manifest.items.every(q => q.text.en.length && q.text.vi.length)).toBe(true)
})
it('radar keeps vertex scores and exposes both profiles through keyboard and touch', () => {
  render(<RiasecScoreRadar scores={{ R: 40, I: 30, A: 20, S: 10, E: 0, C: 15 }} />)
  expect(screen.queryByText('Realistic: 40/40')).toBeNull()
  expect(screen.getByText('R · 40')).toBeTruthy()
  fireEvent.focus(screen.getByRole('button', { name: 'R Realistic' })); expect(screen.getByRole('status').textContent).toBe('Realistic: You 40/40')
  fireEvent.click(screen.getByRole('button', { name: 'C Conventional' })); expect(screen.getByRole('status').textContent).toBe('Conventional: You 15/40')
})
