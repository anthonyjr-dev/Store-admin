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
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
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
      color: 'bg-orange-100 text-orange-600',
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
    color: 'bg-blue-100 text-blue-600',
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
    { page: 'home',          label: 'Dashboard',     icon: 'fa-house' },
    { page: 'orders',        label: 'Orders',         icon: 'fa-bag-shopping',   badge: pendingCount },
    { page: 'products',      label: 'Products',       icon: 'fa-box-open' },
    ...(isSuperAdmin ? [{ page: 'stores', label: 'Branches', icon: 'fa-store' }] : []),
    ...(isSuperAdmin ? [{ page: 'users', label: 'Users', icon: 'fa-users' }] : []),
    { page: 'notifications', label: 'Alerts',         icon: 'fa-bell',           badge: unreadAlerts },
    { page: 'profile',       label: 'Profile',        icon: 'fa-user' },
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
      case 'products':      return <ProductsPage token={session.token} branchId={session.branch_id} />;
      case 'stores':        return <StoresPage token={session.token} />;
      case 'add-store':     return <AddStorePage onNavigate={setPage} />;
      case 'notifications':
        return (
          <NotificationsPage
            notifications={notifications}
            onNotificationsChange={setNotifications}
          />
        );
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
    <div className="flex min-h-screen">
      <Sidebar navItems={navItems} activePage={page} onNavigate={setPage} storeName={session.name} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-4 py-3 shadow-sm backdrop-blur md:px-8">
          <h1 className="text-lg font-bold text-orange-500 md:hidden">Store Admin</h1>
          <div className="hidden md:block">
            <p className="text-xl font-bold text-slate-800 capitalize">
              {page === 'home' ? 'Dashboard' : page === 'add-store' ? 'Add Branch' : page.charAt(0).toUpperCase() + page.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage('notifications')}
              className="relative rounded-xl p-2 hover:bg-slate-100"
            >
              <i className="fa fa-bell text-slate-600"></i>
              {unreadAlerts > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPage('profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white"
            >
              {(session.name || session.email || 'A')[0].toUpperCase()}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <div className="mx-auto max-w-5xl">
            {renderPage()}
          </div>
        </main>
      </div>

      <BottomNav navItems={navItems} activePage={page} onNavigate={setPage} />
    </div>
  );
}
