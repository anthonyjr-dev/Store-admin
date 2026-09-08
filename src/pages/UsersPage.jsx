import { useState, useEffect, useCallback } from 'react';
import { fetchUsers, fetchBranches, updateUser, createUser } from '../api.js';

const USER_TYPE_LABELS = { 1: 'Customer', 2: 'Branch Admin', 3: 'Super Admin' };

const BLANK_FORM = { name: '', email: '', password: '', user_type: 1, branch_id: '', isActive: true };

const INPUT = 'mt-1 w-full rounded-2xl border border-gray-700 bg-[#252525] px-4 py-2.5 text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20';

function UserModal({ user, branches, onSave, onClose, saving, saveError }) {
  const isNew = !user;
  const [form, setForm] = useState(
    isNew ? BLANK_FORM : {
      name: user.name || '',
      email: user.email || '',
      password: '',
      user_type: user.user_type ?? 1,
      branch_id: user.branch_id ?? '',
      isActive: user.isActive ?? true,
    }
  );

  function update(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function submit(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      user_type: parseInt(form.user_type),
      branch_id: form.branch_id === '' ? null : parseInt(form.branch_id),
      isActive: form.isActive,
    };
    if (isNew) { payload.email = form.email; payload.password = form.password; }
    else if (form.password) { payload.password = form.password; }
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-[#1c1c1c] border border-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{isNew ? 'Add User' : 'Edit User'}</h3>
            {!isNew && <p className="mt-0.5 text-xs text-gray-500">{user.email}</p>}
          </div>
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
            <input name="name" value={form.name} onChange={update} required className={INPUT} />
          </label>

          {isNew && (
            <label className="block text-sm font-semibold text-gray-300">
              Email
              <input name="email" type="email" value={form.email} onChange={update} required className={INPUT} />
            </label>
          )}

          <label className="block text-sm font-semibold text-gray-300">
            {isNew ? 'Password' : 'New Password'}
            <input name="password" type="password" value={form.password} onChange={update} required={isNew}
              placeholder={isNew ? '' : 'Leave blank to keep current'} className={INPUT} />
          </label>

          <label className="block text-sm font-semibold text-gray-300">
            Role
            <select name="user_type" value={form.user_type} onChange={update} className={INPUT}>
              <option value={1}>Customer</option>
              <option value={2}>Branch Admin</option>
              <option value={3}>Super Admin</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-gray-300">
            Branch Assignment
            <select name="branch_id" value={form.branch_id} onChange={update} className={INPUT}>
              <option value="">— No branch (Super Admin) —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-300">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={update}
              className="h-4 w-4 rounded accent-[#f0b429]" />
            Active
          </label>

          <button type="submit" disabled={saving}
            className="w-full rounded-2xl bg-[#f0b429] py-3 font-bold text-black disabled:opacity-50">
            {saving
              ? <><i className="fa fa-spinner fa-spin mr-2"></i>Saving…</>
              : isNew ? 'Create User' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserRow({ user, branches, onEdit }) {
  const branchName = user.branch_id
    ? (branches.find((b) => b.id === user.branch_id)?.name ?? `Branch #${user.branch_id}`)
    : '—';
  const typeLabel = USER_TYPE_LABELS[user.user_type] ?? `Type ${user.user_type}`;
  const typeColor = user.user_type >= 3
    ? 'bg-purple-950/50 text-purple-400'
    : user.user_type === 2
    ? 'bg-[#f0b429]/15 text-[#f0b429]'
    : 'bg-[#252525] text-gray-500';

  return (
    <tr className="border-b border-gray-800 transition hover:bg-white/3">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0b429]/15 text-sm font-bold text-[#f0b429]">
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>{typeLabel}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{branchName}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold
          ${user.isActive ? 'bg-green-950/50 text-green-400' : 'bg-red-950/50 text-red-400'}`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <button type="button" onClick={() => onEdit(user)}
          className="rounded-xl border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-400 hover:bg-white/5">
          <i className="fa fa-pen mr-1"></i>Edit
        </button>
      </td>
    </tr>
  );
}

function UsersPage({ token }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [error, setError] = useState('');
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers(page, LIMIT, search || undefined, token);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotal(data.total ?? 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetchBranches().then((b) => setBranches(Array.isArray(b) ? b : [])).catch(() => {});
  }, []);

  function openEdit(user) { setSaveError(''); setModal(user); }
  function openAdd() { setSaveError(''); setModal(false); }

  async function handleSave(form) {
    setSaving(true); setSaveError('');
    try {
      if (modal === false) {
        const created = await createUser(form, token);
        setUsers((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      } else {
        const updated = await updateUser(modal.id, form, token);
        setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
      }
      setModal(null);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <section className="space-y-6">
      <div className="card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="mt-1 text-gray-500">{total} users total</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row w-full md:w-auto">
          <div className="relative max-w-xs w-full">
            <i className="fa fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-600"></i>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name…"
              className="w-full rounded-2xl border border-gray-700 bg-[#252525] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20"
            />
          </div>
          <button type="button" onClick={openAdd}
            className="flex items-center gap-2 whitespace-nowrap rounded-2xl bg-[#f0b429] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e0a820]">
            <i className="fa fa-user-plus"></i> Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-900/50 bg-red-950/50 p-4 text-sm text-red-400">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <i className="fa fa-spinner fa-spin text-4xl text-gray-600"></i>
            <p className="mt-3 font-semibold text-gray-500">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fa fa-users text-4xl text-gray-700"></i>
            <p className="mt-3 font-semibold text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-800 bg-[#252525] text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} branches={branches} onEdit={openEdit} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-xl border border-gray-700 bg-[#252525] px-4 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 disabled:opacity-40">
                Prev
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-gray-700 bg-[#252525] px-4 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modal !== null && (
        <UserModal
          user={modal === false ? null : modal}
          branches={branches}
          onSave={handleSave}
          onClose={() => { setModal(null); setSaveError(''); }}
          saving={saving}
          saveError={saveError}
        />
      )}
    </section>
  );
}

export default UsersPage;
