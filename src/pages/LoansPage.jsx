import { useState } from 'react';
import { updateOrderStatus } from '../api.js';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

function nextStatus(status) {
  const idx = STATUS_FLOW.indexOf(status);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

function actionLabel(status) {
  const map = { pending: 'Accept', confirmed: 'Start Prep', preparing: 'Mark Ready', ready: 'Delivered' };
  return map[status] || null;
}

function formatOrderId(id) {
  return `#ORD-${String(id).padStart(3, '0')}`;
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onAdvance, onCancel, advancing }) {
  const next = nextStatus(order.status);
  const itemSummary = order.items?.length
    ? order.items.map((i) => `${i.name} x${i.qty}`).join(', ')
    : '—';

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{formatOrderId(order.id)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-slate-500">User #{order.userId}</p>
          <p className="text-xs text-slate-400">{formatTime(order.createdAt)}</p>
        </div>
        <span className="text-xl font-extrabold text-slate-800">₱{Number(order.total).toLocaleString()}</span>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-sm text-slate-700 truncate">{itemSummary}</p>
      </div>
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex gap-2">
          {next && (
            <button
              type="button"
              disabled={advancing === order.id}
              onClick={() => onAdvance(order.id, next)}
              className="flex-1 rounded-2xl bg-orange-500 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {advancing === order.id ? (
                <><i className="fa fa-spinner fa-spin mr-1"></i>Updating…</>
              ) : actionLabel(order.status)}
            </button>
          )}
          <button
            type="button"
            disabled={advancing === order.id}
            onClick={() => onCancel(order.id)}
            className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersPage({ token, orders = [], loadingOrders, onOrdersChange }) {
  const [filter, setFilter] = useState('all');
  const [advancing, setAdvancing] = useState(null);

  const tabs = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  async function advanceOrder(id, status) {
    setAdvancing(id);
    try {
      const updated = await updateOrderStatus(id, status, token);
      onOrdersChange(orders.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
    } catch {
      // silently keep old state on network error
    } finally {
      setAdvancing(null);
    }
  }

  async function cancelOrder(id) {
    setAdvancing(id);
    try {
      const updated = await updateOrderStatus(id, 'cancelled', token);
      onOrdersChange(orders.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
    } catch {
      // silently keep old state on network error
    } finally {
      setAdvancing(null);
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold">Orders</h2>
        <p className="mt-1 text-slate-500">{pendingCount} pending · {orders.length} total</p>
      </div>

      <div className="tab-scroll-container">
        <div className="flex gap-2 w-max">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold capitalize transition whitespace-nowrap
                ${filter === t ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-orange-50'}`}
            >
              {t}
              <span className="ml-1.5 text-xs opacity-60">
                ({t === 'all' ? orders.length : orders.filter((o) => o.status === t).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loadingOrders ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-spinner fa-spin text-4xl"></i>
          <p className="mt-3 font-semibold">Loading orders…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-bag-shopping text-4xl opacity-30"></i>
          <p className="mt-3 font-semibold">No {filter} orders</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={advanceOrder}
              onCancel={cancelOrder}
              advancing={advancing}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
