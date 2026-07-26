function BottomNav({ navItems, activePage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white py-2 md:hidden">
      {navItems.map((item) => (
        <button
          key={item.page}
          type="button"
          className={`flex flex-col items-center px-2 text-xs ${activePage === item.page ? 'text-orange-500' : 'text-gray-400'}`}
          onClick={() => onNavigate(item.page)}
        >
          <span className="relative">
            <i className={`fa ${item.icon} text-xl`}></i>
            {item.badge > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </span>
          <span className="mt-0.5">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
