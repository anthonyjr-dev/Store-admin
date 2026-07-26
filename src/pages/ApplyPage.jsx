import { useState } from 'react';

const PLATFORMS = ['But First Coffee', 'Quickspot', 'SirBiz', 'Other'];

function AddStorePage({ onNavigate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', platform: PLATFORMS[0], address: '', city: '', contactName: '', contactPhone: '', status: 'open',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="card p-10 text-center max-w-sm w-full">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <i className="fa fa-check text-3xl text-green-500"></i>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">Branch Added!</h2>
          <p className="mt-2 text-slate-500">{form.name} has been added to {form.platform}.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onNavigate('stores')}
              className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600"
            >
              View All Branches
            </button>
            <button
              type="button"
              onClick={() => { setDone(false); setStep(1); setForm({ name: '', platform: PLATFORMS[0], address: '', city: '', contactName: '', contactPhone: '', status: 'open' }); }}
              className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Add Another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold">Add New Branch</h2>
        <p className="mt-1 text-slate-500">Register a new store or branch to the platform.</p>
        <div className="mt-4 flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : submit} className="space-y-4">
          {step === 1 ? (
            <>
              <h3 className="text-lg font-bold text-slate-800">Branch Info</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Branch / Store Name</label>
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. But First Coffee – Taguig"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Platform</label>
                <select
                  value={form.platform}
                  onChange={(e) => update('platform', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Street Address</label>
                <input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="Street address"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">City</label>
                <input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="e.g. Taguig City"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>
              <button type="submit" className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
                Next →
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-800">Contact & Status</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Contact Person</label>
                <input
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                  placeholder="Branch manager name"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Contact Phone</label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Initial Status</label>
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed (set up first)</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Add Branch'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

export default AddStorePage;
