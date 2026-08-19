import { useState } from 'react';
import { updateOrderStatus } from '../api.js';

const FILTERS = [
  { id: 'new',       label: 'New',       statuses: ['pending', 'confirmed'] },
  { id: 'preparing', label: 'Preparing', statuses: ['preparing'] },
  { id: 'ready',     label: 'Ready',     statuses: ['ready'] },
  { id: 'completed', label: 'Completed', statuses: ['delivered'] },
];

const ACTION = {
  pending:   { label: 'Start Preparing', next: 'preparing' },
  confirmed: { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready',      next: 'ready' },
  ready:     { label: 'Complete',        next: 'delivered' },
};

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function TypeBadge({ type }) {
  const t = (type || '').toLowerCase();
  if (!t) return null;
  const isDelivery = t === 'delivery';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
      ${isDelivery ? 'bg-orange-950/60 text-orange-400' : 'bg-green-950/60 text-green-400'}`}>
      {isDelivery ? '🛺' : '🛵'} {isDelivery ? 'Delivery' : 'Pickup'}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   'bg-blue-950/60 text-blue-400',
    confirmed: 'bg-blue-950/60 text-blue-400',
    preparing: 'bg-orange-950/60 text-orange-400',
    ready:     'bg-green-950/60 text-green-400',
    delivered: 'bg-gray-800 text-gray-400',
    cancelled: 'bg-red-950/60 text-red-400',
  };
  const label = {
    pending: 'New', confirmed: 'New', preparing: 'Preparing',
    ready: 'Ready', delivered: 'Completed', cancelled: 'Cancelled',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[status] || 'bg-gray-800 text-gray-400'}`}>
      {label[status] || status}
    </span>
  );
}

function OrderCard({ order, onAdvance, advancing }) {
  const action = ACTION[order.status];
  const customerName = order.customer_name || order.customerName || order.user?.name || null;
  const orderType = order.type || order.order_type || null;

  return (
    <div className="overflow-hidden rounded-2xl bg-[#1e1e1e]">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-white text-[15px]">ORD-{order.id}</span>
            <StatusBadge status={order.status} />
            {orderType && <TypeBadge type={orderType} />}
          </div>
          <span className="shrink-0 text-[#f0b429] text-lg font-black">
            ₱{Number(order.total).toLocaleString()}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-gray-500">
          {customerName || `Customer #${order.userId}`} · {formatTime(order.createdAt)}
        </p>
      </div>

      {/* Items */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-1.5">
        {order.items?.length ? (
          order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-300 truncate">{item.name} × {item.qty}</span>
              {item.price != null && (
                <span className="shrink-0 text-gray-500">
                  ₱{Number(item.price * item.qty).toLocaleString()}
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">—</p>
        )}
      </div>

      {/* Action */}
      {action && (
        <div className="px-4 pb-4 pt-2">
          <button
            type="button"
            disabled={advancing === order.id}
            onClick={() => onAdvance(order.id, action.next)}
            className="w-full rounded-2xl bg-[#f0b429] py-3 text-sm font-bold text-black transition-colors hover:bg-[#e0a820] disabled:opacity-50"
          >
            {advancing === order.id ? 'Updating…' : `${action.label} →`}
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersPage({ token, orders = [], loadingOrders, onOrdersChange }) {
  const [filter, setFilter] = useState('new');
  const [advancing, setAdvancing] = useState(null);

  async function advanceOrder(id, status) {
    setAdvancing(id);
    try {
      const updated = await updateOrderStatus(id, status, token);
      onOrdersChange(orders.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch {
      // keep previous state on error
    } finally {
      setAdvancing(null);
    }
  }

  const activeFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const filtered = orders.filter((o) => activeFilter.statuses.includes(o.status));

  return (
    <div>
      {/* Status filter pills */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => {
          const count = orders.filter((o) => f.statuses.includes(o.status)).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors
                ${active
                  ? 'border-[#f0b429]/40 bg-[#1e1e1e] text-white'
                  : 'border-gray-800 bg-transparent text-gray-600 hover:text-gray-400'}`}
            >
              <span className="text-base font-black">{count}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Order list */}
      {loadingOrders ? (
        <div className="flex h-48 items-center justify-center">
          <i className="fa fa-spinner fa-spin text-3xl text-gray-600"></i>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 p-12 text-center">
          <i className="fa fa-bag-shopping text-4xl text-gray-700"></i>
          <p className="mt-3 text-sm text-gray-600">No {activeFilter.label.toLowerCase()} orders</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={advanceOrder}
              advancing={advancing}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
