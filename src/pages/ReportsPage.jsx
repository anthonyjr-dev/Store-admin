import { useState, useMemo } from 'react';

const RANGES = [
  { id: 'today',     label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7days',     label: '7 Days' },
  { id: '30days',    label: '30 Days' },
];

function startOf(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function filterByRange(orders, range) {
  const now   = new Date();
  const today = startOf(now);
  switch (range) {
    case 'today':
      return orders.filter((o) => new Date(o.createdAt) >= today);
    case 'yesterday': {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      return orders.filter((o) => { const d = new Date(o.createdAt); return d >= yest && d < today; });
    }
    case '7days': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return orders.filter((o) => new Date(o.createdAt) >= s);
    }
    case '30days': {
      const s = new Date(today); s.setDate(s.getDate() - 29);
      return orders.filter((o) => new Date(o.createdAt) >= s);
    }
    default: return orders;
  }
}

function fmt(n) {
  return Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({ label, value, color }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-800">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ReportsPage({ orders = [] }) {
  const [range, setRange] = useState('today');

  const filtered = useMemo(() => filterByRange(orders, range), [orders, range]);

  // ── Core stats ──────────────────────────────────────────
  const revenue      = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalOrders  = filtered.length;
  const avgOrder     = totalOrders > 0 ? revenue / totalOrders : 0;
  const completed    = filtered.filter((o) => o.status === 'delivered').length;
  const completionPct = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;

  // ── Order types ──────────────────────────────────────────
  const pickupCount   = filtered.filter((o) => (o.type || o.order_type || '').toLowerCase() !== 'delivery').length;
  const deliveryCount = filtered.filter((o) => (o.type || o.order_type || '').toLowerCase() === 'delivery').length;
  const pickupPct     = totalOrders > 0 ? Math.round((pickupCount   / totalOrders) * 100) : 0;
  const deliveryPct   = totalOrders > 0 ? Math.round((deliveryCount / totalOrders) * 100) : 0;

  // ── Status breakdown ─────────────────────────────────────
  const statusCounts = {
    'New':       filtered.filter((o) => ['pending','confirmed'].includes(o.status)).length,
    'Preparing': filtered.filter((o) => o.status === 'preparing').length,
    'Ready':     filtered.filter((o) => o.status === 'ready').length,
    'Completed': completed,
  };
  const statusColors = {
    'New': 'bg-blue-500', 'Preparing': 'bg-orange-500', 'Ready': 'bg-green-500', 'Completed': 'bg-gray-500',
  };
  const statusTextColors = {
    'New': 'text-blue-400', 'Preparing': 'text-orange-400', 'Ready': 'text-green-400', 'Completed': 'text-gray-400',
  };

  // ── Hourly chart (today / yesterday) ────────────────────
  const showHourly = range === 'today' || range === 'yesterday';
  const hourly = useMemo(() => {
    const arr = Array(24).fill(0);
    if (showHourly) filtered.forEach((o) => { arr[new Date(o.createdAt).getHours()]++; });
    return arr;
  }, [filtered, showHourly]);
  const maxHourly = Math.max(...hourly, 1);

  // ── Daily chart (7 / 30 days) ────────────────────────────
  const showDaily = range === '7days' || range === '30days';
  const dailyData = useMemo(() => {
    if (!showDaily) return [];
    const map = {};
    filtered.forEach((o) => {
      const key = new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      if (!map[key]) map[key] = { revenue: 0, orders: 0 };
      map[key].revenue += Number(o.total || 0);
      map[key].orders++;
    });
    const days = range === '7days' ? 7 : 30;
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(startOf(now)); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      result.push({ key, ...(map[key] || { revenue: 0, orders: 0 }) });
    }
    return result;
  }, [filtered, showDaily, range]);
  const maxDailyRev = Math.max(...dailyData.map((d) => d.revenue), 1);

  // ── Top selling items ────────────────────────────────────
  const itemMap = {};
  filtered.forEach((o) => {
    (o.items || []).forEach((item) => {
      const k = item.name || 'Unknown';
      if (!itemMap[k]) itemMap[k] = { qty: 0, revenue: 0 };
      itemMap[k].qty     += Number(item.qty   || 1);
      itemMap[k].revenue += Number(item.price || 0) * Number(item.qty || 1);
    });
  });
  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);
  const maxItemQty = topItems.length > 0 ? topItems[0][1].qty : 1;

  // ── Recent orders ────────────────────────────────────────
  const recent = [...filtered]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const nowStr = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  const STATUS_LABEL = { pending: 'New', confirmed: 'New', preparing: 'Preparing', ready: 'Ready', delivered: 'Completed' };
  const STATUS_CLS   = { pending: 'bg-blue-500/15 text-blue-400', confirmed: 'bg-blue-500/15 text-blue-400', preparing: 'bg-orange-500/15 text-orange-400', ready: 'bg-green-500/15 text-green-400', delivered: 'bg-gray-800 text-gray-400' };

  return (
    <section className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports &amp; Analytics</h2>
          <p className="mt-0.5 text-sm text-gray-500">Performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-600 md:block">{nowStr}</span>
          <span className="flex items-center gap-1.5 rounded-full border border-green-800 bg-green-950/60 px-3 py-1 text-sm font-semibold text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />Open
          </span>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              range === r.id
                ? 'bg-[#f0b429] text-black'
                : 'border border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Revenue"        value={`₱${fmt(revenue)}`}           color="text-[#f0b429]" />
        <StatCard label="Total Orders"   value={totalOrders}                   color="text-[#60a5fa]" />
        <StatCard label="Avg Order"      value={`₱${fmt(Math.round(avgOrder))}`} color="text-[#4ade80]" />
        <StatCard label="Completion Rate" value={`${completionPct}%`}          color="text-[#f0b429]" />
      </div>

      {/* Order Types + Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Order Types */}
        <div className="card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Order Types</p>
          {totalOrders === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">No orders in this period</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-green-950/50 p-5">
                  <p className="text-3xl font-black text-white">{pickupCount}</p>
                  <p className="mt-1 text-sm text-gray-400">Pickup</p>
                  <p className="mt-1 text-sm font-bold text-green-400">{pickupPct}%</p>
                  <MiniBar pct={pickupPct} color="bg-green-500" />
                </div>
                <div className="rounded-2xl bg-[#f0b429]/10 p-5">
                  <p className="text-3xl font-black text-white">{deliveryCount}</p>
                  <p className="mt-1 text-sm text-gray-400">Delivery</p>
                  <p className="mt-1 text-sm font-bold text-[#f0b429]">{deliveryPct}%</p>
                  <MiniBar pct={deliveryPct} color="bg-[#f0b429]" />
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">{completed} completed · {totalOrders - completed} active</p>
            </>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Order Status</p>
          {totalOrders === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">No orders in this period</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([label, count]) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-semibold ${statusTextColors[label]}`}>{label}</span>
                      <span className="text-gray-400">{count} <span className="text-gray-600 text-xs">({pct}%)</span></span>
                    </div>
                    <MiniBar pct={pct} color={statusColors[label]} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hourly Chart */}
      {showHourly && (
        <div className="card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            Orders by Hour — {range === 'today' ? 'Today' : 'Yesterday'}
          </p>
          {totalOrders === 0 ? (
            <p className="py-4 text-center text-sm text-gray-600">No orders in this period</p>
          ) : (
            <div className="flex items-end gap-1 overflow-x-auto scrollbar-hide pb-1" style={{ height: 96 }}>
              {hourly.map((count, h) => {
                const barH = Math.round((count / maxHourly) * 80);
                const isActive = count > 0;
                return (
                  <div key={h} className="group relative flex flex-1 min-w-[20px] flex-col items-center justify-end" style={{ height: 96 }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${isActive ? 'bg-[#f0b429]' : 'bg-gray-800'}`}
                      style={{ height: count > 0 ? `${barH}px` : '4px' }}
                    />
                    {count > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#f0b429] opacity-0 group-hover:opacity-100">
                        {count}
                      </span>
                    )}
                    {(h % 3 === 0) && (
                      <span className="mt-1 text-[9px] text-gray-600">{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h-12}p`}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Daily Revenue Chart */}
      {showDaily && (
        <div className="card p-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            Daily Revenue — {range === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
          </p>
          <p className="mb-4 text-sm text-gray-600">Total: ₱{fmt(revenue)}</p>
          {totalOrders === 0 ? (
            <p className="py-4 text-center text-sm text-gray-600">No orders in this period</p>
          ) : (
            <div className={`flex items-end gap-1 overflow-x-auto scrollbar-hide pb-1 ${range === '30days' ? 'gap-0.5' : 'gap-2'}`} style={{ height: 100 }}>
              {dailyData.map((d) => {
                const barH = Math.round((d.revenue / maxDailyRev) * 80);
                return (
                  <div key={d.key} className="group relative flex flex-1 min-w-[18px] flex-col items-center justify-end" style={{ height: 100 }}>
                    <div
                      className={`w-full rounded-t-md ${d.revenue > 0 ? 'bg-[#f0b429]' : 'bg-gray-800'}`}
                      style={{ height: d.revenue > 0 ? `${barH}px` : '4px' }}
                    />
                    {d.revenue > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center whitespace-nowrap rounded-lg bg-[#252525] border border-gray-700 px-2 py-1 text-[10px] z-10">
                        <span className="font-bold text-[#f0b429]">₱{fmt(d.revenue)}</span>
                        <span className="text-gray-500">{d.orders} order{d.orders !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {range === '7days' && (
                      <span className="mt-1 text-[9px] text-gray-600 text-center leading-tight">{d.key}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Top Selling Items + Recent Orders */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Top Selling Items */}
        <div className="card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Top Selling Items</p>
          {topItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">No sales data</p>
          ) : (
            <div>
              {topItems.map(([name, data], i) => {
                const pct = Math.round((data.qty / maxItemQty) * 100);
                return (
                  <div key={name}>
                    <div className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 w-5 text-xs text-gray-600">#{i + 1}</span>
                          <span className="truncate text-sm font-semibold text-white">{name}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-bold text-[#f0b429]">{data.qty} sold</span>
                          {data.revenue > 0 && (
                            <p className="text-xs text-gray-600">₱{fmt(data.revenue)}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-gray-800">
                        <div className="h-1 rounded-full bg-[#f0b429]/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {i < topItems.length - 1 && (
                      <div className={`h-px ${i === 0 ? 'bg-[#f0b429]/30' : 'bg-gray-800'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Recent Orders</p>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">No orders in this period</p>
          ) : (
            <div className="space-y-2">
              {recent.map((o) => {
                const orderType = (o.type || o.order_type || '').toLowerCase();
                const time = new Date(o.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                const date = new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
                return (
                  <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#252525] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">ORD-{String(o.id).padStart(3,'0')}</p>
                      <p className="text-xs text-gray-600">{date} · {time} · {orderType === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[#f0b429]">₱{fmt(o.total)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[o.status] || 'bg-gray-800 text-gray-400'}`}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
