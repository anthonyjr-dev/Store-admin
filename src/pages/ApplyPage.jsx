import { useState } from 'react';

const PLATFORMS = ['But First Coffee', 'Quickspot', 'SirBiz', 'Other'];

const INPUT = 'w-full rounded-2xl border border-gray-700 bg-[#252525] p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20';

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
        <div className="card w-full max-w-sm p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-950/60">
            <i className="fa fa-check text-3xl text-green-400"></i>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">Branch Added!</h2>
          <p className="mt-2 text-gray-500">{form.name} has been added to {form.platform}.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => onNavigate('stores')}
              className="w-full rounded-2xl bg-[#f0b429] py-3 font-bold text-black hover:bg-[#e0a820]">
              View All Branches
            </button>
            <button
              type="button"
              onClick={() => { setDone(false); setStep(1); setForm({ name: '', platform: PLATFORMS[0], address: '', city: '', contactName: '', contactPhone: '', status: 'open' }); }}
              className="w-full rounded-2xl border border-gray-700 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5">
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
        <h2 className="text-2xl font-bold text-white">Add New Branch</h2>
        <p className="mt-1 text-gray-500">Register a new store or branch to the platform.</p>
        <div className="mt-4 flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-[#f0b429]' : 'bg-white/10'}`}></div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : submit} className="space-y-4">
          {step === 1 ? (
            <>
              <h3 className="text-lg font-bold text-white">Branch Info</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">Branch / Store Name</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. But First Coffee – Taguig" className={INPUT} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">Platform</label>
                <select value={form.platform} onChange={(e) => update('platform', e.target.value)} className={INPUT}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">Street Address</label>
                <input value={form.address} onChange={(e) => update('address', e.target.value)}
                  placeholder="Street address" className={INPUT} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">City</label>
                <input value={form.city} onChange={(e) => update('city', e.target.value)}
                  placeholder="e.g. Taguig City" className={INPUT} required />
              </div>
              <button type="submit" className="w-full rounded-2xl bg-[#f0b429] py-3 font-bold text-black hover:bg-[#e0a820]">
                Next →
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white">Contact & Status</h3>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">Contact Person</label>
                <input value={form.contactName} onChange={(e) => update('contactName', e.target.value)}
                  placeholder="Branch manager name" className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">Contact Phone</label>
                <input type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)}
                  placeholder="+63 9XX XXX XXXX" className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-300">Initial Status</label>
                <select value={form.status} onChange={(e) => update('status', e.target.value)} className={INPUT}>
                  <option value="open">Open</option>
                  <option value="closed">Closed (set up first)</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="rounded-2xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5">
                  ← Back
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-2xl bg-[#f0b429] py-3 font-bold text-black hover:bg-[#e0a820] disabled:opacity-50">
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
