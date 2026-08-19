function Sidebar({ navItems, activePage, onNavigate, storeName, orders = [], pendingCount = 0, onLogout }) {
  const today = new Date();
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.toDateString() === today.toDateString();
  });
  const todayRevenue = todayOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);
  const completedToday = todayOrders.filter((o) => o.status === 'delivered').length;
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <aside className="hidden min-h-screen w-[272px] shrink-0 flex-col bg-[#161616] border-r border-gray-800 px-5 py-6 md:flex">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0b429] text-black font-black text-lg leading-none">
          ›
        </div>
        <div className="min-w-0">
          <p className="text-[#f0b429] text-[11px] font-black uppercase tracking-[0.18em] leading-none">BFC Merchant</p>
          <p className="text-gray-500 text-xs mt-0.5">Portal</p>
        </div>
      </div>

      {/* Branch */}
      <div className="mb-6 pb-6 border-b border-gray-800">
        <p className="font-bold text-white text-sm truncate">{storeName || 'Branch Portal'}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#4ade80]"></span>
          <span className="text-[#f0b429] text-xs truncate">
            Open · {pendingCount} new order{pendingCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const active = activePage === item.page;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors
                ${active ? 'bg-[#f0b429] text-[#111]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <i className={`fa ${item.icon} w-4 shrink-0 text-center text-base`}></i>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge > 0 && (
                <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold
                  ${active ? 'bg-black/20 text-[#111]' : 'bg-[#f0b429] text-black'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TODAY */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Today</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Revenue', value: `₱${todayRevenue.toLocaleString()}`, color: 'text-[#f0b429]' },
            { label: 'Orders',  value: String(todayOrders.length),            color: 'text-white' },
            { label: 'Done',    value: String(completedToday),                color: 'text-[#4ade80]' },
            { label: 'Active',  value: String(activeOrders),                  color: 'text-[#60a5fa]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-[#1e1e1e] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">{label}</p>
              <p className={`mt-0.5 text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={onLogout}
        className="mt-5 text-left text-sm text-gray-600 transition-colors hover:text-gray-300"
      >
        Sign out →
      </button>
    </aside>
  );
}

export default Sidebar;
