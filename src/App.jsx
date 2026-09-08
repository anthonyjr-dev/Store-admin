import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchAllOrders, fetchBranches, setUnauthorizedHandler as setApiUnauthorizedHandler } from './api.js';
import GivePointsModal from './components/GivePointsModal.jsx';
import { connectSocket, disconnectSocket, setUnauthorizedHandler as setSocketUnauthorizedHandler } from './socket.js';
import { playNewOrderSound, playStatusUpdateSound, unlockAudio } from './sound.js';
import {
  ADMIN_ALLOWED_PAGES,
  canReceiveKioskOrders,
  isRestrictedAdmin as isRestrictedAdminRole,
  isSuperAdmin as isSuperAdminRole,
} from './roles.js';

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
    const isKiosk = order.type === 'kiosk';
    return {
      id: `notif-${Date.now()}-${order.id}`,
      type: 'order',
      icon: 'fa-bag-shopping',
      color: isKiosk ? 'bg-purple-500/15 text-purple-400' : 'bg-[#f0b429]/15 text-[#f0b429]',
      title: `${isKiosk ? '🖥️ Kiosk ' : ''}New Order #ORD-${String(order.id).padStart(3, '0')}`,
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App crash', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-[360px] bg-[#1c1c1c] rounded-3xl p-7 shadow-2xl">
            <h2 className="text-white text-2xl font-black uppercase tracking-wide mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-4">The dashboard crashed while loading.</p>
            <pre className="text-xs text-red-300 bg-black/40 p-3 rounded-xl mb-5 overflow-auto max-h-48">{String(this.state.error?.message || this.state.error)}</pre>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full bg-[#f0b429] text-black font-black uppercase tracking-[0.15em] rounded-2xl py-4 text-sm"
            >
              Reload
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showGivePoints, setShowGivePoints] = useState(false);

  useEffect(() => { unlockAudio(); }, []);

  const loadOrders = useCallback(async (token, userType) => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const [data, branchData] = await Promise.all([fetchAllOrders(token), fetchBranches()]);
      const all = Array.isArray(data) ? data : [];
      const visible = canReceiveKioskOrders(userType) ? all : all.filter((o) => o.type !== 'kiosk');
      setOrders(visible);
      setBranches(Array.isArray(branchData) ? branchData : []);
    } catch {
      // keep previous orders on error
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const saved = loadSession();
      if (!saved) {
        setReady(true);
        return;
      }

      if (saved.token) {
        try {
          await fetchAllOrders(saved.token);
        } catch {
          clearSession();
          setSession(null);
          setReady(true);
          return;
        }
      }

      if (!cancelled) {
        setSession(saved);
        setReady(true);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session || !ready) return;

    loadOrders(session.token, session.user_type);

    const socket = connectSocket(session.token);

    socket.on('order:new', (order) => {
      if (order.type === 'kiosk' && !canReceiveKioskOrders(session.user_type)) return;
      playNewOrderSound();
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      setNotifications((prev) => [buildNotification(order, 'new'), ...prev]);
    });

    socket.on('order:updated', (order) => {
      if (order.type === 'kiosk' && !canReceiveKioskOrders(session.user_type)) return;
      playStatusUpdateSound();
      setOrders((prev) => prev.map((o) => o.id === order.id ? order : o));
      setNotifications((prev) => [buildNotification(order, 'updated'), ...prev]);
    });

    return () => {
      socket.off('order:new');
      socket.off('order:updated');
      disconnectSocket();
    };
  }, [session, ready, loadOrders]);

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
    setPage('orders');
    setReady(true);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setPage('home');
    setOrders([]);
    setNotifications([]);
    setReady(true);
  }

  const stableLogout = useCallback(() => handleLogout(), [handleLogout]);

  useEffect(() => {
    setApiUnauthorizedHandler(stableLogout);
    setSocketUnauthorizedHandler(stableLogout);
    return () => {
      setApiUnauthorizedHandler(null);
      setSocketUnauthorizedHandler(null);
    };
  }, [stableLogout]);

  function handleOrdersChange(updated) {
    setOrders(updated);
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[360px] text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#f0b429] border-t-transparent animate-spin" />
          <p className="mt-4 text-sm text-gray-400">Restoring session…</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const unreadAlerts = notifications.filter((n) => !n.read).length;

  const isSuperAdmin = isSuperAdminRole(session);
  const restrictedAdmin = isRestrictedAdminRole(session.user_type);

  const allNavItems = [
    { page: 'orders',      label: 'Orders',          icon: 'fa-bag-shopping',   badge: pendingCount },
    { page: 'products',      label: 'Menu',             icon: 'fa-box-open' },
    { page: 'reports',       label: 'Reports',          icon: 'fa-chart-bar' },
    ...(isSuperAdmin ? [{ page: 'stores', label: 'Branches', icon: 'fa-store' }] : []),
    ...(isSuperAdmin ? [{ page: 'users', label: 'Users', icon: 'fa-users' }] : []),
    { page: 'notifications', label: 'Alerts',           icon: 'fa-bell',           badge: unreadAlerts },
    { page: 'profile',       label: 'Profile',          icon: 'fa-user' },
  ];

  // ROLE.ADMIN keeps super-admin data access but only these pages in the nav.
  const navItems = restrictedAdmin
    ? ADMIN_ALLOWED_PAGES
        .map((p) => allNavItems.find((item) => item.page === p))
        .filter(Boolean)
    : allNavItems;

  // Block a restricted admin from rendering a page they can't navigate to.
  const effectivePage =
    restrictedAdmin && !ADMIN_ALLOWED_PAGES.includes(page) ? 'orders' : page;

  function renderPage() {
    switch (effectivePage) {
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
            branches={branches}
          />
        );
      case 'orders':
        return (
          <OrdersPage
            token={session.token}
            orders={orders}
            loadingOrders={loadingOrders}
            onOrdersChange={handleOrdersChange}
            userType={session.user_type}
            canSeeKiosk={canReceiveKioskOrders(session.user_type)}
            branches={branches}
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
        activePage={effectivePage}
        onNavigate={setPage}
        storeName={session.name}
        orders={orders}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-[#161616] md:hidden">
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
          <div className="flex overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const active = effectivePage === item.page;
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

        <main className="flex-1 overflow-y-auto px-3 py-3 pb-4 md:px-4 md:py-4 md:pb-4">
          <div className={effectivePage === 'home' ? '' : 'mx-auto'}>
            {renderPage()}
          </div>
        </main>
      </div>

      {session && (
        <button
          onClick={() => setShowGivePoints(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0b429] text-black shadow-2xl hover:bg-[#e8ac24] active:bg-[#d9a020] transition-colors"
          title="Give Points"
        >
          <i className="fa fa-qrcode text-xl" />
        </button>
      )}

      {showGivePoints && session && (
        <GivePointsModal
          token={session.token}
          onClose={() => setShowGivePoints(false)}
        />
      )}
    </div>
  );
}
