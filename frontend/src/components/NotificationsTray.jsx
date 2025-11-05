import { useMemo } from 'react'

const ICONS = {
  alert: '⛑',
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
  default: '🔔',
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function NotificationsTray({ notifications, onDismiss }) {
  const items = useMemo(() => notifications ?? [], [notifications])

  if (!items.length) {
    return null
  }

  return (
    <aside className="notifications-tray" aria-live="polite" aria-label="Recent ranch alerts">
      {items.map((notification) => {
        const level = notification.level || notification.type || 'default'
        const icon = ICONS[level] || ICONS.default
        return (
          <div key={notification.id} className={`notification-card ${level}`}>
            <span className="notification-icon" aria-hidden="true">
              {icon}
            </span>
            <div className="notification-content">
              <div className="notification-header">
                <span className="notification-title">{notification.title}</span>
                {notification.timestamp && (
                  <time dateTime={notification.timestamp}>{formatTimestamp(notification.timestamp)}</time>
                )}
              </div>
              {notification.message && <p>{notification.message}</p>}
            </div>
            <button
              type="button"
              className="notification-close"
              onClick={() => onDismiss?.(notification.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )
      })}
    </aside>
  )
}

export default NotificationsTray
