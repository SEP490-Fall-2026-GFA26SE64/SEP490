import { useEffect, useState, type RefObject } from 'react'
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Button } from '../ui/Button'
import { useTranslation } from '../../i18n/LanguageContext'

function changeMedia(
  element: HTMLVideoElement | null,
  patch: { position?: number; muted?: boolean; rate?: number },
) {
  if (!element) return
  if (patch.position !== undefined) element.currentTime = patch.position
  if (patch.muted !== undefined) element.muted = patch.muted
  if (patch.rate !== undefined) element.playbackRate = patch.rate
}

/** Original lesson-player chrome, driven exclusively by the actual media element. */
export function LessonVideoControls({
  media,
  title,
}: {
  media: RefObject<HTMLVideoElement | null>
  title: string
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [state, setState] = useState({
    position: 0,
    duration: 0,
    paused: true,
    muted: false,
    rate: 1,
    ready: false,
  })
  const [failure, setFailure] = useState('')
  useEffect(() => {
    const element = media.current
    if (!element) return
    const sync = () =>
      setState({
        position: element.currentTime,
        duration: Number.isFinite(element.duration) ? element.duration : 0,
        paused: element.paused,
        muted: element.muted,
        rate: element.playbackRate,
        ready: element.readyState >= 1,
      })
    const events = [
      'loadedmetadata',
      'durationchange',
      'timeupdate',
      'play',
      'pause',
      'ended',
      'volumechange',
      'ratechange',
      'seeking',
      'seeked',
    ]
    events.forEach((event) => element.addEventListener(event, sync))
    sync()
    return () =>
      events.forEach((event) => element.removeEventListener(event, sync))
  }, [media])
  function time(seconds: number) {
    return `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')}:${Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0')}`
  }
  function toggle() {
    const element = media.current
    if (!element) return
    setFailure('')
    if (element.paused)
      void element
        .play()
        .catch(() =>
          setFailure(
            vi
              ? 'Không phát được video. Hãy thử lại.'
              : 'Cannot play video. Please try again.',
          ),
        )
    else element.pause()
  }
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-foreground/85 to-transparent p-4 text-[length:var(--text-caption)] text-background">
        <span className="min-w-0 break-words font-semibold">{title}</span>
        <span className="shrink-0 font-mono">{time(state.duration)}</span>
      </div>
      {state.paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-16">
          <Button
            onClick={toggle}
            disabled={!state.ready}
            aria-label={vi ? 'Phát video' : 'Play video'}
            className="pointer-events-auto h-18 w-18 rounded-full bg-primary/95 p-0 text-primary-foreground shadow-xl hover:scale-105 sm:h-20 sm:w-20"
          >
            <Play className="ml-1 h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
          </Button>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-foreground/95 via-foreground/80 to-transparent p-3 text-background sm:p-4">
        <input
          type="range"
          min={0}
          max={state.duration || 1}
          step={0.1}
          value={Math.min(state.position, state.duration)}
          disabled={!state.ready}
          aria-label={vi ? 'Vị trí phát video' : 'Video playback position'}
          className="h-2 w-full cursor-pointer accent-primary"
          onChange={(event) => {
            changeMedia(media.current, { position: Number(event.target.value) })
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              disabled={!state.ready}
              aria-label={
                state.paused
                  ? vi
                    ? 'Phát video'
                    : 'Play video'
                  : vi
                    ? 'Tạm dừng video'
                    : 'Pause video'
              }
              className="h-9 w-9 p-0 text-background hover:bg-background/15 hover:text-background"
            >
              {state.paused ? <Play size={16} /> : <Pause size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                changeMedia(media.current, { muted: !state.muted })
              }}
              aria-label={
                state.muted
                  ? vi
                    ? 'Bật âm thanh'
                    : 'Unmute video'
                  : vi
                    ? 'Tắt âm thanh'
                    : 'Mute video'
              }
              className="h-9 w-9 p-0 text-background hover:bg-background/15 hover:text-background"
            >
              {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <span className="whitespace-nowrap font-mono text-[length:var(--text-eyebrow)] sm:text-caption">
              {time(state.position)} / {time(state.duration)}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={vi ? 'Đổi tốc độ phát' : 'Change playback speed'}
              className="px-2 text-background hover:bg-background/15 hover:text-background"
              onClick={() => {
                changeMedia(media.current, {
                  rate: state.rate === 2 ? 0.5 : state.rate + 0.5,
                })
              }}
            >
              {state.rate}x
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={vi ? 'Toàn màn hình' : 'Fullscreen video'}
              disabled={!document.fullscreenEnabled}
              className="h-9 w-9 p-0 text-background hover:bg-background/15 hover:text-background"
              onClick={() => {
                const host = media.current?.parentElement
                if (host)
                  void host
                    .requestFullscreen()
                    .catch(() =>
                      setFailure(
                        vi
                          ? 'Không mở được toàn màn hình.'
                          : 'Fullscreen is unavailable.',
                      ),
                    )
              }}
            >
              <Maximize2 size={16} />
            </Button>
          </div>
        </div>
        {failure && (
          <p role="alert" className="text-caption">
            {failure}
          </p>
        )}
      </div>
    </>
  )
}
