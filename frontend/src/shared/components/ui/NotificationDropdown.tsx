import * as React from 'react'
import {
  Bell,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEmployeeLearningState } from '../../hooks/useEmployeeLearningState'
import { Badge } from './Badge'
import { Button } from './Button'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useEmployeeLearningState()

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'role_assigned':
        return (
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Target size={15} />
          </div>
        )
      case 'diagnostic_required':
        return (
          <div className="h-8 w-8 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Sparkles size={15} />
          </div>
        )
      case 'diagnostic_passed':
        return (
          <div className="h-8 w-8 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 size={15} />
          </div>
        )
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <Info size={15} />
          </div>
        )
    }
  }

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          isOpen ? 'bg-muted/80 text-foreground' : ''
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-2xs">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Notifications</span>
              {unreadNotificationCount > 0 && (
                <Badge variant="primary" className="text-[10px] px-1.5 py-0 font-bold">
                  {unreadNotificationCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead()}
                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer"
                  title="Mark all as read"
                >
                  <Check size={12} />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearNotifications()}
                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-semibold text-foreground">All caught up!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No new alerts or target role updates at this time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={`p-3.5 transition-colors text-left flex gap-3 ${
                    notif.isRead ? 'bg-card opacity-80 hover:opacity-100 hover:bg-muted/30' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs leading-snug truncate ${
                          notif.isRead ? 'font-medium text-foreground' : 'font-bold text-foreground'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {notif.actionUrl && notif.actionLabel && (
                      <div className="mt-2.5">
                        <Link
                          to={notif.actionUrl}
                          onClick={() => {
                            markNotificationRead(notif.id)
                            setIsOpen(false)
                          }}
                        >
                          <Button
                            variant={notif.type === 'diagnostic_passed' ? 'outline' : 'primary'}
                            size="sm"
                            className="text-[11px] h-7 px-2.5 font-semibold"
                            rightIcon={<ExternalLink size={11} />}
                          >
                            {notif.actionLabel}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer status notice */}
          <div className="px-4 py-2 bg-muted/20 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>Actor: Employee Workspace</span>
            <span className="flex items-center gap-1 text-primary">
              <Sparkles size={10} /> Live Synced
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
