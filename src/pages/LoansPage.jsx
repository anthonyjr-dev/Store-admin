import { useEffect, useRef, useState } from 'react';
import { updateOrderStatus, confirmOrderPayment } from '../api.js';

const CAN_CANCEL = [1, 3];

const FILTERS = [
  { id: 'new',       label: 'New',       statuses: ['pending', 'confirmed'] },
  { id: 'preparing', label: 'Preparing', statuses: ['preparing'] },
  { id: 'ready',     label: 'Ready',     statuses: ['ready', 'picked_up'] },
  { id: 'completed', label: 'Completed', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

const ACTION = {
  pending:   { label: 'Start Preparing',   next: 'preparing' },
  confirmed: { label: 'Start Preparing',   next: 'preparing' },
  preparing: { label: 'Mark Ready',        next: 'ready' },
  ready:     { label: 'Picked Up', next: 'picked_up' },
  picked_up: { label: 'Complete',          next: 'delivered' },
};

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function KioskBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-950/60 px-2 py-0.5 text-[11px] font-medium text-purple-400">
      🖥️ Kiosk
    </span>
  );
}

function TypeBadge({ type, branchName }) {
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


function UnpaidBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 border border-red-800/50 px-2 py-0.5 text-[11px] font-bold text-red-400">
      Unpaid
    </span>
  );
}

