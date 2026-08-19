function BottomNav({ navItems, activePage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t border-gray-800 bg-[#161616] py-2 md:hidden">
      {navItems.map((item) => {
        const active = activePage === item.page;
        return (
          <button
            key={item.page}
            type="button"
            onClick={() => onNavigate(item.page)}
            className={`flex flex-col items-center px-2 text-xs transition-colors ${active ? 'text-[#f0b429]' : 'text-gray-600'}`}
          >
            <span className="relative">
              <i className={`fa ${item.icon} text-xl`}></i>
              {item.badge > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#f0b429] text-[10px] font-bold text-black">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="mt-0.5 leading-none">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
