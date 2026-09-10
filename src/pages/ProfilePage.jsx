import { useState } from 'react';
import { ROLE_LABELS } from '../roles.js';

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
  const roleLabel = ROLE_LABELS[profile.user_type] ?? 'Admin';

  return (
    <section className="space-y-6">
      {/* Profile banner */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#f0b429]/20 to-[#1c1c1c]"></div>
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#f0b429] text-3xl font-extrabold text-black ring-4 ring-[#1e1e1e]">
              {initial}
            </div>
            <div className="pb-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{profile.name || 'Admin'}</h2>
              <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit info */}
      <div className="card p-6">
        <h3 className="mb-4 text-xl font-bold text-white">Account Info</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-300">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-700 bg-[#252525] p-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-300">Email</label>
            <input
              value={profile.email}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-gray-800 bg-[#1c1c1c] p-3 text-sm text-gray-600"
            />
          </div>
          <button type="submit"
            className="w-full rounded-2xl bg-[#f0b429] py-3 font-bold text-black hover:bg-[#e0a820]">
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Role */}
      <div className="card p-6 space-y-3">
        <h3 className="text-xl font-bold text-white">Role & Access</h3>
        <div className="flex items-center justify-between rounded-2xl border border-gray-800 p-4">
          <div>
            <p className="font-semibold text-white">Store Administrator</p>
            <p className="text-sm text-gray-500">Full access to orders, branches, and reports</p>
          </div>
          <span className="rounded-full bg-[#f0b429]/15 px-3 py-1 text-xs font-bold text-[#f0b429]">{roleLabel}</span>
        </div>
      </div>

      {/* Sign out */}
      <div className="card p-6">
        <h3 className="mb-4 text-xl font-bold text-white">Session</h3>
        <button type="button" onClick={onLogout}
          className="w-full rounded-2xl border border-red-900/50 py-3 text-sm font-bold text-red-400 hover:bg-red-950/30">
          <i className="fa fa-right-from-bracket mr-2"></i>Sign Out
        </button>
      </div>
    </section>
  );
}

export default ProfilePage;
