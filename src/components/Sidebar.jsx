function Sidebar({ navItems, activePage, onNavigate, storeName }) {
  return (
    <aside className="hidden min-h-screen w-64 flex-col bg-gradient-to-b from-gray-900 to-gray-800 p-6 text-white md:flex">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-orange-400">Store Admin</h1>
        <p className="mt-0.5 text-sm text-gray-400 truncate">{storeName || 'Platform Dashboard'}</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.page}
            type="button"
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors
              ${activePage === item.page
                ? 'bg-orange-500 text-white'
                : 'text-gray-300 hover:bg-white/10'}`}
            onClick={() => onNavigate(item.page)}
          >
            <i className={`fa ${item.icon} w-4 text-center`}></i>
            {item.label}
            {item.badge > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
