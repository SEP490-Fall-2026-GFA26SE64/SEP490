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
import { PageLoader } from './PageLoader'

type UnifiedNotification =
  | { source: 'learning'; id: string; createdAt: string; readAt: string | null; item: LearningNotification }

export function NotificationDropdown() {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<UnifiedNotification[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const root = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null)
  const readFlight = useRef(new Set<string>()), readFailed = useRef(new Set<string>()), confirmedReads = useRef(new Map<string, string>())
  const loadRevision = useRef(0)
  const [readError, setReadError] = useState(false), [readRetry, setReadRetry] = useState(0)
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
          if (!shown.has(key)) { shown.add(key); toast({ title: message.title, description: message.description, variant: message.variant, duration: 3000 }) }
        }
      }
    } catch { /* Persisted events remain available; retry on reconnect/poll. */ }
    finally { flight.current = false }
  }, [toast, language])
  const load = useCallback(async () => {
    const revision = ++loadRevision.current
    try {
      const learningRes = await moduleRequest<LearningNotification[]>('/notifications')
      if (!active.current || revision !== loadRevision.current) return
      const learningItems: UnifiedNotification[] = (learningRes || [])
        .filter(isVisibleLearningNotification)
        .map(item => ({
          source: 'learning',
          id: `learning:${item.id}`,
          createdAt: item.createdAt,
          readAt: item.readAt || confirmedReads.current.get(`learning:${item.id}`) || null,
          item,
        }))
      const merged = learningItems.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      setItems(merged)
      setError('')
    } catch (e) {
      if (active.current && revision === loadRevision.current) setError(e instanceof Error ? e.message : 'Cannot load notifications')
    } finally { if (active.current && revision === loadRevision.current) setLoading(false) }
  }, [])
  const markRead = useCallback(async (compositeId: string) => {
    if (readFlight.current.has(compositeId) || confirmedReads.current.has(compositeId)) return
    readFlight.current.add(compositeId)
    try {
      const rawId = compositeId.startsWith('learning:') ? compositeId.slice(9) : compositeId
      await moduleRequest(`/notifications/${encodeURIComponent(rawId)}/read`, 'PUT')
      const readAt = new Date().toISOString()
      confirmedReads.current.set(compositeId, readAt); readFailed.current.delete(compositeId)
      if (active.current) {
        setItems(current => current.map(item => item.id === compositeId ? { ...item, readAt } : item))
        setReadError(readFailed.current.size > 0)
      }
    } catch {
      readFailed.current.add(compositeId)
      if (active.current) setReadError(true)
    } finally { readFlight.current.delete(compositeId) }
  }, [])
  useEffect(() => {
    const scroller = list.current
    if (!open || loading || error || !scroller) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.notificationId
        if (entry.isIntersecting && entry.intersectionRatio > 0 && id && !readFailed.current.has(id)) void markRead(id)
      }
    }, { root: scroller, threshold: 0.1 })
    scroller.querySelectorAll('[data-notification-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [open, loading, error, items, markRead, readRetry])
  useEffect(() => {
    const ac = new AbortController()
    active.current = true
    void load()
    void observe(ac.signal)
    const interval = setInterval(() => { void load(); void observe(ac.signal) }, 10000)
    return () => { active.current = false; ac.abort(); clearInterval(interval) }
  }, [load, observe])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
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
            readFailed.current.clear(); setReadError(false)
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
        <div ref={list} className="absolute right-0 z-50 mt-2 max-h-96 w-80 max-w-[90vw] overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-lg">
          <h2 className="mb-3 font-semibold">
            {vi ? 'Thông báo' : 'Notifications'}
          </h2>
          {loading && <PageLoader size="sm" label={vi ? 'Đang tải…' : 'Loading…'} />}
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
          {readError && <div role="alert" className="mb-3 space-y-2"><p className="text-body-sm text-destructive">{vi ? 'Chưa lưu được trạng thái đã đọc.' : 'Could not save read status.'}</p><Button variant="outline" size="sm" onClick={() => { readFailed.current.clear(); setReadError(false); setReadRetry(value => value + 1) }}>{vi ? 'Thử lại' : 'Retry'}</Button></div>}
          {!loading && items.map((entry) => {
            const n = entry.item
            const message = learningNotificationPresentation(n, language)
            return (
              <article
                key={entry.id}
                data-notification-id={entry.id}
                className={`mb-2 space-y-2 rounded-lg border-l-4 p-3 ${message.accent} ${entry.readAt ? 'bg-background' : 'bg-muted/40'}`}
              >
                {(n.kind.startsWith('REVIEW_') || /(?:APPROVED|REJECTED|REQUESTED)$/.test(n.kind)) && <span className="inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{vi ? 'Quan trọng' : 'Important'}</span>}<p className="break-words text-body-sm font-semibold">{message.title}</p>
                <p className="break-words text-caption text-muted-foreground">
                  {message.description}
                </p>
                <Link
                  className="text-sm text-primary underline"
                  to={
                    n.deepLink && /^\/(employee\/|expert\/(?:certificates(?:\?|$)|pathway-review\/[0-9a-f-]{36}$)|ld-manager\/(?:certificates|modules|question-bank)(?:\?|$))/.test(n.deepLink) ? n.deepLink : n.kind === 'CONTENT_ISSUE'
                      ? `/expert/modules?search=${encodeURIComponent(n.moduleId ?? '')}`
                      : `/employee/modules/${encodeURIComponent(n.moduleId ?? '')}`
                  }
                  onClick={() => {
                    void markRead(entry.id)
                    setOpen(false)
                  }}
                >
                  {vi ? 'Mở nội dung' : 'Open content'}
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
