import { useState, useEffect, useCallback } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import HomePage from './pages/HomePage.jsx';
import OrdersPage from './pages/LoansPage.jsx';
import StoresPage from './pages/SchedulePage.jsx';
import AddStorePage from './pages/ApplyPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import { fetchAllOrders } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import { playNewOrderSound, playStatusUpdateSound, unlockAudio } from './sound.js';

const SESSION_KEY = 'admin_store_session';

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
function saveSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function buildNotification(order, type) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  if (type === 'new') {
    return {
      id: `notif-${Date.now()}-${order.id}`,
      type: 'order',
      icon: 'fa-bag-shopping',
      color: 'bg-[#f0b429]/15 text-[#f0b429]',
      title: `New Order #ORD-${String(order.id).padStart(3, '0')}`,
      body: `A new order of ₱${Number(order.total).toLocaleString()} was placed.`,
      time: `Just now · ${timeStr}`,
      read: false,
      orderId: order.id,
    };
  }
  return {
    id: `notif-${Date.now()}-${order.id}`,
    type: 'status',
    icon: 'fa-circle-check',
    color: 'bg-blue-500/15 text-blue-400',
    title: `Order #ORD-${String(order.id).padStart(3, '0')} updated`,
    body: `Status changed to ${order.status}.`,
    time: `Just now · ${timeStr}`,
    read: false,
    orderId: order.id,
  };
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [page, setPage] = useState('home');
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Unlock Web Audio on first gesture so sounds work immediately
  useEffect(() => { unlockAudio(); }, []);

  const loadOrders = useCallback(async (token) => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const data = await fetchAllOrders(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // keep previous orders on error
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!session) { setPage('home'); return; }

    loadOrders(session.token);

    const socket = connectSocket(session.token);

    socket.on('order:new', (order) => {
      playNewOrderSound();
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      setNotifications((prev) => [buildNotification(order, 'new'), ...prev]);
    });

    socket.on('order:updated', (order) => {
      playStatusUpdateSound();
      setOrders((prev) => prev.map((o) => o.id === order.id ? order : o));
      setNotifications((prev) => [buildNotification(order, 'updated'), ...prev]);
    });

    return () => {
      socket.off('order:new');
      socket.off('order:updated');
      disconnectSocket();
    };
  }, [session, loadOrders]);

  function handleAuthenticated(payload, email, name) {
    const profile = {
      token: payload.access_token || payload.token || '',
      email,
      name: payload.user?.name || name || email.split('@')[0],
      id: payload.user?.id || null,
      branch_id: payload.user?.branch_id ?? null,
      user_type: payload.user?.user_type || payload.user_type || null,
    };
    saveSession(profile);
    setSession(profile);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setPage('home');
    setOrders([]);
    setNotifications([]);
  }

  function handleOrdersChange(updated) {
    setOrders(updated);
  }

  if (!session) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const unreadAlerts = notifications.filter((n) => !n.read).length;

  const isSuperAdmin = session.branch_id === null || session.branch_id === undefined || session.user_type === 3;
  const isBranchAdmin = session.user_type === 2;

  const navItems = [
    { page: 'home',          label: 'Orders',          icon: 'fa-bag-shopping',   badge: pendingCount },
    { page: 'products',      label: 'Menu',             icon: 'fa-box-open' },
    { page: 'reports',       label: 'Reports',          icon: 'fa-chart-bar' },
    ...(isSuperAdmin ? [{ page: 'stores', label: 'Branches', icon: 'fa-store' }] : []),
    ...(isSuperAdmin ? [{ page: 'users', label: 'Users', icon: 'fa-users' }] : []),
    { page: 'notifications', label: 'Alerts',           icon: 'fa-bell',           badge: unreadAlerts },
    { page: 'profile',       label: 'Profile',          icon: 'fa-user' },
  ];

  function renderPage() {
    switch (page) {
      case 'home':
        return (
          <HomePage
            profile={session}
            pendingCount={pendingCount}
            orders={orders}
            loadingOrders={loadingOrders}
            onNavigate={setPage}
            token={session.token}
            onOrdersChange={handleOrdersChange}
          />
        );
      case 'orders':
        return (
          <OrdersPage
            token={session.token}
            orders={orders}
            loadingOrders={loadingOrders}
            onOrdersChange={handleOrdersChange}
          />
        );
      case 'products':      return <ProductsPage token={session.token} branchId={session.branch_id} userType={session.user_type} />;
      case 'stores':        return <StoresPage token={session.token} />;
      case 'add-store':     return <AddStorePage onNavigate={setPage} />;
      case 'notifications':
        return (
          <NotificationsPage
            notifications={notifications}
            onNotificationsChange={setNotifications}
          />
        );
      case 'reports':       return <ReportsPage orders={orders} />;
      case 'users':         return <UsersPage token={session.token} />;
      case 'profile':       return <ProfilePage profile={session} onLogout={handleLogout} />;
      default:
        return (
          <HomePage
            profile={session}
            pendingCount={pendingCount}
            orders={orders}
            loadingOrders={loadingOrders}
            onNavigate={setPage}
          />
        );
    }
  }

  return (
    <div className="flex min-h-screen bg-[#111111]">
      <Sidebar
        navItems={navItems}
        activePage={page}
        onNavigate={setPage}
        storeName={session.name}
        orders={orders}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-[#161616] md:hidden">
          {/* Store name row */}
          <div className="flex items-center justify-between border-b border-gray-800 px-4 pt-3 pb-2.5">
            <div className="min-w-0">
              <h1 className="truncate font-bold text-white text-sm leading-none">{session.name}</h1>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]"></span>
                <span className="text-[#f0b429] text-xs">
                  Open · {pendingCount} new order{pendingCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-xl border border-gray-700 bg-[#1e1e1e] px-3 py-2 text-xs font-semibold text-gray-300"
            >
              Sign out
            </button>
          </div>
          {/* Scrollable tab bar */}
          <div className="flex overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const active = page === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setPage(item.page)}
                  className={`relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    active ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                  {item.badge > 0 && (
                    <span className="rounded-full bg-[#f0b429] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#f0b429]" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 pb-6 md:px-6 md:py-6 md:pb-6">
          <div className={page === 'home' ? '' : 'mx-auto max-w-5xl'}>
            {renderPage()}
          </div>
        </main>
      </div>

    </div>
  );
}
