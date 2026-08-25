import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../api.js';

const CATEGORIES = ['All', 'Coffee', 'Espresso', 'Tea', 'Pastries', 'Cold Brew', 'Smoothies', 'Non-Coffee', 'Seasonal', 'Snacks'];

const emptyForm = { name: '', description: '', image: '', price: '', category: 'Coffee', available: true };

const INPUT = 'mt-1 w-full rounded-2xl border border-gray-700 bg-[#252525] px-4 py-2.5 text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20';

function ProductModal({ initial, onSave, onClose, saving, saveError, onUpload }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [imageMode, setImageMode] = useState(initial?.image ? 'url' : 'upload');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const blobRef = useRef('');

  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  function update(e) {
    const { name, value, type, checked } = e.target;
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
    onSave({ ...form, price: parseFloat(form.price), image: imageUrl });
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
              Price (₱)
              <input name="price" type="number" required min="0" step="0.01" value={form.price} onChange={update} className={INPUT} />
            </label>
            <label className="block text-sm font-semibold text-gray-300">
              Category
              <select name="category" value={form.category} onChange={update} className={INPUT}>
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
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

function BranchMenuView({ products, onToggleAvailable, updating }) {
  const categoryOrder = CATEGORIES.filter((c) => c !== 'All');
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
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts('All', branchId);
      setProducts(Array.isArray(data) ? data : []);
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
          {CATEGORIES.map((cat) => (
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
        />
      )}
    </section>
  );
}

export default ProductsPage;
