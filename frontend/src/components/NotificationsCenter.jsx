import { useMemo } from 'react'

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function NotificationsCenter({
  notifications,
  open,
  unreadCount,
  onToggle,
  onClear,
  onClearAll,
}) {
  const items = useMemo(() => notifications ?? [], [notifications])
  const hasItems = items.length > 0

  return (
    <div className={`notifications-center ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="notifications-trigger"
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? 'Hide notifications' : 'Show notifications'}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notifications-count" aria-hidden="true">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notifications-panel" role="dialog" aria-label="Notification history">
          <header className="notifications-panel-header">
            <h2>Alerts</h2>
            {hasItems && (
              <button type="button" className="notifications-clear-all" onClick={onClearAll}>
                Clear all
              </button>
            )}
          </header>
          <div className="notifications-panel-body">
            {!hasItems ? (
              <p className="notifications-empty">You&rsquo;re all caught up.</p>
            ) : (
              items.map((notification) => {
                const tone = notification.level || notification.type || 'info'
                return (
                  <article key={notification.id} className={`notifications-panel-item ${tone}`}>
                    <header>
                      <span className="item-title">{notification.title}</span>
                      {notification.timestamp && (
                        <time dateTime={notification.timestamp}>{formatTimestamp(notification.timestamp)}</time>
                      )}
                    </header>
                    {notification.message && <p>{notification.message}</p>}
                    <button
                      type="button"
                      className="notifications-panel-dismiss"
                      onClick={() => onClear?.(notification.id)}
                    >
                      Clear
                    </button>
                  </article>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsCenter
