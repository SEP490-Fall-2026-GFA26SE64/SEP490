import { LanguageProvider } from '../../../i18n/LanguageContext'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../hooks/useToast'
import { LanguageProvider } from '../../../i18n/LanguageContext'
import { Toaster } from '../../ui/Toast'
import { QuestionId } from '../QuestionId'
const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else Reflect.deleteProperty(navigator, 'clipboard') })
it('copies a complete ID and dismisses the shared success toast', async () => {
 vi.useFakeTimers()
 const writeText = vi.fn().mockResolvedValue(undefined)
 Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
 render(<LanguageProvider><ToastProvider><QuestionId code="Q-complete-id" short vi={false} /><Toaster /></ToastProvider></LanguageProvider>)
 await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy ID Q-complete-id' })) })
 expect(writeText).toHaveBeenCalledWith('Q-complete-id')
 expect(screen.getByRole('status').textContent).toContain('Copied to clipboard!')
 act(() => { vi.advanceTimersByTime(2501) })
 expect(screen.queryByRole('status')).toBeNull()
})
it('reports clipboard errors without claiming success or using alerts', async () => {
 Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
 const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
 render(<LanguageProvider><ToastProvider><QuestionId code="Q-error-with-complete-identifier" compact vi={false} /><Toaster /></ToastProvider></LanguageProvider>)
 fireEvent.click(screen.getByRole('button', { name: 'Copy ID Q-error-with-complete-identifier' }))
 expect((await screen.findByRole('status')).textContent).toContain('Unable to copy.')
 expect(screen.queryByText('Copied to clipboard!')).toBeNull()
 expect(screen.getByText('Q-error-with-complete-identifier')).toBeTruthy()
 expect(alert).not.toHaveBeenCalled()
})
