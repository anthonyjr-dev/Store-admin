import { useState } from 'react';

const INITIAL_BRANCHES = [
  { id: 1, name: 'But First Coffee – Makati', platform: 'But First Coffee', address: 'Ayala Ave, Makati City', status: 'open', orders: 8 },
  { id: 2, name: 'But First Coffee – BGC', platform: 'But First Coffee', address: '32nd St, Bonifacio Global City', status: 'open', orders: 5 },
  { id: 3, name: 'Quickspot – Pasig', platform: 'Quickspot', address: 'Ortigas Center, Pasig City', status: 'closed', orders: 0 },
];

const PLATFORMS = ['But First Coffee', 'Quickspot', 'SirBiz', 'Other'];

function BranchCard({ branch, onToggle }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 truncate">{branch.name}</h4>
          <p className="text-xs text-orange-500 font-medium">{branch.platform}</p>
          <p className="mt-1 text-sm text-slate-500 break-words">{branch.address}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(branch.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold
            ${branch.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
        >
          {branch.status === 'open' ? 'Open' : 'Closed'}
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 border-t pt-3">
        <span><i className="fa fa-bag-shopping mr-1 text-orange-400"></i>{branch.orders} orders today</span>
        <button type="button" className="text-orange-500 font-semibold hover:underline text-xs">Edit</button>
      </div>
    </div>
  );
}

function StoresPage() {
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', platform: PLATFORMS[0], address: '', status: 'open' });
  const [saving, setSaving] = useState(false);

  function toggleStatus(id) {
    setBranches((prev) => prev.map((b) => b.id === id
      ? { ...b, status: b.status === 'open' ? 'closed' : 'open' }
      : b));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setBranches((prev) => [
      ...prev,
      { id: Date.now(), ...form, orders: 0 },
    ]);
    setForm({ name: '', platform: PLATFORMS[0], address: '', status: 'open' });
    setShowForm(false);
    setSaving(false);
  }

  return (
    <section className="space-y-6">
      <div className="card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stores & Branches</h2>
          <p className="mt-1 text-slate-500">{branches.filter((b) => b.status === 'open').length} open · {branches.length} total</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
        >
          <i className="fa fa-plus mr-2"></i>Add Branch
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="mb-4 text-xl font-bold">Add New Branch</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Branch Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. But First Coffee – Taguig"
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              >
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Add Branch'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <BranchCard key={branch.id} branch={branch} onToggle={toggleStatus} />
        ))}
      </div>
    </section>
  );
}

export default StoresPage;