function StatusBadge({ status, paymentConfirmed, paymentMethod }) {
  const map = {
    pending:   'bg-blue-950/60 text-blue-400',
    confirmed: 'bg-blue-950/60 text-blue-400',
    preparing: 'bg-orange-950/60 text-orange-400',
    ready:     'bg-green-950/60 text-green-400',
    picked_up: 'bg-teal-950/60 text-teal-400',
    delivered: 'bg-gray-800 text-gray-400',
    cancelled: 'bg-red-950/60 text-red-400',
  };
  const label = {
    pending: 'New', confirmed: 'New', preparing: 'Preparing',
    ready: 'Ready', picked_up: 'Picked Up', delivered: 'Completed', cancelled: 'Cancelled',
  };
  return (
    <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (map[status] || 'bg-gray-800 text-gray-400')}>
      {label[status] || status}
      {paymentConfirmed && (
        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-green-950/60 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
          ✓ {paymentMethod === 'maya' ? 'Maya (paid)' : 'Paid'}
        </span>
      )}
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
      {/* temperature hidden */}
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

function CancelModal({ onProceed, onClose, loading }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-[#1e1e1e] border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h3 className="font-bold text-white text-base">Cancel Order</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#252525] text-gray-400 hover:text-white transition">
            <i className="fa fa-xmark text-xs"></i>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-400">Optionally add a reason for cancellation. This will be visible to the customer.</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Item out of stock, store closing soon…"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-700 bg-[#252525] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-red-500/60 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 border-t border-gray-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-700 py-3 text-sm font-semibold text-gray-300 hover:bg-[#252525] transition"
          >
            Close
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onProceed(notes)}
            className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? 'Cancelling…' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
}


function ImageLightbox({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const lastDist = useRef(null);
  const lastTap = useRef(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const zoom = (delta) => setScale((s) => Math.min(Math.max(s + delta, 1), 6));

  const handleWheel = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.2 : -0.2); };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current !== null) zoom((dist - lastDist.current) / 120);
      lastDist.current = dist;
    }
  };

  const handleTouchEnd = () => { lastDist.current = null; };

  const handleImgClick = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) setScale((s) => (s > 1 ? 1 : 2.5));
    lastTap.current = now;
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget && scale <= 1) onClose(); }}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition text-lg"
      >
        <i className="fa fa-xmark" />
      </button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <button
          onClick={() => zoom(-0.5)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <i className="fa fa-minus text-sm" />
        </button>
        <span className="text-white/60 text-xs w-14 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => zoom(0.5)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <i className="fa fa-plus text-sm" />
        </button>
        {scale > 1 && (
          <button
            onClick={() => setScale(1)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20 transition"
          >
            Reset
          </button>
        )}
      </div>
      <div className="overflow-auto max-w-full max-h-full flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
        <img
          src={src}
          alt="Payment proof"
          onClick={handleImgClick}
          style={{
            transform: `scale(${scale})`,
            transition: 'transform 0.15s ease',
            cursor: scale > 1 ? 'zoom-out' : 'zoom-in',
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 8,
            userSelect: 'none',
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  );
}

function OrderCard({ order, onAdvance, onCancel, confirming, canceling, advanceOrder, cancelOrder, userType, confirmPayment, confirmingPayment, advancing, branches = [] }) {
  const expanded = true;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const action = (order.status === 'ready' && order.delivery_type === 'pickup') ? { label: 'Complete', next: 'delivered' } : ACTION[order.status];
  const isKiosk = order.type === 'kiosk';
  const customerName = isKiosk
    ? order.guest_name
    : (order.customer_name || order.customerName || order.user?.name || null);
  const canCancel = CAN_CANCEL.includes(userType);
  const isPickedUpByRider = order.status === 'picked_up';
  const paymentConfirmed = !!order.payment_confirmed;
  const paymentMethod = order.payment_method || order.paymentMethod || null;
  const branchName = order.branch_id ? (branches.find((b) => b.id === order.branch_id)?.name ?? null) : null;
  const isUnpaid = !!paymentMethod && !paymentConfirmed && order.status !== 'cancelled' && order.status !== 'delivered';
  const [lightboxImg, setLightboxImg] = useState(null);

  return (
    <>
    <div className={'overflow-hidden rounded-2xl ' + (isKiosk ? 'bg-[#1a1525] border border-purple-900/40' : 'bg-[#1e1e1e]')}>
      <div className="w-full p-4 pb-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-white text-[15px]">ORD-{order.id}</span>
            <StatusBadge status={order.status} paymentConfirmed={paymentConfirmed} paymentMethod={paymentMethod} />
            {isKiosk && <KioskBadge />}{order.delivery_type && <TypeBadge type={order.delivery_type} branchName={branchName} />}{isUnpaid && <UnpaidBadge />}
            {isPickedUpByRider && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-950/60 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                🛵 Picked up by rider
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[#f0b429] text-lg font-black">
              ₱{Number(order.total).toLocaleString()}
            </span>

          </div>
        </div>
        <p className="mt-1.5 text-sm text-gray-500">
          {customerName || `Customer #${order.userId}`} · {formatTime(order.createdAt)}
          {order.scheduled_date ? (
            <span className="ml-2 text-gray-400">
              · 📅 {order.scheduled_date}
              {order.scheduled_time ? ` · ${order.scheduled_time}` : ''}
            </span>
          ) : null}
        </p>
        {/* Kiosk guest details */}
        {isKiosk && expanded && (
          <div className="mt-2 space-y-1 rounded-xl bg-purple-950/20 border border-purple-900/30 px-3 py-2">
            {order.guest_phone && (
              <p className="text-[12px] text-purple-300">
                <i className="fa fa-phone mr-1.5 text-purple-500"></i>{order.guest_phone}
              </p>
            )}
            {order.guest_address && (
              <p className="text-[12px] text-purple-300">
                <i className="fa fa-location-dot mr-1.5 text-purple-500"></i>{order.guest_address}
              </p>
            )}
          </div>
        )}

        {/* Payment proof */}
        {expanded && !paymentConfirmed && paymentMethod && ['qrph', 'bank', 'bank_transfer', 'cash'].includes(paymentMethod.toLowerCase()) && (
          <div className="mt-2 rounded-xl bg-[#252525] border border-gray-800 px-3 py-2">
            <p className="text-[10px] font-bold text-cream-muted uppercase tracking-widest mb-1.5">Payment Proof</p>
            {order.payment_proof_url ? (
              <img src={order.payment_proof_url} alt="proof" onClick={() => setLightboxImg(order.payment_proof_url)} className="w-full max-h-56 object-contain rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity" />
            ) : (
              <p className="text-xs text-gray-600 italic">No proof uploaded yet</p>
            )}
          </div>
        )}
      </div>

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
        {order.store_notes && (
          <div className="flex items-start gap-2 rounded-xl bg-red-950/20 border border-red-900/30 px-3 py-2">
            <i className="fa fa-circle-info text-red-400 mt-0.5 shrink-0"></i>
            <p className="text-[12px] text-red-300">{order.store_notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4 pt-2">
        {canCancel && order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button
            type="button"
            disabled={canceling === order.id}
            onClick={() => setShowCancelModal(true)}
            className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {canceling === order.id ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
        {!paymentConfirmed && paymentMethod && ['qrph', 'bank', 'bank_transfer', 'cash'].includes(paymentMethod.toLowerCase()) && (
          <button
            type="button"
            disabled={confirmingPayment === order.id}
            onClick={() => confirmPayment(order.id)}
            className="flex-1 rounded-2xl bg-green-600 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {confirmingPayment === order.id ? 'Confirming…' : '✓ Confirm Payment'}
          </button>
        )}
        {action && !(action.next === 'preparing' && isUnpaid) && (
          <button
            type="button"
            disabled={advancing === order.id}
            onClick={() => onAdvance(order.id, action.next)}
            className="flex-1 rounded-2xl bg-[#f0b429] py-3 text-sm font-bold text-black transition-colors hover:bg-[#e0a820] disabled:opacity-50"
          >
            {advancing === order.id ? 'Updating…' : `${action.label} →`}
          </button>
        )}
        {!action && !canCancel && !confirmPayment && (
          <div className="flex-1 rounded-2xl bg-[#252525] py-3 text-center text-sm text-gray-500">
            —
          </div>
        )}
      </div>
    </div>
    {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}
    {showCancelModal && (
      <CancelModal
        loading={canceling === order.id}
        onClose={() => setShowCancelModal(false)}
        onProceed={(notes) => {
          setShowCancelModal(false);
          onCancel && onCancel(order.id, notes);
        }}
      />
    )}
    </>
  );
}

function OrdersPage({ token, orders = [], loadingOrders, onOrdersChange, userType, canSeeKiosk, branches = [] }) {
  const [filter, setFilter] = useState('new');
  const [kioskOnly, setKioskOnly] = useState(false);
  const [advancing, setAdvancing] = useState(null);
  const [canceling, setCanceling] = useState(null);
  const [confirmingPayment, setConfirmingPayment] = useState(null);

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

  async function cancelOrder(id, notes) {
    setCanceling(id);
    try {
      const updated = await updateOrderStatus(id, 'cancelled', token, notes || undefined);
      onOrdersChange(orders.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch {
      // keep previous state on error
    } finally {
      setCanceling(null);
    }
  }

  async function confirmPayment(id) {
    setConfirmingPayment(id);
    try {
      const updated = await confirmOrderPayment(id, token);
      onOrdersChange(orders.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch {
      // keep previous state on error
    } finally {
      setConfirmingPayment(null);
    }
  }

  const activeFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];

  // Base filter by status, then optionally by kiosk
  const filtered = orders
    .filter((o) => activeFilter.statuses.includes(o.status))
    .filter((o) => kioskOnly ? o.type === 'kiosk' : true);

  const kioskCount = orders.filter((o) => o.type === 'kiosk' && activeFilter.statuses.includes(o.status)).length;

  const COLUMN_ACCENT = {
    new:       'bg-blue-500',
    preparing: 'bg-orange-500',
    ready:     'bg-green-500',
    completed: 'bg-gray-500',
    cancelled: 'bg-red-500',
  };

  return (
    <div>
      {/* ── Mobile: tab filter + list ── */}
      <div className="md:hidden">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

        {canSeeKiosk && kioskCount > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setKioskOnly((v) => !v)}
              className={'flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors ' +
                (kioskOnly
                  ? 'border-purple-700/60 bg-purple-950/30 text-purple-300'
                  : 'border-gray-800 text-gray-500 hover:text-gray-400')}
            >
              🖥️ Kiosk Orders
              <span className="rounded-full bg-purple-800/50 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                {kioskCount}
              </span>
            </button>
          </div>
        )}

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
          <div className="flex flex-col gap-3">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAdvance={advanceOrder}
                onCancel={cancelOrder}
                canceling={canceling}
                advancing={advancing}
                confirmingPayment={confirmingPayment}
                confirmPayment={confirmPayment}
                userType={userType}
                branches={branches}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop: Kanban board ── */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
        {loadingOrders ? (
          <div className="flex flex-1 h-48 items-center justify-center">
            <i className="fa fa-spinner fa-spin text-3xl text-gray-600"></i>
          </div>
        ) : (
          FILTERS.map((col) => {
            const colOrders = orders
              .filter((o) => col.statuses.includes(o.status))
              .filter((o) => kioskOnly ? o.type === 'kiosk' : true);
            return (
              <div key={col.id} style={{ width: 288, flexShrink: 0, height: 'calc(100vh - 110px)' }}>
                {/* Column header */}
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-3 py-2.5">
                  <span className={'h-2 w-2 rounded-full shrink-0 ' + (COLUMN_ACCENT[col.id] || 'bg-gray-500')} />
                  <span className="flex-1 text-sm font-bold text-gray-200">{col.label}</span>
                  <span className="rounded-full bg-[#252525] px-2 py-0.5 text-xs font-bold text-gray-400">
                    {colOrders.length}
                  </span>
                </div>
                {/* Cards — independently scrollable, takes remaining column height */}
                <div style={{ height: 'calc(100% - 58px)', overflowY: 'auto', paddingRight: 4, paddingBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {colOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-800 py-8 text-center">
                        <p className="text-xs text-gray-700">No orders</p>
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onAdvance={advanceOrder}
                          onCancel={cancelOrder}
                          canceling={canceling}
                          advancing={advancing}
                          confirmingPayment={confirmingPayment}
                          confirmPayment={confirmPayment}
                          userType={userType}
                          branches={branches}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
