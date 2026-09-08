import { useEffect, useState } from 'react';
import { bookLalamoveApi, cancelLalamoveApi, getLalamoveStatusApi } from '../lalamove';

const STATUS_LABEL = {
  ASSIGNING_DRIVER: 'Finding driver...',
  ON_GOING: 'Driver on the way',
  PICKED_UP: 'Order picked up',
  COMPLETED: 'Delivered',
  CANCELED: 'Cancelled',
  REJECTED: 'No driver found',
};

const STATUS_COLOR = {
  ASSIGNING_DRIVER: 'text-yellow-400',
  ON_GOING: 'text-blue-400',
  PICKED_UP: 'text-blue-500',
  COMPLETED: 'text-green-400',
  CANCELED: 'text-red-400',
  REJECTED: 'text-red-500',
};

const ACTIVE_STATUSES = ['ASSIGNING_DRIVER', 'ON_GOING', 'PICKED_UP'];

export default function LalamoveBookingModal({ order, onClose }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [serviceType, setServiceType] = useState('MOTORCYCLE');

  useEffect(() => {
    getLalamoveStatusApi(order.id).then(setBooking).catch(() => {});
  }, [order.id]);

  useEffect(() => {
    if (!booking || !ACTIVE_STATUSES.includes(booking.status)) return;
    const interval = setInterval(async () => {
      try { setBooking(await getLalamoveStatusApi(order.id)); } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [booking, order.id]);

  const handleBook = async () => {
    setError(''); setLoading(true);
    try { setBooking(await bookLalamoveApi(order.id, { serviceType })); }
    catch (err) { setError(err?.response?.data?.message ?? 'Booking failed. Check STORE_LAT/STORE_LNG in .env.'); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this Lalamove delivery?')) return;
    setCancelling(true);
    try { await cancelLalamoveApi(order.id); setBooking((b) => ({ ...b, status: 'CANCELED' })); }
    catch (err) { setError(err?.response?.data?.message ?? 'Cancel failed.'); }
    finally { setCancelling(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lalamove Delivery</h2>
            <p className="text-sm text-gray-500">Order #{order.id} · {order.guest_name}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition">✕</button>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Delivery Address</p>
          <p className="text-gray-800 dark:text-gray-200">{order.guest_address || '—'}</p>
          {order.guest_phone && <p className="text-gray-500 text-xs mt-1">{order.guest_phone}</p>}
        </div>

        {booking ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</span>
                <span className={`text-sm font-bold ${STATUS_COLOR[booking.status] ?? 'text-gray-500'}`}>{STATUS_LABEL[booking.status] ?? booking.status}</span>
              </div>
              {booking.fee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Delivery fee</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">₱{Number(booking.fee).toFixed(2)}</span>
                </div>
              )}
              {booking.driver && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Driver</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{booking.driver.name}</p>
                  <p className="text-xs text-gray-500">{booking.driver.phone} · {booking.driver.plate}</p>
                </div>
              )}
              {booking.shareLink && <a href={booking.shareLink} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-blue-500 hover:underline">Track on Lalamove ↗</a>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => getLalamoveStatusApi(order.id).then(setBooking).catch(() => {})} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Refresh</button>
              {ACTIVE_STATUSES.includes(booking.status) && (
                <button onClick={handleCancel} disabled={cancelling} className="flex-1 rounded-xl border border-red-300 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition disabled:opacity-50">{cancelling ? 'Cancelling...' : 'Cancel Delivery'}</button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Vehicle Type</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition">
                <option value="MOTORCYCLE">Motorcycle</option>
                <option value="MPV">MPV / Van</option>
                <option value="SEDAN">Sedan</option>
              </select>
            </div>
            {error && <p className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button onClick={handleBook} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3.5 text-base font-black text-white hover:bg-orange-600 active:scale-[0.98] transition disabled:opacity-60">
              {loading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Booking...</> : '🛵 Book Lalamove Delivery'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
