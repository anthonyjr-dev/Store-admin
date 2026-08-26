import { useState } from 'react';
import { updateOrderStatus } from '../api.js';

// Users with user_type 1 (admin) or 3 (superadmin) can cancel orders
const CAN_CANCEL = [1, 3];

const FILTERS = [
  { id: 'new',       label: 'New',       statuses: ['pending', 'confirmed'] },
  { id: 'preparing', label: 'Preparing', statuses: ['preparing'] },
  { id: 'ready',     label: 'Ready',     statuses: ['ready'] },
  { id: 'completed', label: 'Completed', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
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
    <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ' +
      (isDelivery ? 'bg-orange-950/60 text-orange-400' : 'bg-green-950/60 text-green-400')}>
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
    <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (map[status] || 'bg-gray-800 text-gray-400')}>
      {label[status] || status}
    </span>
  );
}

function ItemDetails({ item }) {
  const size  = item.size;
  const temp  = item.temperature || item.temp;
  const sugar = item.sugar_level ?? item.sugarLevel ?? item.sugar;
  const notes = item.notes || item.instructions || item.additional_instructions || item.special_instructions;

  const hasDetails = size || temp || sugar != null || notes;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {!hasDetails && (
        <span className="text-[11px] text-gray-700 italic">No customizations</span>
      )}
      {size && (
        <span className="rounded-lg bg-[#252525] px-2 py-0.5 text-[11px] text-gray-400">
          <i className="fa fa-cup-straw mr-1 text-gray-600"></i>{size}
        </span>
      )}
      {temp && (
        <span className="rounded-lg bg-[#252525] px-2 py-0.5 text-[11px] text-gray-400">
          <i className={'fa mr-1 text-gray-600 ' + ((String(temp) + '').toLowerCase().includes('hot') ? 'fa-fire' : 'fa-snowflake')}></i>{temp}
        </span>
      )}
      {sugar != null && (
        <span className="rounded-lg bg-[#252525] px-2 py-0.5 text-[11px] text-gray-400">
          <i className="fa fa-droplet mr-1 text-gray-600"></i>Sugar {sugar}{typeof sugar === 'number' && sugar <= 100 ? '%' : ''}
        </span>
      )}
      {notes && (
        <span className="w-full rounded-lg bg-[#252525] px-2 py-1 text-[11px] text-amber-400/80 italic">
          <i className="fa fa-comment-dots mr-1 not-italic"></i>{notes}
        </span>
      )}
    </div>
  );
}

function OrderCard({ order, onAdvance, onCancel, advancing, canceling, userType }) {
  const [expanded, setExpanded] = useState(false);
  const action = ACTION[order.status];
  const customerName = order.customer_name || order.customerName || order.user?.name || null;
  const orderType = order.type || order.order_type || null;
  const canCancel = CAN_CANCEL.includes(userType);

  return (
    <div className="overflow-hidden rounded-2xl bg-[#1e1e1e]">
      {/* Header — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 pb-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-white text-[15px]">ORD-{order.id}</span>
            <StatusBadge status={order.status} />
            {orderType && <TypeBadge type={orderType} />}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[#f0b429] text-lg font-black">
              ₱{Number(order.total).toLocaleString()}
            </span>
            <i className={'fa fa-chevron-down text-xs text-gray-600 transition-transform duration-200 ' + (expanded ? 'rotate-180' : '')}></i>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-gray-500">
          {customerName || `Customer #${order.userId}`} · {formatTime(order.createdAt)}
        </p>
      </button>

      {/* Items */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-3">
        {order.items?.length ? (
          order.items.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-300 truncate font-medium">{item.name} × {item.qty}</span>
                {item.price != null && (
                  <span className="shrink-0 text-gray-500">
                    ₱{Number(item.price * item.qty).toLocaleString()}
                  </span>
                )}
              </div>
              {expanded && <ItemDetails item={item} />}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">—</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        {/* Cancel/Void button - only for admin/superadmin */}
        {canCancel && order.status !== 'cancelled' && (
          <button
            type="button"
            disabled={canceling === order.id}
            onClick={() => onCancel && onCancel(order.id)}
            className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {canceling === order.id ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
        {/* Status advance button */}
        {action && (
          <button
            type="button"
            disabled={advancing === order.id}
            onClick={() => onAdvance(order.id, action.next)}
            className="flex-1 rounded-2xl bg-[#f0b429] py-3 text-sm font-bold text-black transition-colors hover:bg-[#e0a820] disabled:opacity-50"
          >
            {advancing === order.id ? 'Updating…' : `${action.label} →`}
          </button>
        )}
        {/* Only show cancel button when no action available */}
        {!action && !canCancel && (
          <div className="flex-1 rounded-2xl bg-[#252525] py-3 text-center text-sm text-gray-500">
            —
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersPage({ token, orders = [], loadingOrders, onOrdersChange, userType }) {
  const [filter, setFilter] = useState('new');
  const [advancing, setAdvancing] = useState(null);
  const [canceling, setCanceling] = useState(null);

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

  async function cancelOrder(id) {
    setCanceling(id);
    try {
      const updated = await updateOrderStatus(id, 'cancelled', token);
      onOrdersChange(orders.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch {
      // keep previous state on error
    } finally {
      setCanceling(null);
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
              className={'flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors ' +
                (active
                  ? 'border-[#f0b429]/40 bg-[#1e1e1e] text-white'
                  : 'border-gray-800 bg-transparent text-gray-600 hover:text-gray-400')}
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
              onCancel={cancelOrder}
              canceling={canceling}
              advancing={advancing}
              userType={userType}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
