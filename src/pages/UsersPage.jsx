import { useState, useEffect, useCallback } from 'react';
import { fetchUsers, fetchBranches, updateUser, createUser } from '../api.js';

const USER_TYPE_LABELS = { 1: 'Customer', 2: 'Branch Admin', 3: 'Super Admin' };

const BLANK_FORM = {
  name: '',
  email: '',
  password: '',
  user_type: 1,
  branch_id: '',
  isActive: true,
};

function UserModal({ user, branches, onSave, onClose, saving, saveError }) {
  const isNew = !user;
  const [form, setForm] = useState(
    isNew
      ? BLANK_FORM
      : {
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
    if (isNew) {
      payload.email = form.email;
      payload.password = form.password;
    } else if (form.password) {
      payload.password = form.password;
    }
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{isNew ? 'Add User' : 'Edit User'}</h3>
            {!isNew && <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
            <i className="fa fa-xmark text-slate-500"></i>
          </button>
        </div>

        {saveError && <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}

        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-700">
            Name
            <input name="name" value={form.name} onChange={update} required
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>

          {isNew && (
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <input name="email" type="email" value={form.email} onChange={update} required
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
            </label>
          )}

          <label className="block text-sm font-semibold text-slate-700">
            {isNew ? 'Password' : 'New Password'}
            <input name="password" type="password" value={form.password} onChange={update} required={isNew}
              placeholder={isNew ? '' : 'Leave blank to keep current'}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Role
            <select name="user_type" value={form.user_type} onChange={update}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
              <option value={1}>Customer</option>
              <option value={2}>Branch Admin</option>
              <option value={3}>Super Admin</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Branch Assignment
            <select name="branch_id" value={form.branch_id} onChange={update}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
              <option value="">— No branch (Super Admin) —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={update}
              className="h-4 w-4 rounded accent-orange-500" />
            Active
          </label>

          <button type="submit" disabled={saving}
            className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60">
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
    ? 'bg-purple-100 text-purple-700'
    : user.user_type === 2
    ? 'bg-orange-100 text-orange-700'
    : 'bg-slate-100 text-slate-600';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>{typeLabel}</span>
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">{branchName}</td>
      <td className="py-3 px-4">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-3 px-4">
        <button type="button" onClick={() => onEdit(user)}
          className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
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
  const [modal, setModal] = useState(null); // null = closed, false = new user, object = edit user
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchBranches().then((b) => setBranches(Array.isArray(b) ? b : [])).catch(() => {});
  }, []);

  function openEdit(user) {
    setSaveError('');
    setModal(user);
  }

  function openAdd() {
    setSaveError('');
    setModal(false);
  }

  async function handleSave(form) {
    setSaving(true);
    setSaveError('');
    try {
      if (modal === false) {
        // Create new user
        const created = await createUser(form, token);
        setUsers((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      } else {
        // Update existing user
        const updated = await updateUser(modal.id, form, token);
        setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
      }
      setModal(null);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <section className="space-y-6">
      <div className="card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="mt-1 text-slate-500">{total} users total</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative max-w-xs w-full">
            <i className="fa fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name…"
              className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>
          <button type="button" onClick={openAdd}
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 whitespace-nowrap">
            <i className="fa fa-user-plus"></i> Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-3 font-bold">✕</button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <i className="fa fa-spinner fa-spin text-4xl"></i>
            <p className="mt-3 font-semibold">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <i className="fa fa-users text-4xl opacity-30"></i>
            <p className="mt-3 font-semibold">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4"></th>
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
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Prev
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
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
