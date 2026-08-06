import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../api.js';

const CATEGORIES = ['All', 'Coffee', 'Espresso', 'Tea', 'Pastries', 'Cold Brew', 'Smoothies', 'Non-Coffee', 'Seasonal', 'Snacks'];

const emptyForm = { name: '', description: '', image: '', price: '', category: 'Coffee', available: true };

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

  function switchMode(mode) {
    setImageMode(mode);
  }

  async function submit(e) {
    e.preventDefault();
    let imageUrl = form.image || '';
    if (imageMode === 'upload' && pendingFile) {
      setUploading(true);
      try {
        imageUrl = await onUpload(pendingFile);
      } finally {
        setUploading(false);
      }
    }
    onSave({ ...form, price: parseFloat(form.price), image: imageUrl });
  }

  const previewSrc = imageMode === 'upload' ? uploadPreview : (form.image || '');
  const isBusy = saving || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">{initial ? 'Edit Product' : 'Add Product'}</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
            <i className="fa fa-xmark text-slate-500"></i>
          </button>
        </div>
        {saveError && (
          <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
        )}
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-700">
            Name
            <input name="name" required value={form.name} onChange={update}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Description
            <textarea name="description" rows={2} value={form.description || ''} onChange={update}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 resize-none" />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Image</span>
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button type="button" onClick={() => switchMode('upload')}
                  className={`rounded-lg px-3 py-1 transition ${imageMode === 'upload' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-500'}`}>
                  <i className="fa fa-arrow-up-from-bracket mr-1"></i>Upload
                </button>
                <button type="button" onClick={() => switchMode('url')}
                  className={`rounded-lg px-3 py-1 transition ${imageMode === 'url' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-500'}`}>
                  <i className="fa fa-link mr-1"></i>URL
                </button>
              </div>
            </div>

            {previewSrc && (
              <img src={previewSrc} alt="preview" className="w-full h-36 rounded-2xl object-cover bg-slate-100" />
            )}

            {imageMode === 'upload' ? (
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fa fa-cloud-arrow-up text-2xl text-slate-400"></i>
                <p className="text-sm text-slate-500">
                  {pendingFile ? pendingFile.name : 'Click to choose an image'}
                </p>
                <p className="text-xs text-slate-400">JPG, PNG, GIF — max 10 MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            ) : (
              <input name="image" type="url" value={form.image || ''} onChange={update}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-semibold text-slate-700">
              Price (₱)
              <input name="price" type="number" required min="0" step="0.01" value={form.price} onChange={update}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Category
              <select name="category" value={form.category} onChange={update}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" name="available" checked={form.available} onChange={update}
              className="h-4 w-4 rounded accent-orange-500" />
            Available
          </label>
          <button type="submit" disabled={isBusy}
            className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60">
            {uploading ? <><i className="fa fa-spinner fa-spin mr-2"></i>Uploading…</> :
             saving   ? <><i className="fa fa-spinner fa-spin mr-2"></i>Saving…</>   :
             (initial ? 'Save Changes' : 'Add Product')}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete, onToggleAvailable, updating }) {
  return (
    <div className={`card overflow-hidden transition-opacity ${!product.available ? 'opacity-60' : ''}`}>
      <div className="relative h-36 bg-slate-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <i className="fa fa-image text-4xl"></i>
          </div>
        )}
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold
          ${product.available ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
          {product.available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <div className="p-4 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-slate-800 leading-tight">{product.name}</p>
          <p className="shrink-0 font-extrabold text-orange-500">₱{Number(product.price).toLocaleString()}</p>
        </div>
        <p className="text-xs text-slate-400 capitalize">{product.category}</p>
        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
        )}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => onToggleAvailable(product)} disabled={updating === product.id}
            className="flex-1 rounded-2xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            {updating === product.id ? <i className="fa fa-spinner fa-spin"></i> : (product.available ? 'Disable' : 'Enable')}
          </button>
          <button type="button" onClick={() => onEdit(product)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <i className="fa fa-pen"></i>
          </button>
          <button type="button" onClick={() => onDelete(product)} disabled={updating === product.id}
            className="rounded-2xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-50 disabled:opacity-60">
            <i className="fa fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductsPage({ token, branchId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', product }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts(category, branchId);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, branchId]);

  useEffect(() => { load(); }, [load]);

  function openModal(state) {
    setSaveError('');
    setModal(state);
  }

  async function handleSave(form) {
    setSaving(true);
    setSaveError('');
    try {
      if (modal.mode === 'add') {
        const created = await createProduct({ ...form, branch_id: branchId ?? undefined }, token);
        setProducts((prev) => [...prev, created]);
      } else {
        const updated = await updateProduct(modal.product.id, form, token);
        setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      }
      setModal(null);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setUpdating(product.id);
    try {
      await deleteProduct(product.id, token);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  async function handleToggleAvailable(product) {
    setUpdating(product.id);
    try {
      const updated = await updateProduct(product.id, { available: !product.available }, token);
      setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  const displayed = category === 'All' ? products : products.filter((p) => p.category === category);

  return (
    <section className="space-y-6">
      <div className="card p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="mt-1 text-slate-500">{products.length} total · {products.filter((p) => p.available).length} available</p>
        </div>
        <button type="button" onClick={() => openModal({ mode: 'add' })}
          className="rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600">
          <i className="fa fa-plus mr-2"></i>Add Product
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
        </div>
      )}

      <div className="tab-scroll-container">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold capitalize transition whitespace-nowrap
                ${category === cat ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 shadow-sm hover:bg-orange-50'}`}>
              {cat}
              <span className="ml-1.5 text-xs opacity-60">
                ({cat === 'All' ? products.length : products.filter((p) => p.category === cat).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-spinner fa-spin text-4xl"></i>
          <p className="mt-3 font-semibold">Loading products…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-box-open text-4xl opacity-30"></i>
          <p className="mt-3 font-semibold">No products in this category</p>
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
