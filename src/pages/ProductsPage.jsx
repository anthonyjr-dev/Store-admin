import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../api.js';

// Serving types a product can be sold as. `bottle` is opt-in per product.
const TEMPS = [
  { key: 'iced', label: 'Iced', icon: '🧊' },
  { key: 'hot', label: 'Hot', icon: '🔥' },
  { key: 'bottle', label: 'Bottle', icon: '🍶' },
];

const makeTempOptions = (price = 0) => ({
  iced: { enabled: true, size_prices: { '12oz': Number(price) || 0 }, disabled_sizes: [] },
  hot: { enabled: true, size_prices: { '12oz': Number(price) || 0 }, disabled_sizes: [] },
  bottle: { enabled: false, size_prices: { '12oz': Number(price) || 0 }, disabled_sizes: [] },
});

// Build a full { iced, hot, bottle } structure from whatever the product row
// has, synthesising from the legacy temperature_enabled / size_prices fields
// when the new temperature_options field is missing. Size values are absolute
// peso prices. `bottle` defaults to disabled.
function normalizeTempOptions(initial) {
  const basePrice = Number(initial?.price) || 0;
  const legacyEnabled = initial?.temperature_enabled ?? true;
  const legacySizes = initial?.size_prices && Object.keys(initial.size_prices).length
    ? initial.size_prices
    : null;

  const cleanSizes = (raw) => {
    const out = {};
    if (raw && typeof raw === 'object') {
      for (const [label, value] of Object.entries(raw)) {
        const key = String(label).trim();
        if (!key) continue;
        const num = Number(value);
        out[key] = Number.isFinite(num) && num > 0 ? num : basePrice;
      }
    }
    if (!Object.keys(out).length) out['12oz'] = basePrice;
    return out;
  };

  const cleanDisabled = (raw, sizes) => {
    if (!Array.isArray(raw)) return [];
    const valid = new Set(Object.keys(sizes));
    return [...new Set(raw.map((s) => String(s).trim()).filter((s) => s && valid.has(s)))];
  };

  const raw = initial?.temperature_options || null;
  const pick = (key) => {
    const o = raw?.[key];
    if (o && typeof o === 'object') {
      const size_prices = cleanSizes(o.size_prices);
      return {
        enabled: typeof o.enabled === 'boolean' ? o.enabled : legacyEnabled,
        size_prices,
        disabled_sizes: cleanDisabled(o.disabled_sizes, size_prices),
      };
    }
    return {
      enabled: key === 'bottle' ? false : legacyEnabled,
      size_prices: cleanSizes(legacySizes),
      disabled_sizes: [],
    };
  };
  return { iced: pick('iced'), hot: pick('hot'), bottle: pick('bottle') };
}

// Which serving-type+size the storefront menu card price (`product.price`)
// mirrors. Prefers the size whose price already equals the saved base price,
// then falls back to the first orderable size (Iced → Hot → Bottle).
const SERVING_KEYS = ['iced', 'hot', 'bottle'];
function inferDefaultPick(tempOpts, price) {
  const target = Number(price);
  for (const key of SERVING_KEYS) {
    const sizes = tempOpts?.[key]?.size_prices || {};
    const off = new Set(tempOpts?.[key]?.disabled_sizes || []);
    for (const [label, val] of Object.entries(sizes)) {
      if (!off.has(label) && Number.isFinite(target) && target > 0 && Number(val) === target) {
        return { temp: key, label };
      }
    }
  }
  for (const key of SERVING_KEYS) {
    if (tempOpts?.[key]?.enabled === false) continue;
    const sizes = tempOpts?.[key]?.size_prices || {};
    const off = new Set(tempOpts?.[key]?.disabled_sizes || []);
    const first = Object.keys(sizes).find((l) => !off.has(l));
    if (first) return { temp: key, label: first };
  }
  return null;
}

// Storefront badge options shown on the bfc-order menu card. '' = no badge.
const TAG_OPTIONS = ['', 'Best Seller', 'Promo', 'New'];

