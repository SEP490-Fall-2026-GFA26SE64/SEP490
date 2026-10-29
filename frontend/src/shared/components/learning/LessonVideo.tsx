import { useEffect, useRef, useState } from 'react'
import type { LearningLesson } from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { Button } from '../ui/Button'
import { LessonVideoControls } from './LessonVideoControls'
interface Sample {
  position: number
  duration: number
  playing: boolean
}
interface YoutubePlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  seekTo(time: number, allow: boolean): void
  destroy(): void
}
interface YoutubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      playerVars: Record<string, number | string>
      events: {
        onReady: () => void
        onError: () => void
        onStateChange: (event: { data: number }) => void
      }
    },
  ) => YoutubePlayer
}
interface VimeoPlayer {
  ready(): Promise<void>
  on(
    name: string,
    callback: (event: { seconds: number; duration: number }) => void,
  ): void
  setCurrentTime(value: number): Promise<number>
  destroy(): Promise<void>
}
interface VimeoApi {
  Player: new (
    element: HTMLElement,
    options?: { url: string; responsive: boolean; dnt: boolean },
  ) => VimeoPlayer
}
declare global {
  interface Window {
    YT?: YoutubeApi
    Vimeo?: VimeoApi
  }
}
const scripts = new Map<string, Promise<void>>()
function script(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve()
  const existing = scripts.get(src)
  if (existing) return existing
  const loading = new Promise<void>((resolve, reject) => {
    const element = document.createElement('script')
    element.src = src
    element.async = true
    const began = Date.now()
    const timer = window.setInterval(() => {
      if (ready()) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - began > 15000) {
        clearInterval(timer)
        reject(new Error('Player unavailable'))
      }
    }, 100)
    element.onerror = () => {
      clearInterval(timer)
      reject(new Error('Player unavailable'))
    }
    document.head.appendChild(element)
  }).catch((error) => {
    scripts.delete(src)
    throw error
  })
  scripts.set(src, loading)
  return loading
}
export function LessonVideo({
  lesson,
  startAt = 0,
  onSample,
  onUnavailable,
  appearance = 'native',
}: {
  lesson: LearningLesson
  appearance?: 'native' | 'lesson'
  startAt?: number
  onSample?: (sample: Sample) => void
  onUnavailable?: () => void
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const host = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const sample = useRef(onSample)
  useEffect(() => {
    sample.current = onSample
  }, [onSample])
  const failure = useRef(onUnavailable)
  useEffect(() => {
    failure.current = onUnavailable
  }, [onUnavailable])
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const sourceKey = `${lesson.id}:${lesson.videoSource}:${lesson.assetId}:${lesson.videoUrl}:${attempt}`
  const error = failedSource === sourceKey
  const initial = useRef(startAt)
  useEffect(() => {
    let disposed = false
    let timer = 0
    let readyTimer = 0
    let youtube: YoutubePlayer | undefined
    let vimeo: VimeoPlayer | undefined
    const fail = () => {
      if (!disposed) {
        setFailedSource(sourceKey)
        failure.current?.()
      }
    }
    const load = async () => {
      if (lesson.videoSource === 'UPLOAD') return
      const element = host.current
      if (!element || !lesson.videoUrl) return
      element.replaceChildren()
      const mount = document.createElement('div')
      element.appendChild(mount)
      try {
        if (lesson.videoSource === 'YOUTUBE') {
          await script('https://www.youtube.com/iframe_api', () =>
            Boolean(window.YT?.Player),
          )
          if (disposed) return
          const url = new URL(lesson.videoUrl)
          const id =
            url.hostname === 'youtu.be'
              ? url.pathname.slice(1)
              : (url.searchParams.get('v') ??
                url.pathname.split('/').filter(Boolean).at(-1) ??
                '')
          readyTimer = window.setTimeout(fail, 30000)
          youtube = new window.YT!.Player(mount, {
            videoId: id,
            playerVars: {
              origin: window.location.origin,
              start: Math.floor(initial.current),
              playsinline: 1,
            },
            events: {
              onReady: () => {
                clearTimeout(readyTimer)
                timer = window.setInterval(() => {
                  if (youtube)
                    sample.current?.({
                      position: youtube.getCurrentTime(),
                      duration: youtube.getDuration(),
                      playing: youtube.getPlayerState() === 1,
                    })
                }, 1000)
              },
              onError: fail,
              onStateChange: (event) => {
                if (youtube)
                  sample.current?.({
                    position: youtube.getCurrentTime(),
                    duration: youtube.getDuration(),
                    playing: event.data === 1,
                  })
              },
            },
          })
        } else {
          await script('https://player.vimeo.com/api/player.js', () =>
            Boolean(window.Vimeo?.Player),
          )
          if (disposed) return
          const url = new URL(lesson.videoUrl)
          const parts = url.pathname.split('/').filter(Boolean)
          const index = parts.findIndex((part) => /^\d+$/.test(part))
          if (index < 0) throw new Error('Use a Vimeo video link')
          const hash = url.searchParams.get('h') ?? parts[index + 1]
          const iframe = document.createElement('iframe')
          const parameters = new URLSearchParams({
            dnt: '1',
            playsinline: '1',
          })
          if (hash) parameters.set('h', hash)
          iframe.src = `https://player.vimeo.com/video/${parts[index]}?${parameters}`
          iframe.title = 'Vimeo video'
          iframe.allow =
            'autoplay; fullscreen; picture-in-picture; encrypted-media'
          iframe.allowFullscreen = true
          iframe.referrerPolicy = 'strict-origin-when-cross-origin'
          mount.appendChild(iframe)
          vimeo = new window.Vimeo!.Player(iframe)
          let playing = false
          readyTimer = window.setTimeout(fail, 30000)
          void vimeo
            .ready()
            .then(() => clearTimeout(readyTimer))
            .catch(fail)
          vimeo.on('play', (event) => {
            playing = true
            sample.current?.({
              position: event.seconds,
              duration: event.duration,
              playing: true,
            })
          })
          vimeo.on('pause', (event) => {
            playing = false
            sample.current?.({
              position: event.seconds,
              duration: event.duration,
              playing: false,
            })
          })
          vimeo.on('ended', (event) => {
            playing = false
            sample.current?.({
              position: event.seconds,
              duration: event.duration,
              playing: false,
            })
          })
          vimeo.on('error', fail)
          vimeo.on('timeupdate', (event) =>
            sample.current?.({
              position: event.seconds,
              duration: event.duration,
              playing,
            }),
          )
          if (initial.current > 0) await vimeo.setCurrentTime(initial.current)
        }
      } catch {
        fail()
      }
    }
    void load()
    return () => {
      disposed = true
      clearInterval(timer)
      clearTimeout(readyTimer)
      youtube?.destroy()
      if (vimeo) void vimeo.destroy().catch(() => undefined)
    }
  }, [lesson.id, lesson.videoSource, lesson.videoUrl, sourceKey])
  return (
    <div className="space-y-2">
      {lesson.videoSource === 'UPLOAD' ? (
        <div className="relative overflow-hidden rounded-xl bg-foreground">
          <video
            ref={video}
            key={`${lesson.assetId}:${attempt}`}
            controls={appearance === 'native'}
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-lg bg-muted"
            src={
              lesson.assetId
                ? `/api/v1/module-management/assets/${encodeURIComponent(lesson.assetId)}`
                : undefined
            }
            onLoadedMetadata={(event) => {
              event.currentTarget.currentTime = initial.current
            }}
            onTimeUpdate={(event) => {
              const v = event.currentTarget
              sample.current?.({
                position: v.currentTime,
                duration: v.duration,
                playing: !v.paused && !v.seeking,
              })
            }}
            onPlay={(event) => {
              const v = event.currentTarget
              sample.current?.({
                position: v.currentTime,
                duration: v.duration,
                playing: true,
              })
            }}
            onPause={(event) => {
              const v = event.currentTarget
              sample.current?.({
                position: v.currentTime,
                duration: v.duration,
                playing: false,
              })
            }}
            onEnded={(event) => {
              const v = event.currentTarget
              sample.current?.({
                position: v.currentTime,
                duration: v.duration,
                playing: false,
              })
            }}
            onSeeking={() => {
              if (video.current)
                sample.current?.({
                  position: video.current.currentTime,
                  duration: video.current.duration,
                  playing: false,
                })
            }}
            onError={() => {
              setFailedSource(sourceKey)
              failure.current?.()
            }}
          />
          {appearance === 'lesson' && (
            <LessonVideoControls
              key={`${lesson.assetId}:${attempt}`}
              media={video}
              title={lesson.title}
            />
          )}
        </div>
      ) : (
        <div
          ref={host}
          className="aspect-video w-full overflow-hidden rounded-lg bg-muted [&_iframe]:h-full [&_iframe]:w-full"
        />
      )}
      {error && (
        <div
          role="alert"
          className="rounded border border-destructive p-3 text-destructive"
        >
          <p>
            {vi
              ? 'Không phát được video. Hãy thử lại hoặc báo lỗi nội dung.'
              : 'Video unavailable. Retry or report a content issue.'}
          </p>
          <Button
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {vi ? 'Thử lại' : 'Retry'}
          </Button>
        </div>
      )}
    </div>
  )
}
