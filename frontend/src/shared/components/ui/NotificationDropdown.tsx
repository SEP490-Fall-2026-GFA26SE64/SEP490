import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  moduleRequest,
  type LearningNotification,
} from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { Button } from './Button'
import { useToast } from '../../hooks/useToast'
import { isVisibleLearningNotification, learningNotificationPresentation } from '../../api/learningNotificationPresentation'
export function NotificationDropdown() {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<LearningNotification[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const root = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const active = useRef(true), flight = useRef(false)
  const observe = useCallback(async (signal: AbortSignal) => {
    if (flight.current) return
    flight.current = true
    try {
      const pending = await moduleRequest<LearningNotification[]>('/notifications/unobserved', 'GET', undefined, signal)
      const shown = new Set<string>()
      for (const n of pending) {
        if (signal.aborted || !active.current) break
        if (!isVisibleLearningNotification(n)) continue
        const claimed = await moduleRequest<boolean>(`/notifications/${n.id}/observed`, 'PUT', undefined, signal)
        if (claimed && !signal.aborted && active.current) {
          const message = learningNotificationPresentation(n, language)
          const key = message.title + '\n' + message.description
          if (!shown.has(key)) { shown.add(key); toast({ title: message.title, description: message.description, variant: message.variant, duration: 6500 }) }
        }
      }
    } catch { /* Persisted events remain available; retry on reconnect/poll. */ }
    finally { flight.current = false }
  }, [toast, language])
  const load = useCallback(
    () =>
      moduleRequest<LearningNotification[]>('/notifications')
        .then((result) => {
          setItems(result.filter(isVisibleLearningNotification))
          setError('')
        })
        .catch((e: unknown) =>
          setError(
            e instanceof Error ? e.message : 'Cannot load notifications',
          ),
        )
        .finally(() => setLoading(false)),
    [],
  )
  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    void load()
    void observe(controller.signal)
    const refresh = () => { void load(); void observe(controller.signal) }
    const timer = setInterval(refresh, 10000)
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    return () => { active.current = false; controller.abort(); clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh) }
  }, [load, observe])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const unread = items.filter((n) => !n.readAt).length
  return (
    <div ref={root} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          vi
            ? `Thông báo (${unread} chưa đọc)`
            : `Notifications (${unread} unread)`
        }
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          if (!open) {
            setLoading(true)
            setError('')
            void load()
          }
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-xs font-semibold leading-none text-destructive-foreground">
            {unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 max-w-[90vw] overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-lg">
          <h2 className="mb-3 font-semibold">
            {vi ? 'Thông báo' : 'Notifications'}
          </h2>
          {loading && <p role="status">{vi ? 'Đang tải…' : 'Loading…'}</p>}
          {error && (
            <div role="alert">
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true)
                  setError('')
                  void load()
                }}
              >
                {vi ? 'Thử lại' : 'Retry'}
              </Button>
            </div>
          )}
          {!loading && !error && !items.length && (
            <p className="text-sm text-muted-foreground">
              {vi ? 'Chưa có thông báo.' : 'No notifications yet.'}
            </p>
          )}
          {items.map((n) => {
            const message = learningNotificationPresentation(n, language)
            return (
            <article
              key={n.id}
              className={`mb-2 space-y-2 rounded-lg border-l-4 p-3 ${message.accent} ${n.readAt ? 'bg-background' : 'bg-muted/40'}`}
            >
              <p className="break-words text-body-sm font-semibold">{message.title}</p>
              <p className="line-clamp-2 break-words text-caption text-muted-foreground">
                {message.description}
              </p>
              <Link
                className="text-sm text-primary underline"
                to={
                  n.deepLink?.startsWith('/employee/') ? n.deepLink : n.kind === 'CONTENT_ISSUE'
                    ? `/expert/modules?search=${encodeURIComponent(n.moduleId ?? '')}`
                    : `/employee/modules/${encodeURIComponent(n.moduleId ?? '')}`
                }
                onClick={() => {
                  void moduleRequest(`/notifications/${n.id}/read`, 'PUT')
                    .then(() => void load())
                    .catch((e: unknown) =>
                      setError(
                        e instanceof Error
                          ? e.message
                          : 'Cannot mark notification read',
                      ),
                    )
                  setOpen(false)
                }}
              >
                {vi ? 'Mở nội dung' : 'Open content'}
              </Link>
            </article>
          )})}
        </div>
      )}
    </div>
  )
}