const emptyForm = { name: '', description: '', image: '', price: '', category: 'Coffee', available: true, tag: '', temperature_options: makeTempOptions() };

const INPUT = 'mt-1 w-full rounded-2xl border border-gray-700 bg-[#252525] px-4 py-2.5 text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20';

// Size-label field. Edits stay local while typing and only commit the rename on
// blur / Enter — committing on every keystroke used to remount the row and drop
// focus, and made it impossible to clear the field.
function SizeLabelInput({ value, onCommit, className }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const commit = () => {
    const t = text.trim();
    if (t && t !== value) onCommit(t);
    else setText(value);
  };
  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      className={className}
    />
  );
}

function ProductModal({ initial, onSave, onClose, saving, saveError, onUpload, categories }) {
  const resolvedInitial = useMemo(() => ({
    ...emptyForm,
    ...initial,
    price: initial ? String(initial.price ?? '') : '',
    tag: initial?.tag ?? '',
    temperature_options: normalizeTempOptions(initial),
  }), [initial]);
  const [form, setForm] = useState(resolvedInitial);
  const [defaultPick, setDefaultPick] = useState(
    () => inferDefaultPick(resolvedInitial.temperature_options, resolvedInitial.price),
  );
  const [imageMode, setImageMode] = useState(initial?.image ? 'url' : 'upload');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const blobRef = useRef('');

  useEffect(() => {
    setForm(resolvedInitial);
    setDefaultPick(inferDefaultPick(resolvedInitial.temperature_options, resolvedInitial.price));
    setImageMode(resolvedInitial.image ? 'url' : 'upload');
    setPendingFile(null);
    setUploadPreview('');
  }, [resolvedInitial]);

  const tempOptions = form.temperature_options || makeTempOptions(form.price);

  const patchTemp = (temp, patch) => {
    setForm((f) => {
      const current = f.temperature_options || makeTempOptions(f.price);
      return {
        ...f,
        temperature_options: {
          ...current,
          [temp]: { ...current[temp], ...patch },
        },
      };
    });
  };

  const setTempEnabled = (temp, enabled) => patchTemp(temp, { enabled });

  const isDefaultPick = (temp, label) => defaultPick?.temp === temp && defaultPick?.label === label;

  // Mark this temperature+size as the price shown on the storefront menu card.
  const chooseDefault = (temp, label) => {
    setDefaultPick({ temp, label });
    const val = tempOptions[temp]?.size_prices?.[label];
    if (val !== undefined && val !== '') setForm((f) => ({ ...f, price: String(val) }));
  };

  const setTempSizePrice = (temp, label, value) => {
    const sizes = { ...(tempOptions[temp]?.size_prices || {}) };
    sizes[label] = value === '' ? '' : Number(value);
    patchTemp(temp, { size_prices: sizes });
    if (isDefaultPick(temp, label)) {
      setForm((f) => ({ ...f, price: value === '' ? '' : String(Number(value)) }));
    }
  };

  const renameTempSize = (temp, oldLabel, nextLabel) => {
    if (!nextLabel) return;
    const src = tempOptions[temp]?.size_prices || {};
    const sizes = {};
    // Preserve key order while renaming
    for (const [k, v] of Object.entries(src)) sizes[k === oldLabel ? nextLabel : k] = v;
    const disabled_sizes = (tempOptions[temp]?.disabled_sizes || []).map((s) => (s === oldLabel ? nextLabel : s));
    patchTemp(temp, { size_prices: sizes, disabled_sizes });
    if (isDefaultPick(temp, oldLabel)) setDefaultPick({ temp, label: nextLabel });
  };

  const addTempSize = (temp, label, price) => {
    const key = (label || '').trim();
    if (!key) return;
    const sizes = { ...(tempOptions[temp]?.size_prices || {}) };
    const num = parseFloat(price);
    sizes[key] = Number.isNaN(num) ? 0 : num;
    patchTemp(temp, { size_prices: sizes });
  };

  const removeTempSize = (temp, label) => {
    const sizes = { ...(tempOptions[temp]?.size_prices || {}) };
    delete sizes[label];
    const disabled_sizes = (tempOptions[temp]?.disabled_sizes || []).filter((s) => s !== label);
    patchTemp(temp, { size_prices: sizes, disabled_sizes });
    if (isDefaultPick(temp, label)) setDefaultPick(null);
  };

  const isTempSizeEnabled = (temp, label) => !(tempOptions[temp]?.disabled_sizes || []).includes(label);

  const toggleTempSize = (temp, label, enabled) => {
    const set = new Set(tempOptions[temp]?.disabled_sizes || []);
    if (enabled) set.delete(label);
    else set.add(label);
    patchTemp(temp, { disabled_sizes: [...set] });
    // A switched-off size can't be the storefront default.
    if (!enabled && isDefaultPick(temp, label)) setDefaultPick(null);
  };

  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  function update(e) {
    const { name, value, type, checked } = e.target;
    // Typing a menu price by hand detaches it from any picked size.
    if (name === 'price') setDefaultPick(null);
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setPendingFile(file);
    setUploadPreview(url);
  }

  async function submit(e) {
    e.preventDefault();
    let imageUrl = form.image || '';
    if (imageMode === 'upload' && pendingFile) {
      setUploading(true);
      try { imageUrl = await onUpload(pendingFile); }
      finally { setUploading(false); }
    }
    // The storefront menu card shows `product.price`. When a size is picked as
    // the default, that size's price wins; otherwise use the typed menu price.
    let basePrice = parseFloat(form.price);
    if (defaultPick) {
      const picked = Number(tempOptions[defaultPick.temp]?.size_prices?.[defaultPick.label]);
      if (Number.isFinite(picked) && picked > 0) basePrice = picked;
    }
    // Coerce any blank / invalid size price back to the base price before saving
    const opts = { iced: null, hot: null, bottle: null };
    for (const { key } of TEMPS) {
      const src = tempOptions[key] || { enabled: true, size_prices: {}, disabled_sizes: [] };
      const sizes = {};
      for (const [label, value] of Object.entries(src.size_prices || {})) {
        const num = Number(value);
        sizes[label] = Number.isFinite(num) && num > 0 ? num : (basePrice || 0);
      }
      if (!Object.keys(sizes).length) sizes['12oz'] = basePrice || 0;
      const disabled_sizes = (src.disabled_sizes || []).filter((s) => s in sizes);
      opts[key] = { enabled: !!src.enabled, size_prices: sizes, disabled_sizes };
    }
    // Keep the legacy fields in sync for any consumer not yet reading
    // temperature_options — legacy map carries only the still-orderable sizes.
    const orderable = (o) => {
      const off = new Set(o.disabled_sizes);
      const kept = Object.fromEntries(Object.entries(o.size_prices).filter(([l]) => !off.has(l)));
      return Object.keys(kept).length ? kept : o.size_prices;
    };
    const temperature_enabled = !!(opts.iced.enabled || opts.hot.enabled || opts.bottle.enabled);
    const size_prices = { ...orderable(opts.hot), ...orderable(opts.bottle), ...orderable(opts.iced) };
    onSave({
      ...form,
      price: basePrice,
      image: imageUrl,
      tag: form.tag?.trim() || null,
      temperature_options: opts,
      temperature_enabled,
      size_prices,
    });
  }

  const previewSrc = imageMode === 'upload' ? uploadPreview : (form.image || '');
  const isBusy = saving || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-[#1c1c1c] border border-gray-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">{initial ? 'Edit Product' : 'Add Product'}</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/8">
            <i className="fa fa-xmark text-gray-400"></i>
          </button>
        </div>
        {saveError && (
          <div className="mb-4 rounded-2xl border border-red-900/50 bg-red-950/50 p-3 text-sm text-red-400">{saveError}</div>
        )}
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-gray-300">
            Name
            <input name="name" required value={form.name} onChange={update} className={INPUT} />
          </label>
          <label className="block text-sm font-semibold text-gray-300">
            Description
            <textarea name="description" rows={2} value={form.description || ''} onChange={update}
              className={INPUT + ' resize-none'} />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300">Image</span>
              <div className="flex rounded-xl bg-[#252525] p-1 text-xs font-semibold">
                <button type="button" onClick={() => setImageMode('upload')}
                  className={`rounded-lg px-3 py-1 transition ${imageMode === 'upload' ? 'bg-[#1e1e1e] text-[#f0b429] shadow-sm' : 'text-gray-500'}`}>
                  <i className="fa fa-arrow-up-from-bracket mr-1"></i>Upload
                </button>
                <button type="button" onClick={() => setImageMode('url')}
                  className={`rounded-lg px-3 py-1 transition ${imageMode === 'url' ? 'bg-[#1e1e1e] text-[#f0b429] shadow-sm' : 'text-gray-500'}`}>
                  <i className="fa fa-link mr-1"></i>URL
                </button>
              </div>
            </div>

            {previewSrc && (
              <img src={previewSrc} alt="preview" className="w-full h-36 rounded-2xl object-cover bg-[#252525]" />
            )}

            {imageMode === 'upload' ? (
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-700 p-5 cursor-pointer hover:border-[#f0b429]/40 hover:bg-[#f0b429]/5 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fa fa-cloud-arrow-up text-2xl text-gray-600"></i>
                <p className="text-sm text-gray-500">
                  {pendingFile ? pendingFile.name : 'Click to choose an image'}
                </p>
                <p className="text-xs text-gray-600">JPG, PNG, GIF — max 10 MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            ) : (
              <input name="image" type="url" value={form.image || ''} onChange={update}
                placeholder="https://…" className={INPUT} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-semibold text-gray-300">
              Menu price (₱)
              <input name="price" type="number" required min="0" step="0.01" value={form.price} onChange={update} className={INPUT} />
              <span className="mt-1 block text-[11px] font-normal text-gray-500">
                Shown on the storefront menu card. Pick a size below to use its price, or type one here.
              </span>
            </label>
            <label className="block text-sm font-semibold text-gray-300">
              Category
              <select name="category" value={form.category} onChange={update} className={INPUT}>
                {(categories || []).filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-gray-300">
            Tag / Badge
            <input
              name="tag"
              list="tag-options"
              value={form.tag || ''}
              onChange={update}
              maxLength={30}
              placeholder="e.g. Best Seller — or leave blank"
              className={INPUT}
            />
            <datalist id="tag-options">
              {TAG_OPTIONS.filter(Boolean).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <span className="mt-1 block text-[11px] font-normal text-gray-500">
              Shown as a badge on the storefront menu card. Pick a suggestion or type your own; leave blank for no badge.
            </span>
          </label>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-cream-muted uppercase tracking-wide">Serving Type &amp; Sizes</p>
              <p className="mt-0.5 text-xs font-normal text-gray-500">
                Enable Iced, Hot and Bottle independently. Each serving type has its own sizes with absolute ₱ prices.
                Use the On/Off button beside a size to switch just that size off. Disabled serving types and
                sizes show greyed-out in the storefront and can't be picked. The ◉ radio on the left marks
                the size whose price shows on the storefront menu card.
              </p>
            </div>

            {TEMPS.map(({ key, label, icon }) => {
              const opt = tempOptions[key] || { enabled: true, size_prices: {}, disabled_sizes: [] };
              const sizes = Object.entries(opt.size_prices || {});
              return (
                <div key={key} className={`rounded-2xl border p-3 space-y-2 transition
                  ${opt.enabled ? 'border-gray-700 bg-[#202020]' : 'border-gray-800 bg-[#1a1a1a]'}`}>
                  <label className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-200">
                    <span>{icon} {label}</span>
                    <span className="flex items-center gap-2 text-xs font-normal text-gray-400">
                      {opt.enabled ? 'Enabled' : 'Disabled'}
                      <input
                        type="checkbox"
                        checked={opt.enabled}
                        onChange={(e) => setTempEnabled(key, e.target.checked)}
                        className="h-4 w-4 rounded accent-[#f0b429]"
                      />
                    </span>
                  </label>

                  <div className={`space-y-2 ${opt.enabled ? '' : 'pointer-events-none opacity-40'}`}>
                    {sizes.map(([sizeLabel, value], idx) => {
                      const sizeOn = isTempSizeEnabled(key, sizeLabel);
                      return (
                        // Key by position, not by label — keying by the label
                        // remounts the row on every keystroke and drops focus.
                        <div key={`${key}-${idx}`} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="defaultSize"
                            checked={isDefaultPick(key, sizeLabel)}
                            disabled={!sizeOn}
                            onChange={() => chooseDefault(key, sizeLabel)}
                            title="Use this size's price on the storefront menu card"
                            className="h-4 w-4 shrink-0 accent-[#f0b429] disabled:opacity-30"
                          />
                          <button
                            type="button"
                            onClick={() => toggleTempSize(key, sizeLabel, !sizeOn)}
                            title={sizeOn ? 'Size enabled — click to disable' : 'Size disabled — click to enable'}
                            className={`shrink-0 w-14 rounded-lg px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition
                              ${sizeOn
                                ? 'bg-[#f0b429]/15 text-[#f0b429] hover:bg-[#f0b429]/25'
                                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                          >
                            {sizeOn ? 'On' : 'Off'}
                          </button>
                          <SizeLabelInput
                            value={sizeLabel}
                            onCommit={(next) => renameTempSize(key, sizeLabel, next)}
                            className={`w-20 rounded-xl border border-gray-700 bg-[#252525] px-3 py-2 text-xs text-white outline-none focus:border-[#f0b429] ${sizeOn ? '' : 'line-through opacity-50'}`}
                          />
                          <div className={`flex flex-1 items-center rounded-xl border border-gray-700 bg-[#252525] pl-3 focus-within:border-[#f0b429] ${sizeOn ? '' : 'opacity-50'}`}>
                            <span className="text-xs text-gray-500">₱</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={value}
                              onChange={(e) => setTempSizePrice(key, sizeLabel, e.target.value)}
                              className="w-full bg-transparent px-2 py-2 text-xs text-white outline-none"
                            />
                          </div>
                          <button type="button" onClick={() => removeTempSize(key, sizeLabel)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
                        </div>
                      );
                    })}
                    {sizes.length === 0 && (
                      <p className="text-xs text-gray-500">No sizes — the base price will be used.</p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        name={`newSize_${key}_label`}
                        placeholder="Size"
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const priceEl = e.target.form?.elements?.[`newSize_${key}_price`];
                          addTempSize(key, e.target.value, priceEl?.value || '0');
                          e.target.value = '';
                          if (priceEl) priceEl.value = '';
                        }}
                        className="w-24 rounded-xl border border-gray-700 bg-[#252525] px-3 py-2 text-xs text-white outline-none focus:border-[#f0b429]"
                      />
                      <input
                        name={`newSize_${key}_price`}
                        placeholder="₱"
                        type="number"
                        min="0"
                        step="0.01"
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const labelEl = e.target.form?.elements?.[`newSize_${key}_label`];
                          addTempSize(key, labelEl?.value || '', e.target.value || '0');
                          if (labelEl) labelEl.value = '';
                          e.target.value = '';
                        }}
                        className="w-20 rounded-xl border border-gray-700 bg-[#252525] px-3 py-2 text-xs text-white outline-none focus:border-[#f0b429]"
                      />
                      <button type="button" onClick={(e) => {
                        const formEl = e.target.closest('form');
                        const labelEl = formEl?.elements?.[`newSize_${key}_label`];
                        const priceEl = formEl?.elements?.[`newSize_${key}_price`];
                        addTempSize(key, labelEl?.value || '', priceEl?.value || '0');
                        if (labelEl) labelEl.value = '';
                        if (priceEl) priceEl.value = '';
                      }} className="rounded-xl bg-[#f0b429] px-3 py-2 text-xs font-bold text-black hover:bg-[#e0a820]">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-300">
            <input type="checkbox" name="available" checked={form.available} onChange={update}
              className="h-4 w-4 rounded accent-[#f0b429]" />
            Available
          </label>

          <button type="submit" disabled={isBusy}
            className="w-full rounded-2xl bg-[#f0b429] py-3 font-bold text-black disabled:opacity-50">
            {uploading ? <><i className="fa fa-spinner fa-spin mr-2"></i>Uploading…</> :
             saving    ? <><i className="fa fa-spinner fa-spin mr-2"></i>Saving…</>   :
             (initial ? 'Save Changes' : 'Add Product')}
          </button>
        </form>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40
        ${checked ? 'bg-[#f0b429]' : 'bg-gray-700'}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

function BranchMenuView({ products, onToggleAvailable, updating, categoryOrder }) {
  const grouped = categoryOrder
    .map((cat) => ({ cat, items: products.filter((p) => p.category === cat) }))
    .filter(({ items }) => items.length > 0);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <i className="fa fa-box-open text-4xl text-gray-700"></i>
        <p className="mt-3 font-semibold text-gray-500">No menu items</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <p className="mb-3 px-1 text-xs font-semibold tracking-widest text-gray-500 uppercase">{cat}</p>
          <div className="space-y-2">
            {items.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-2xl bg-[#1c1c1c] p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#2a2a2a]">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <i className="fa fa-image text-xl text-gray-700"></i>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white leading-tight">{product.name}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#f0b429]">₱{Number(product.price).toLocaleString()}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`text-xs font-semibold ${product.available ? 'text-green-400' : 'text-gray-600'}`}>
                    {product.available ? 'Available' : 'Unavailable'}
                  </span>
                  <ToggleSwitch
                    checked={product.available}
                    onChange={() => onToggleAvailable(product)}
                    disabled={updating === product.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete, onToggleAvailable, updating, isSuperAdmin }) {
  return (
    <div className={`card overflow-hidden transition-opacity ${!product.available ? 'opacity-50' : ''}`}>
      <div className="relative h-36 bg-[#252525]">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <i className="fa fa-image text-4xl text-gray-700"></i>
          </div>
        )}
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold
          ${product.available ? 'bg-green-950/80 text-green-400' : 'bg-[#252525] text-gray-600'}`}>
          {product.available ? 'Available' : 'Unavailable'}
        </span>
        {!isSuperAdmin && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
            Branch only
          </span>
        )}
      </div>
      <div className="p-4 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-white leading-tight">{product.name}</p>
          <p className="shrink-0 font-extrabold text-[#f0b429]">₱{Number(product.price).toLocaleString()}</p>
        </div>
        <p className="text-xs text-gray-600 capitalize">{product.category}</p>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
        )}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => onToggleAvailable(product)} disabled={updating === product.id}
            className="flex-1 rounded-2xl border border-gray-700 py-2 text-xs font-semibold text-gray-400 hover:bg-white/5 disabled:opacity-50">
            {updating === product.id ? <i className="fa fa-spinner fa-spin"></i> : (product.available ? 'Disable' : 'Enable')}
          </button>
          <button type="button" onClick={() => onEdit(product)}
            className="rounded-2xl border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-400 hover:bg-white/5">
            <i className="fa fa-pen"></i>
          </button>
          <button type="button" onClick={() => onDelete(product)} disabled={updating === product.id}
            className="rounded-2xl border border-red-900/40 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-950/30 disabled:opacity-50">
            <i className="fa fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsPage({ token, branchId, userType }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts('All', branchId);
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setCategories(['All', ...new Set(list.map((p) => p.category).filter(Boolean))]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  function openModal(state) { setSaveError(''); setModal(state); }

  async function handleSave(form) {
    setSaving(true); setSaveError('');
    try {
      if (modal.mode === 'add') {
        const created = await createProduct({ ...form, branch_id: branchId ?? undefined }, token);
        setProducts((prev) => [...prev, created]);
      } else {
        const updated = await updateProduct(modal.product.id, form, token);
        setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      }
      setModal(null);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setUpdating(product.id);
    try {
      await deleteProduct(product.id, token);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) { setError(e.message); }
    finally { setUpdating(null); }
  }

  async function handleToggleAvailable(product) {
    setUpdating(product.id);
    try {
      const isSuperAdmin = (userType ?? 3) >= 3;
      // Branch admins scope the toggle to their branch; superadmins update globally
      const payload = isSuperAdmin
        ? { available: !product.available }
        : { available: !product.available, branch_id: branchId };
      const updated = await updateProduct(product.id, payload, token);
      // Optimistically reflect the toggled state regardless of server response shape
      setProducts((prev) => prev.map((p) =>
        p.id === product.id ? { ...p, available: !product.available } : p
      ));
    } catch (e) { setError(e.message); }
    finally { setUpdating(null); }
  }

  const isBranchAdmin = userType === 2;
  const displayed = category === 'All' ? products : products.filter((p) => p.category === category);

  if (isBranchAdmin) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-2xl font-bold text-white">Menu</h2>
            <p className="mt-0.5 text-sm text-gray-500">{products.length} items · {products.filter((p) => p.available).length} available</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-red-900/50 bg-red-950/50 p-4 text-sm text-red-400">
            {error}
            <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center">
            <i className="fa fa-spinner fa-spin text-4xl text-gray-600"></i>
            <p className="mt-3 font-semibold text-gray-500">Loading menu…</p>
          </div>
        ) : (
          <BranchMenuView
            products={products}
            onToggleAvailable={handleToggleAvailable}
            updating={updating}
            categoryOrder={categories.filter((c) => c !== 'All')}
          />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Menu</h2>
          <p className="mt-1 text-gray-500">{products.length} total · {products.filter((p) => p.available).length} available</p>
        </div>
        <button type="button" onClick={() => openModal({ mode: 'add' })}
          className="rounded-2xl bg-[#f0b429] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e0a820]">
          <i className="fa fa-plus mr-2"></i>Add Item
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-900/50 bg-red-950/50 p-4 text-sm text-red-400">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
        </div>
      )}

      <div className="tab-scroll-container">
        <div className="flex gap-2 w-max">
          {categories.map((cat) => (
            <button key={cat} type="button" onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition
                ${category === cat
                  ? 'bg-[#f0b429] text-black'
                  : 'bg-[#1e1e1e] text-gray-400 border border-gray-800 hover:text-white'}`}>
              {cat}
              <span className="ml-1.5 text-xs opacity-60">
                ({cat === 'All' ? products.length : products.filter((p) => p.category === cat).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <i className="fa fa-spinner fa-spin text-4xl text-gray-600"></i>
          <p className="mt-3 font-semibold text-gray-500">Loading menu…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa fa-box-open text-4xl text-gray-700"></i>
          <p className="mt-3 font-semibold text-gray-500">No items in this category</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayed.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={(p) => openModal({ mode: 'edit', product: p })}
              onDelete={handleDelete}
              onToggleAvailable={handleToggleAvailable}
              updating={updating}
              isSuperAdmin={(userType ?? 3) >= 3}
            />
          ))}
        </div>
      )}

      {modal && (
        <ProductModal
          initial={modal.mode === 'edit' ? { ...modal.product, price: String(modal.product.price) } : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSaveError(''); }}
          saving={saving}
          saveError={saveError}
          onUpload={(file) => uploadProductImage(file, token)}
          categories={categories}
        />
      )}
    </section>
  );
}

export default ProductsPage;
