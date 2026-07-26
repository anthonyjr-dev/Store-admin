const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <i className={`fa ${icon} text-white`}></i>
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <h3 className="mt-1 text-3xl font-extrabold text-slate-800">{value}</h3>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function OrderRow({ order, onNavigate }) {
  const itemSummary = order.items?.length
    ? order.items.map((i) => `${i.name} x${i.qty}`).join(', ')
    : '—';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">
            #ORD-{String(order.id).padStart(3, '0')}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-500 truncate">User #{order.userId}</p>
        <p className="text-xs text-slate-400 truncate">{itemSummary}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-800">₱{Number(order.total).toLocaleString()}</span>
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="rounded-xl bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-100"
        >
          Manage
        </button>
      </div>
    </div>
  );
}

function HomePage({ profile, pendingCount, orders = [], loadingOrders, onNavigate }) {
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const todayRevenue = todayOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);

  const recentPending = orders.filter((o) => o.status === 'pending').slice(0, 3);

  const stats = [
    { icon: 'fa-clock',        label: 'Pending Orders',   value: pendingCount,                       sub: 'Needs attention',      color: 'bg-amber-500' },
    { icon: 'fa-bag-shopping', label: "Today's Orders",   value: todayOrders.length,                 sub: `${orders.length} total`, color: 'bg-orange-500' },
    { icon: 'fa-peso-sign',    label: "Today's Revenue",  value: `₱${todayRevenue.toLocaleString()}`, sub: 'Confirmed orders',     color: 'bg-emerald-500' },
    { icon: 'fa-list',         label: 'Total Orders',     value: orders.length,                      sub: 'All time',             color: 'bg-blue-500' },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] bg-gradient-to-r from-gray-900 to-gray-700 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">Welcome back</p>
            <h2 className="text-2xl font-extrabold">{profile.name || 'Admin'}</h2>
            <p className="mt-1 text-sm text-gray-400">{profile.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Today</p>
            <p className="text-sm font-semibold text-orange-400">
              {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold hover:bg-orange-600"
          >
            <i className="fa fa-bell mr-2"></i>View Orders
          </button>
          <button
            type="button"
            onClick={() => onNavigate('stores')}
            className="rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-bold hover:bg-white/20"
          >
            <i className="fa fa-store mr-2"></i>Manage Branches
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Pending Orders</h3>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="text-sm font-semibold text-orange-500 hover:underline"
          >
            View all →
          </button>
        </div>
        {loadingOrders ? (
          <div className="py-8 text-center text-slate-400">
            <i className="fa fa-spinner fa-spin text-2xl"></i>
            <p className="mt-2 text-sm">Loading orders…</p>
          </div>
        ) : recentPending.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <i className="fa fa-check-circle text-3xl opacity-30"></i>
            <p className="mt-2 text-sm">No pending orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPending.map((order) => (
              <OrderRow key={order.id} order={order} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: 'fa-plus',      label: 'Add Branch',  page: 'stores' },
            { icon: 'fa-list-check', label: 'All Orders', page: 'orders' },
            { icon: 'fa-bell',      label: 'Alerts',      page: 'notifications' },
            { icon: 'fa-user',      label: 'Profile',     page: 'profile' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.page)}
              className="card flex flex-col items-center p-5 transition hover:shadow-md"
            >
              <i className={`fa ${item.icon} text-2xl text-orange-500`}></i>
              <p className="mt-2 text-sm font-medium text-slate-700">{item.label}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomePage;
