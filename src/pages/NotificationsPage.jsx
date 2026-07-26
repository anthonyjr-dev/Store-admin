function AlertItem({ alert, onRead }) {
  return (
    <button
      type="button"
      onClick={() => onRead(alert.id)}
      className={`w-full text-left flex items-start gap-4 rounded-2xl border p-4 transition
        ${alert.read ? 'border-slate-100 bg-white' : 'border-orange-100 bg-orange-50'}`}
    >
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.color}`}>
        <i className={`fa ${alert.icon}`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-800 truncate">{alert.title}</p>
          {!alert.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500"></span>}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{alert.body}</p>
        <p className="mt-1 text-xs text-slate-400">{alert.time}</p>
      </div>
    </button>
  );
}

function NotificationsPage({ notifications = [], onNotificationsChange }) {
  function markRead(id) {
    onNotificationsChange((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }

  function markAllRead() {
    onNotificationsChange((prev) => prev.map((a) => ({ ...a, read: true })));
  }

  function clearAll() {
    onNotificationsChange([]);
  }

  const unreadCount = notifications.filter((a) => !a.read).length;

  return (
    <section className="space-y-6">
      <div className="card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="mt-1 text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-sm font-semibold text-orange-500 hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-semibold text-slate-400 hover:text-slate-600 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-bell text-4xl opacity-20"></i>
          <p className="mt-3 font-semibold">No notifications yet</p>
          <p className="mt-1 text-sm">Real-time alerts will appear here when orders arrive or change status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onRead={markRead} />
          ))}
        </div>
      )}
    </section>
  );
}

export default NotificationsPage;
