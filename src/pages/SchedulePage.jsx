import { useState, useEffect } from 'react';
import { fetchStores, fetchBranches, createBranch, updateBranch, deleteBranch } from '../api.js';

const emptyForm = { store_id: '', name: '', address: '', phone: '', active: true };

function BranchModal({ initial, stores, onSave, onClose, saving, saveError }) {
  const [form, setForm] = useState(
    initial
      ? { store_id: String(initial.store_id), name: initial.name, address: initial.address || '', phone: initial.phone || '', active: initial.active }
      : { ...emptyForm, store_id: stores[0]?.id ? String(stores[0].id) : '' }
  );

  function update(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({ ...form, store_id: parseInt(form.store_id) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">{initial ? 'Edit Branch' : 'Add Branch'}</h3>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
            <i className="fa fa-xmark text-slate-500"></i>
          </button>
        </div>
        {saveError && <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-700">
            Store
            <select name="store_id" value={form.store_id} onChange={update} required
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Branch Name
            <input name="name" required value={form.name} onChange={update}
              placeholder="e.g. But First Coffee – Makati"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Address
            <input name="address" value={form.address} onChange={update}
              placeholder="Full address"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Phone
            <input name="phone" value={form.phone} onChange={update}
              placeholder="+63 9xx xxx xxxx"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" name="active" checked={form.active} onChange={update}
              className="h-4 w-4 rounded accent-orange-500" />
            Active / Open
          </label>
          <button type="submit" disabled={saving}
            className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60">
            {saving ? <><i className="fa fa-spinner fa-spin mr-2"></i>Saving…</> : (initial ? 'Save Changes' : 'Add Branch')}
          </button>
        </form>
      </div>
    </div>
  );
}

function BranchCard({ branch, storeName, onEdit, onDelete, onToggle, updating }) {
  return (
    <div className={`card p-5 space-y-3 transition-opacity ${!branch.active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 truncate">{branch.name}</h4>
          <p className="text-xs text-orange-500 font-medium">{storeName}</p>
          {branch.address && <p className="mt-1 text-sm text-slate-500 break-words">{branch.address}</p>}
          {branch.phone && <p className="text-xs text-slate-400"><i className="fa fa-phone mr-1"></i>{branch.phone}</p>}
        </div>
        <button type="button" onClick={() => onToggle(branch)}
          disabled={updating === branch.id}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-60
            ${branch.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {updating === branch.id ? <i className="fa fa-spinner fa-spin"></i> : (branch.active ? 'Open' : 'Closed')}
        </button>
      </div>
      <div className="flex gap-2 border-t pt-3">
        <span className="flex-1 text-xs text-slate-400">
          <i className="fa fa-hashtag mr-1"></i>Branch ID: {branch.id}
        </span>
        <button type="button" onClick={() => onEdit(branch)}
          className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <i className="fa fa-pen mr-1"></i>Edit
        </button>
        <button type="button" onClick={() => onDelete(branch)} disabled={updating === branch.id}
          className="rounded-xl border border-red-100 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-50 disabled:opacity-60">
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
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openModal(state) {
    setSaveError('');
    setModal(state);
  }

  async function handleSave(form) {
    setSaving(true);
    setSaveError('');
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
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(branch) {
    setUpdating(branch.id);
    try {
      const updated = await updateBranch(branch.id, { active: !branch.active }, token);
      setBranches((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(branch) {
    if (!window.confirm(`Delete branch "${branch.name}"?`)) return;
    setUpdating(branch.id);
    try {
      await deleteBranch(branch.id, token);
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  function storeNameFor(store_id) {
    return stores.find((s) => s.id === store_id)?.name || `Store #${store_id}`;
  }

  return (
    <section className="space-y-6">
      <div className="card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stores & Branches</h2>
          <p className="mt-1 text-slate-500">
            {branches.filter((b) => b.active).length} open · {branches.length} total
          </p>
        </div>
        <button type="button" onClick={() => openModal({ mode: 'add' })}
          className="rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
          <i className="fa fa-plus mr-2"></i>Add Branch
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
        </div>
      )}

      {stores.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm">
              <i className="fa fa-store text-orange-400"></i>
              <span className="text-sm font-semibold text-slate-700">{s.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {s.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-spinner fa-spin text-4xl"></i>
          <p className="mt-3 font-semibold">Loading branches…</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <i className="fa fa-store text-4xl opacity-30"></i>
          <p className="mt-3 font-semibold">No branches yet</p>
          <p className="text-sm">Add your first branch to get started.</p>
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
