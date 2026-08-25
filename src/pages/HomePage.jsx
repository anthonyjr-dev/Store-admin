import { useState } from 'react';
import { updateOrderStatus } from '../api.js';

const COLUMNS = [
  { id: 'new',       label: 'New',       dot: '#60a5fa', badgeCls: 'bg-blue-500',   statuses: ['pending', 'confirmed'] },
  { id: 'preparing', label: 'Preparing', dot: '#f97316', badgeCls: 'bg-orange-500', statuses: ['preparing'] },
  { id: 'ready',     label: 'Ready',     dot: '#4ade80', badgeCls: 'bg-green-500',  statuses: ['ready'] },
  { id: 'completed', label: 'Completed', dot: '#6b7280', badgeCls: 'bg-gray-500',   statuses: ['delivered'] },
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
          <i className={`fa mr-1 text-gray-600 ${(temp + '').toLowerCase().includes('hot') ? 'fa-fire' : 'fa-snowflake'}`}></i>{temp}
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

function OrderCard({ order, onAdvance, advancing }) {
  const [expanded, setExpanded] = useState(false);
  const action = ACTION[order.status];
  const customerName = order.customer_name || order.customerName || order.user?.name || null;
  const orderType = order.type || order.order_type || null;

  return (
    <div className="overflow-hidden rounded-2xl bg-[#1e1e1e]">
      {/* Card header — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 pb-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-white text-[15px]">ORD-{order.id}</span>
            {orderType && <TypeBadge type={orderType} />}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[#f0b429] text-lg font-black">
              ₱{Number(order.total).toLocaleString()}
            </span>
            <i className={`fa fa-chevron-down text-xs text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}></i>
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

      {/* Action button */}
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

function KanbanColumn({ column, orders, onAdvance, advancing }) {
  const colOrders = orders.filter((o) => column.statuses.includes(o.status));
  return (
    <div className="flex min-w-0 flex-col">
      {/* Column header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.dot }}></span>
        <span className="font-bold text-white">{column.label}</span>
        <span className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${column.badgeCls}`}>
          {colOrders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {colOrders.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 p-6 text-center text-sm text-gray-700">
            No orders
          </div>
        ) : (
          colOrders.map((o) => (
            <OrderCard key={o.id} order={o} onAdvance={onAdvance} advancing={advancing} />
          ))
        )}
      </div>
    </div>
  );
}

function HomePage({ profile, pendingCount, orders = [], loadingOrders, token, onOrdersChange }) {
  const [advancing, setAdvancing] = useState(null);
  const [mobileCol, setMobileCol] = useState('new');

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.toDateString() === new Date().toDateString();
  });

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

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  if (loadingOrders) {
    return (
      <div className="flex h-64 items-center justify-center">
        <i className="fa fa-spinner fa-spin text-3xl text-gray-600"></i>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop header */}
      <div className="mb-6 hidden items-start justify-between md:flex">
        <div>
          <h1 className="text-3xl font-bold text-white">Order Board</h1>
          <p className="mt-1 text-gray-500">{todayOrders.length} total orders today</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{dateStr} · {timeStr}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-green-950/60 px-3 py-1.5 text-sm font-semibold text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400"></span>
            Open
          </span>
        </div>
      </div>

      {/* Desktop kanban — 4 columns */}
      <div className="hidden grid-cols-4 gap-5 md:grid">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            orders={orders}
            onAdvance={advanceOrder}
            advancing={advancing}
          />
        ))}
      </div>

      {/* Mobile — tab switcher */}
      <div className="md:hidden">
        {/* Column tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {COLUMNS.map((col) => {
            const count = orders.filter((o) => col.statuses.includes(o.status)).length;
            const active = mobileCol === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setMobileCol(col.id)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors
                  ${active
                    ? 'border-[#f0b429]/40 bg-[#1e1e1e] text-white'
                    : 'border-gray-800 bg-transparent text-gray-600'}`}
              >
                <span className="text-base font-black">{count}</span>
                <span>{col.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active column orders */}
        <div className="mt-3 flex flex-col gap-3">
          {(() => {
            const col = COLUMNS.find((c) => c.id === mobileCol);
            const colOrders = orders.filter((o) => col.statuses.includes(o.status));
            if (!colOrders.length) {
              return (
                <div className="rounded-2xl border border-gray-800 p-10 text-center text-sm text-gray-700">
                  No {col.label.toLowerCase()} orders
                </div>
              );
            }
            return colOrders.map((o) => (
              <OrderCard key={o.id} order={o} onAdvance={advanceOrder} advancing={advancing} />
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
