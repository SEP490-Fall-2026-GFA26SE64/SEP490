import { useRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LessonVideoControls } from './LessonVideoControls'
vi.mock('../../i18n/LanguageContext', () => ({
  useTranslation: () => ({ language: 'en' }),
}))
function Fixture() {
  const media = useRef<HTMLVideoElement>(null)
  return (
    <div>
      <video ref={media} data-testid="media" />
      <LessonVideoControls media={media} title="Actual video title" />
    </div>
  )
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
describe('R6 original player controls use the media element', () => {
  it('uses actual metadata, seeking, volume and playback rate without a simulated progress bar', () => {
    render(<Fixture />)
    const video = screen.getByTestId('media') as HTMLVideoElement
    expect(
      (
        screen.getAllByRole('button', {
          name: 'Play video',
        })[0] as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    Object.defineProperties(video, {
      duration: { configurable: true, value: 100 },
      readyState: { configurable: true, value: 1 },
    })
    fireEvent.loadedMetadata(video)
    expect(
      (
        screen.getAllByRole('button', {
          name: 'Play video',
        })[0] as HTMLButtonElement
      ).disabled,
    ).toBe(false)
    fireEvent.change(
      screen.getByRole('slider', { name: 'Video playback position' }),
      { target: { value: 35 } },
    )
    expect(video.currentTime).toBe(35)
    fireEvent.timeUpdate(video)
    expect(screen.getByText('00:35 / 01:40')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mute video' }))
    expect(video.muted).toBe(true)
    fireEvent.volumeChange(video)
    expect(screen.getByRole('button', { name: 'Unmute video' })).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Change playback speed' }),
    )
    expect(video.playbackRate).toBe(1.5)
    fireEvent.rateChange(video)
    expect(
      screen.getByRole('button', { name: 'Change playback speed' }).textContent,
    ).toBe('1.5x')
  })
  it('calls actual playback methods and shows a play failure instead of simulating playback', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValue(new Error('Decode unavailable'))
    render(<Fixture />)
    const video = screen.getByTestId('media') as HTMLVideoElement
    Object.defineProperties(video, {
      duration: { configurable: true, value: 100 },
      readyState: { configurable: true, value: 1 },
    })
    fireEvent.loadedMetadata(video)
    fireEvent.click(screen.getAllByRole('button', { name: 'Play video' })[0])
    expect(play).toHaveBeenCalledOnce()
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Cannot play video',
    )
    expect(video.paused).toBe(true)
    expect(video.currentTime).toBe(0)
  })
})
