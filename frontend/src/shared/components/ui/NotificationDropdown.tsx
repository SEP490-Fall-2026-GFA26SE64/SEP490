import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  moduleRequest,
  type LearningNotification,
} from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { Button } from './Button'
export function NotificationDropdown() {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<LearningNotification[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const root = useRef<HTMLDivElement>(null)
  const load = useCallback(
    () =>
      moduleRequest<LearningNotification[]>('/notifications')
        .then((result) => {
          setItems(result)
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
    void load()
    const timer = setInterval(() => void load(), 60000)
    return () => clearInterval(timer)
  }, [load])
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
          <span className="absolute right-0 top-0 rounded-full bg-primary px-1 text-caption text-primary-foreground">
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
          {items.map((n) => (
            <article
              key={n.id}
              className={`space-y-2 border-b border-border p-2 ${n.readAt ? '' : 'bg-secondary'}`}
            >
              <p className="break-words text-sm font-semibold">{n.title}</p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {n.body}
              </p>
              <Link
                className="text-sm text-primary underline"
                to={
                  n.kind === 'CONTENT_ISSUE'
                    ? `/expert/modules?search=${encodeURIComponent(n.moduleId)}`
                    : `/employee/modules/${encodeURIComponent(n.moduleId)}`
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
          ))}
        </div>
      )}
    </div>
  )
}
