import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { ToastProvider } from '../../shared/hooks/useToast'
import { PlatformRq3BenchmarkPage } from './PlatformRq3BenchmarkPage'

const reportPath = resolve(__dirname, '../../../public/fixtures/rq3-samples/rq3-pilot100-20261125-r2-runtime-parity.json')
const reportJson = JSON.parse(readFileSync(reportPath, 'utf-8'))

describe('PlatformRq3BenchmarkPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => reportJson,
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads and displays the 100-profile RQ3 checkpoint trajectory, strata analysis, and learner inspector', async () => {
    render(
      <MemoryRouter initialEntries={['/platform-admin/rq3-benchmark']}>
        <LanguageProvider>
          <ToastProvider>
            <PlatformRq3BenchmarkPage />
          </ToastProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('rq3-checkpoint-table')).toBeTruthy()
    })

    expect(screen.getByText('100 × 30')).toBeTruthy()
    expect(screen.getAllByText('+0.0427').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('72 / 27 / 1')).toBeTruthy()

    // Reload button is enabled, does not claim to rerun the simulation, and updates the load badge
    const runBtn = screen.getByTestId('rq3-run-button') as HTMLButtonElement
    expect(runBtn.textContent).toMatch(/Tải lại kết quả đã lưu|Reload saved results/)
    expect(runBtn.textContent).not.toMatch(/Chạy lại|Re-run/)
    expect(runBtn.disabled).toBe(false)
    fireEvent.click(runBtn)

    await waitFor(() => {
      expect(screen.getByText(/lần tải #2|load #2/i)).toBeTruthy()
    })

    // Switch to Strata & Sensitivity tab
    fireEvent.click(screen.getByTestId('rq3-tab-strata'))
    await waitFor(() => {
      expect(screen.getByText('HAS_UNACHIEVED_PREREQUISITES')).toBeTruthy()
      expect(screen.getByText('ALL_PREREQUISITES_ALREADY_ACHIEVED')).toBeTruthy()
    })
    expect(screen.getByTestId('rq3-secondary-outcomes')).toBeTruthy()
    expect(screen.getByText('Long horizon (budget 80)')).toBeTruthy()
    expect(screen.getByText('Equal initial knowledge control')).toBeTruthy()
    // A0 vs S1 is reported with its sign; S1 is lower than A0 in this run.
    expect(screen.getAllByText('−0.0136').length).toBeGreaterThan(0)

    // Switch to 100-Profile Inspector tab
    fireEvent.click(screen.getByTestId('rq3-tab-inspector'))
    await waitFor(() => {
      expect(screen.getAllByText('SYN-76155D6F7B2C').length).toBeGreaterThan(0)
    })
  })
})
