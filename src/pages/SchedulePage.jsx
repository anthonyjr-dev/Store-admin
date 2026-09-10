import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchStores, fetchBranches, createBranch, updateBranch, deleteBranch } from '../api.js';
import { geoSearch, geoReverse } from '../googleGeo.js';

// Custom gold pin icon (avoids bundler issues with Leaflet's default icon)
const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 42" width="28" height="42">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 28 14 28S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#f0b429" stroke="#c8941f" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="#fff"/>
  </svg>`,
  className: '',
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -42],
});

// Geocoding via Google Maps Platform (Geocoding API).
const nominatimSearch = (query) => geoSearch(query);
const nominatimReverse = (lat, lng) => geoReverse(lat, lng);

function LocationPickerModal({ initialLat, initialLng, initialAddress, onConfirm, onClose }) {
  const mapDivRef = useRef(null);
  const leafletRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [pickedAddress, setPickedAddress] = useState(initialAddress || '');
  const [pickedLat, setPickedLat] = useState(initialLat || null);
  const [pickedLng, setPickedLng] = useState(initialLng || null);

  const DEFAULT_LAT = 14.5995;
  const DEFAULT_LNG = 120.9842;

  const placeMarker = useCallback((lat, lng) => {
    const map = leafletRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: PIN_ICON, draggable: true }).addTo(map);
      markerRef.current.on('dragend', async (e) => {
        const { lat: dLat, lng: dLng } = e.target.getLatLng();
        setPickedLat(dLat);
        setPickedLng(dLng);
        setReversing(true);
        try {
          const data = await nominatimReverse(dLat, dLng);
          setPickedAddress(data.display_name || '');
        } catch { /* keep previous */ }
        finally { setReversing(false); }
      });
    }
    setPickedLat(lat);
    setPickedLng(lng);
  }, []);

  useEffect(() => {
    const startLat = initialLat || DEFAULT_LAT;
    const startLng = initialLng || DEFAULT_LNG;
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([startLat, startLng], initialLat ? 16 : 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (initialLat && initialLng) placeMarker(initialLat, initialLng);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      setReversing(true);
      setSearchResults([]);
      try {
        const data = await nominatimReverse(lat, lng);
        setPickedAddress(data.display_name || '');
      } catch { /* keep previous */ }
      finally { setReversing(false); }
    });

    leafletRef.current = map;
    return () => { map.remove(); leafletRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(e) {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await nominatimSearch(q);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 500);
  }

  function selectResult(result) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    placeMarker(lat, lng);
    setPickedAddress(result.display_name);
    setSearchQuery('');
    setSearchResults([]);
    leafletRef.current?.setView([lat, lng], 16);
  }

  function handleConfirm() {
    onConfirm({ address: pickedAddress, lat: pickedLat, lng: pickedLng });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#111111]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 bg-[#161616] px-4 py-3">
        <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/8">
          <i className="fa fa-arrow-left text-gray-400"></i>
        </button>
        <h3 className="flex-1 text-base font-bold text-white">Pin Location</h3>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!pickedLat}
          className="rounded-2xl bg-[#f0b429] px-5 py-2 text-sm font-bold text-black disabled:opacity-40"
        >
          Confirm
        </button>
      </div>

      {/* Search bar */}
      <div className="relative z-10 border-b border-gray-800 bg-[#161616] px-4 py-2">
        <div className="relative">
          <i className="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          {searching && (
            <i className="fa fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for a place…"
            className="w-full rounded-2xl border border-gray-700 bg-[#252525] py-2.5 pl-9 pr-9 text-sm text-white placeholder-gray-600 outline-none focus:border-[#f0b429]"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 overflow-hidden rounded-2xl border border-gray-700 bg-[#1c1c1c] shadow-2xl">
            {searchResults.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => selectResult(r)}
                className="flex w-full items-start gap-2 border-b border-gray-800 px-4 py-3 text-left last:border-b-0 hover:bg-white/5"
              >
                <i className="fa fa-location-dot mt-0.5 shrink-0 text-[#f0b429]"></i>
                <span className="text-sm text-gray-200 line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={mapDivRef} className="h-full w-full" />
        {!pickedLat && (
          <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-2xl bg-black/70 px-4 py-2 text-sm text-gray-300 backdrop-blur-sm">
            Tap the map to pin a location
          </div>
        )}
      </div>

      {/* Address preview */}
      <div className="border-t border-gray-800 bg-[#161616] px-4 py-3">
        {reversing ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <i className="fa fa-spinner fa-spin"></i> Getting address…
          </div>
        ) : pickedAddress ? (
          <div className="flex items-start gap-2">
            <i className="fa fa-location-dot mt-0.5 shrink-0 text-[#f0b429]"></i>
            <p className="text-sm text-gray-200 leading-snug">{pickedAddress}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No location selected</p>
        )}
      </div>
    </div>
  );
}

const emptyForm = { store_id: '', name: '', address: '', phone: '', active: true, lat: null, lng: null };

const INPUT = 'mt-1 w-full rounded-2xl border border-gray-700 bg-[#252525] px-4 py-2.5 text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20';

function BranchModal({ initial, stores, onSave, onClose, saving, saveError }) {
  const [form, setForm] = useState(
    initial
      ? {
          store_id: String(initial.store_id),
          name: initial.name,
          address: initial.address || '',
          phone: initial.phone || '',
          active: initial.active,
          lat: initial.lat ?? null,
          lng: initial.lng ?? null,
        }
      : { ...emptyForm, store_id: stores[0]?.id ? String(stores[0].id) : '' }
  );
  const [showMap, setShowMap] = useState(false);

  function update(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleLocationConfirm({ address, lat, lng }) {
    setForm((f) => ({ ...f, address, lat, lng }));
    setShowMap(false);
  }

  function submit(e) {
    e.preventDefault();
    onSave({ ...form, store_id: parseInt(form.store_id) });
  }

  return (
    <>
      {showMap && (
        <LocationPickerModal
          initialLat={form.lat}
          initialLng={form.lng}
          initialAddress={form.address}
          onConfirm={handleLocationConfirm}
          onClose={() => setShowMap(false)}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-md rounded-3xl bg-[#1c1c1c] border border-gray-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">{initial ? 'Edit Branch' : 'Add Branch'}</h3>
            <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/8">
              <i className="fa fa-xmark text-gray-400"></i>
            </button>
          </div>
          {saveError && (
            <div className="mb-4 rounded-2xl border border-red-900/50 bg-red-950/50 p-3 text-sm text-red-400">{saveError}</div>
          )}
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold text-gray-300">
              Store
              <select name="store_id" value={form.store_id} onChange={update} required className={INPUT}>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-300">
              Branch Name
              <input name="name" required value={form.name} onChange={update}
                placeholder="e.g. But First Coffee – Makati" className={INPUT} />
            </label>

            {/* Address with pin button */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300">Address</span>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-700 px-3 py-1 text-xs font-semibold text-[#f0b429] hover:bg-[#f0b429]/10 transition"
                >
                  <i className="fa fa-location-crosshairs"></i>
                  {form.lat ? 'Change Pin' : 'Pin on Map'}
                </button>
              </div>
              <input
                name="address"
                value={form.address}
                onChange={(e) => {
                  update(e);
                  // Clear coordinates if user edits address manually
                  setForm((f) => ({ ...f, address: e.target.value, lat: null, lng: null }));
                }}
                placeholder="Full address"
                className={INPUT}
              />
              {form.lat && form.lng && (
                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                  <i className="fa fa-location-dot text-[#f0b429]"></i>
                  {Number(form.lat).toFixed(6)}, {Number(form.lng).toFixed(6)}
                </p>
              )}
            </div>

            <label className="block text-sm font-semibold text-gray-300">
              Phone
              <input name="phone" value={form.phone} onChange={update}
                placeholder="+63 9xx xxx xxxx" className={INPUT} />
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-300">
              <input type="checkbox" name="active" checked={form.active} onChange={update}
                className="h-4 w-4 rounded accent-[#f0b429]" />
              Active / Open
            </label>
            <button type="submit" disabled={saving}
              className="w-full rounded-2xl bg-[#f0b429] py-3 font-bold text-black disabled:opacity-50">
              {saving ? <><i className="fa fa-spinner fa-spin mr-2"></i>Saving…</> : (initial ? 'Save Changes' : 'Add Branch')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function BranchCard({ branch, storeName, onEdit, onDelete, onToggle, updating }) {
  return (
    <div className={`card p-5 space-y-3 transition-opacity ${!branch.active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-bold text-white">{branch.name}</h4>
          <p className="text-xs font-medium text-[#f0b429]">{storeName}</p>
          {branch.address && <p className="mt-1 break-words text-sm text-gray-500">{branch.address}</p>}
          {branch.lat && branch.lng && (
            <a
              href={`https://www.google.com/maps?q=${branch.lat},${branch.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-[#f0b429] hover:underline"
            >
              <i className="fa fa-location-dot"></i> View on map
            </a>
          )}
          {branch.phone && <p className="text-xs text-gray-600"><i className="fa fa-phone mr-1"></i>{branch.phone}</p>}
        </div>
        <button type="button" onClick={() => onToggle(branch)} disabled={updating === branch.id}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50
            ${branch.active ? 'bg-green-950/60 text-green-400' : 'bg-red-950/60 text-red-400'}`}>
          {updating === branch.id ? <i className="fa fa-spinner fa-spin"></i> : (branch.active ? 'Open' : 'Closed')}
        </button>
      </div>
      <div className="flex gap-2 border-t border-gray-800 pt-3">
        <span className="flex-1 text-xs text-gray-600">
          <i className="fa fa-hashtag mr-1"></i>ID: {branch.id}
        </span>
        <button type="button" onClick={() => onEdit(branch)}
          className="rounded-xl border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-400 hover:bg-white/5">
          <i className="fa fa-pen mr-1"></i>Edit
        </button>
        <button type="button" onClick={() => onDelete(branch)} disabled={updating === branch.id}
          className="rounded-xl border border-red-900/40 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-950/30 disabled:opacity-50">
          <i className="fa fa-trash"></i>
        </button>
      </div>
    </div>
  );
}

function StoresPage({ token }) {
  const [stores, setStores] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, b] = await Promise.all([fetchStores(), fetchBranches()]);
        setStores(Array.isArray(s) ? s : []);
        setBranches(Array.isArray(b) ? b : []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function openModal(state) { setSaveError(''); setModal(state); }

  async function handleSave(form) {
    setSaving(true); setSaveError('');
    try {
      if (modal.mode === 'add') {
        const created = await createBranch(form, token);
        setBranches((prev) => [...prev, created]);
      } else {
        const { store_id: _s, ...rest } = form;
        const updated = await updateBranch(modal.branch.id, rest, token);
        setBranches((prev) => prev.map((b) => b.id === updated.id ? updated : b));
      }
      setModal(null);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(branch) {
    setUpdating(branch.id);
    try {
      const updated = await updateBranch(branch.id, { active: !branch.active }, token);
      setBranches((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    } catch (e) { setError(e.message); }
    finally { setUpdating(null); }
  }

  async function handleDelete(branch) {
    if (!window.confirm(`Delete branch "${branch.name}"?`)) return;
    setUpdating(branch.id);
    try {
      await deleteBranch(branch.id, token);
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
    } catch (e) { setError(e.message); }
    finally { setUpdating(null); }
  }

  function storeNameFor(store_id) {
    return stores.find((s) => s.id === store_id)?.name || `Store #${store_id}`;
  }

  return (
    <section className="space-y-6">
      <div className="card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Stores & Branches</h2>
          <p className="mt-1 text-gray-500">
            {branches.filter((b) => b.active).length} open · {branches.length} total
          </p>
        </div>
        <button type="button" onClick={() => openModal({ mode: 'add' })}
          className="rounded-2xl bg-[#f0b429] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e0a820]">
          <i className="fa fa-plus mr-2"></i>Add Branch
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-900/50 bg-red-950/50 p-4 text-sm text-red-400">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
        </div>
      )}

      {stores.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-gray-800 bg-[#1e1e1e] px-4 py-2">
              <i className="fa fa-store text-[#f0b429]"></i>
              <span className="text-sm font-semibold text-gray-200">{s.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold
                ${s.active ? 'bg-green-950/60 text-green-400' : 'bg-[#252525] text-gray-600'}`}>
                {s.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center">
          <i className="fa fa-spinner fa-spin text-4xl text-gray-600"></i>
          <p className="mt-3 font-semibold text-gray-500">Loading branches…</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa fa-store text-4xl text-gray-700"></i>
          <p className="mt-3 font-semibold text-gray-500">No branches yet</p>
          <p className="text-sm text-gray-600">Add your first branch to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              storeName={storeNameFor(branch.store_id)}
              onEdit={(b) => openModal({ mode: 'edit', branch: b })}
              onDelete={handleDelete}
              onToggle={handleToggle}
              updating={updating}
            />
          ))}
        </div>
      )}

      {modal && stores.length > 0 && (
        <BranchModal
          initial={modal.mode === 'edit' ? modal.branch : null}
          stores={stores}
          onSave={handleSave}
          onClose={() => { setModal(null); setSaveError(''); }}
          saving={saving}
          saveError={saveError}
        />
      )}
    </section>
  );
}

export default StoresPage;
