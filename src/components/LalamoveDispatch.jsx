import React, { useCallback, useEffect, useState } from 'react';
import { lalamoveGet, lalamoveDispatch, lalamoveCancel, lalamoveSimulate } from '../api.js';

// TEMPORARY test controls — fake a rider progressing (sandbox never assigns one).
// Remove this array to hide the SIM row.
const SIM_STEPS = [
  ['assigned', 'Accept'],
  ['picked_up', 'Picked up'],
  ['completed', 'Delivered'],
];

const ACTIVE = ['ASSIGNING_DRIVER', 'ON_GOING', 'PICKED_UP'];
const PILL = {
  ASSIGNING_DRIVER: 'bg-amber-950/60 text-amber-300',
  ON_GOING: 'bg-blue-950/60 text-blue-300',
  PICKED_UP: 'bg-teal-950/60 text-teal-300',
  COMPLETED: 'bg-green-950/60 text-green-300',
  CANCELED: 'bg-red-950/60 text-red-300',
  REJECTED: 'bg-red-950/60 text-red-300',
  EXPIRED: 'bg-gray-800 text-gray-400',
};
const LABEL = {
  ASSIGNING_DRIVER: 'Finding rider…',
  ON_GOING: 'Rider on the way',
  PICKED_UP: 'Picked up',
  COMPLETED: 'Delivered',
  CANCELED: 'Rider cancelled',
  REJECTED: 'Rider rejected',
  EXPIRED: 'Quote expired',
};

export default function LalamoveDispatch({ order, token }) {
  const [data, setData] = useState(undefined); // undefined = loading, null = none
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await lalamoveGet(order.id, token);
      setData(d ?? null);
    } catch (e) {
      setData(null);
      setErr(e.message);
    }
  }, [order.id, token]);

  useEffect(() => {
    load();
  }, [load, order.status]);

  if (order.delivery_type !== 'delivery') return null;

  const status = data?.status;
  const isActive = ACTIVE.includes(status);
  const booked = !!data?.lalamoveOrderId;

  async function dispatch() {
    setBusy(true);
    setErr(null);
    try {
      await lalamoveDispatch(order.id, token);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setErr(null);
    try {
      await lalamoveCancel(order.id, token);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function sim(event) {
    setBusy(true);
    setErr(null);
    try {
      await lalamoveSimulate(order.id, event, token);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-[#161616] border border-gray-800 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <i className="fa fa-motorcycle mr-1.5"></i>Lalamove
        </p>
        {status && (
          <span className={'rounded-full px-2 py-0.5 text-[11px] font-medium ' + (PILL[status] || 'bg-gray-800 text-gray-400')}>
            {LABEL[status] || status}
          </span>
        )}
      </div>

      {data === undefined ? (
        <p className="mt-1 text-xs text-gray-600">Checking…</p>
      ) : !booked ? (
        <div className="mt-2">
          <button
            type="button"
            disabled={busy || order.status !== 'ready'}
            onClick={dispatch}
            className="w-full rounded-xl bg-[#f0b429] py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#d9a020] disabled:opacity-40"
          >
            {busy ? 'Dispatching…' : 'Dispatch Rider'}
          </button>
          {order.status !== 'ready' && (
            <p className="mt-1 text-[11px] text-gray-600">
              Available once the order is <span className="text-gray-400">Ready</span>.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {data.priceTotal != null && (
            <p className="text-[12px] text-gray-400">
              Fee: ₱{Number(data.priceTotal).toLocaleString()} {data.currency}
            </p>
          )}
          {data.driver?.name && (
            <p className="text-[12px] text-gray-300">
              <i className="fa fa-user mr-1.5 text-gray-500"></i>
              {data.driver.name}
              {data.driver.plate ? ` · ${data.driver.plate}` : ''}
              {data.driver.phone ? ` · ${data.driver.phone}` : ''}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {data.shareLink && (
              <a
                href={data.shareLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl bg-[#252525] py-2 text-center text-xs font-bold text-gray-200 hover:bg-[#303030]"
              >
                Track
              </a>
            )}
            {isActive && (
              <button
                type="button"
                disabled={busy}
                onClick={cancel}
                className="flex-1 rounded-xl bg-red-900/70 py-2 text-xs font-bold text-red-200 hover:bg-red-900 disabled:opacity-40"
              >
                {busy ? 'Cancelling…' : 'Cancel Rider'}
              </button>
            )}
          </div>

          {/* TEMPORARY: simulate rider progression */}
          {status !== 'COMPLETED' && status !== 'CANCELED' && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-800/70 mt-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">sim</span>
              {SIM_STEPS.map(([ev, label]) => (
                <button
                  key={ev}
                  type="button"
                  disabled={busy}
                  onClick={() => sim(ev)}
                  className="rounded-lg bg-[#232323] px-2 py-1 text-[10px] font-bold text-gray-400 hover:bg-[#2e2e2e] hover:text-gray-200 disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-1.5 text-[11px] text-red-400">{err}</p>}
    </div>
  );
}
