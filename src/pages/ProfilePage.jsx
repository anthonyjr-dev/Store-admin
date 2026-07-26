import { useState } from 'react';

function ProfilePage({ profile, onLogout }) {
  const [name, setName] = useState(profile.name || '');
  const [saved, setSaved] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const initial = (profile.name || profile.email || 'A')[0].toUpperCase();

  return (
    <section className="space-y-6">
      {/* Profile banner */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-gray-900 to-gray-700"></div>
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-3xl font-extrabold text-white ring-4 ring-white">
              {initial}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-slate-800">{profile.name || 'Admin'}</h2>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit info */}
      <div className="card p-6">
        <h3 className="mb-4 text-xl font-bold">Account Info</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
            <input
              value={profile.email}
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600"
          >
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Role */}
      <div className="card p-6 space-y-3">
        <h3 className="text-xl font-bold">Role & Access</h3>
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
          <div>
            <p className="font-semibold text-slate-800">Store Administrator</p>
            <p className="text-sm text-slate-500">Full access to orders, branches, and reports</p>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">Admin</span>
        </div>
      </div>

      {/* Sign out */}
      <div className="card p-6">
        <h3 className="mb-4 text-xl font-bold">Session</h3>
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-2xl border border-red-200 py-3 text-sm font-bold text-red-500 hover:bg-red-50"
        >
          <i className="fa fa-right-from-bracket mr-2"></i>Sign Out
        </button>
      </div>
    </section>
  );
}

export default ProfilePage;
