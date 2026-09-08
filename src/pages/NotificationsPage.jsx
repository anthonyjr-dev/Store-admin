function AlertItem({ alert, onRead }) {
  return (
    <button
      type="button"
      onClick={() => onRead(alert.id)}
      className={`w-full text-left flex items-start gap-4 rounded-2xl border p-4 transition
        ${alert.read
          ? 'border-gray-800 bg-[#1e1e1e]'
          : 'border-[#f0b429]/20 bg-[#f0b429]/5'}`}
    >
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.color}`}>
        <i className={`fa ${alert.icon}`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-white">{alert.title}</p>
          {!alert.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f0b429]"></span>}
        </div>
        <p className="mt-0.5 text-sm text-gray-500">{alert.body}</p>
        <p className="mt-1 text-xs text-gray-600">{alert.time}</p>
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
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          <p className="mt-1 text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead}
                className="text-sm font-semibold text-[#f0b429] hover:underline">
                Mark all read
              </button>
            )}
            <button type="button" onClick={clearAll}
              className="text-sm font-semibold text-gray-600 hover:text-gray-400 hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa fa-bell text-4xl text-gray-700"></i>
          <p className="mt-3 font-semibold text-gray-500">No notifications yet</p>
          <p className="mt-1 text-sm text-gray-600">Real-time alerts will appear here when orders arrive or change status.</p>
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
