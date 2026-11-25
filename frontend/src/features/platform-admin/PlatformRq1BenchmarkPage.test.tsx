import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { ToastProvider } from '../../shared/hooks/useToast'
import { Toaster } from '../../shared/components/ui/Toast'
import { PlatformRq1BenchmarkPage } from './PlatformRq1BenchmarkPage'
import { parseProfilesFromText, runStep1PathwayAndRanking } from './rq1BenchmarkEngine'
import { loadRq1TestCatalog, testExpertRecords } from './__tests__/rq1TestFixtures'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const CATALOG_DIR = path.join(REPO_ROOT, 'documents/research/data/rq1/application-developer-v0.1')
const STEP1_JSONL_PATH = path.join(REPO_ROOT, 'documents/research/data/rq1/profiles-v0.1/gold50-profiles.jsonl')

describe('PlatformRq1BenchmarkPage UI Flow', () => {
  beforeEach(() => {
    localStorage.setItem('app_language', 'vi')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      const map: Record<string, string> = {
        '/fixtures/rq1-catalog/role.json': 'role.json',
        '/fixtures/rq1-catalog/skills.json': 'skills.json',
        '/fixtures/rq1-catalog/modules.json': 'modules.json',
        '/fixtures/rq1-catalog/teaching-bindings.json': 'teaching-bindings.json',
        '/fixtures/rq1-catalog/requirements.json': 'requirements.json',
        '/fixtures/rq1-catalog/prerequisites.json': 'prerequisites.json',
      }
      for (const [k, filename] of Object.entries(map)) {
        if (url.endsWith(k)) {
          const content = fs.readFileSync(path.join(CATALOG_DIR, filename), 'utf-8')
          return new Response(content, { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
      }
      return new Response('{}', { status: 200 })
    })
  })

  it('renders stored catalog KPIs, accepts Step 1 50 profiles upload to generate skill pathways, and accepts Step 2 expert evaluation upload to compute Hit Rate@5', async () => {
    render(
      <MemoryRouter initialEntries={['/platform-admin/rq1-benchmark']}>
        <ToastProvider>
          <LanguageProvider>
            <PlatformRq1BenchmarkPage /><Toaster />
          </LanguageProvider>
        </ToastProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('20 Skills • 72 Modules')).toBeTruthy()
    })

    // Step 2 button should be disabled before Step 1 upload
    const step2Btn = screen.getByTestId('rq1-step2-upload-btn') as HTMLButtonElement
    expect(step2Btn.disabled).toBe(true)

    // Step 1: Upload 50 Golden Set profiles file
    const step1Content = fs.readFileSync(STEP1_JSONL_PATH, 'utf-8')
    const step1File = new File([step1Content], 'gold50-profiles.jsonl', { type: 'application/json' })
    const step1Input = screen.getByTestId('rq1-step1-file-input') as HTMLInputElement

    fireEvent.change(step1Input, { target: { files: [step1File] } })

    await waitFor(() => {
      expect(screen.getByText('50 Profiles')).toBeTruthy()
    })
    expect(screen.getByTestId('rq1-profile-item-SYN-0DBAA5DE1F7F')).toBeTruthy()
    expect(screen.getByTestId('rq1-active-gap-count').textContent).toBe('1')

    // Select SYN-0E35D5A7A52B (7 gaps)
    fireEvent.click(screen.getByTestId('rq1-profile-item-SYN-0E35D5A7A52B'))
    expect(screen.getByTestId('rq1-active-gap-count').textContent).toBe('7')

    // Step 2: Upload Expert Evaluation file
    expect(step2Btn.disabled).toBe(false)
    const catalog = loadRq1TestCatalog()
    const records = testExpertRecords(runStep1PathwayAndRanking(parseProfilesFromText(step1Content, catalog), catalog))
    const step2Content = JSON.stringify(records)
    const step2File = new File([step2Content], 'gold50-expert-evaluation.jsonl', { type: 'application/json' })
    const step2Input = screen.getByTestId('rq1-step2-file-input') as HTMLInputElement

    fireEvent.change(step2Input, { target: { files: [step2File] } })

    await waitFor(() => {
      expect(screen.getByText(/Đã chấm 50 hồ sơ/i)).toBeTruthy()
    })
    records[0].grade0ModuleIds = []
    fireEvent.change(step2Input, { target: { files: [new File([JSON.stringify(records)], 'partial.json')] } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Chưa đủ dữ liệu đánh giá/))
    expect(screen.queryByText(/Đã chấm 50 hồ sơ/i)).toBeNull()
  }, 15000)
})
