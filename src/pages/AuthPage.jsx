import { useState } from 'react';

const API_BASE_URL = 'https://apigateway.webtour.ph/auth';

const ALIASES = {
  admin: 'anthonyjr.decastro@gmail.com',
  Admin: 'anthonyjr.decastro@gmail.com',
  ADMIN: 'anthonyjr.decastro@gmail.com',
  superadmin: 'anthonyjr.decastro@gmail.com',
  Superadmin: 'anthonyjr.decastro@gmail.com',
  SuperAdmin: 'anthonyjr.decastro@gmail.com',
  SUPERADMIN: 'anthonyjr.decastro@gmail.com',
  'super admin': 'anthonyjr.decastro@gmail.com',
  'Super Admin': 'anthonyjr.decastro@gmail.com',
  'SUPER ADMIN': 'anthonyjr.decastro@gmail.com',
  makatistore: 'makatistore@butfirstcoffe.ph',
  MakatiStore: 'makatistore@butfirstcoffe.ph',
  MAKATISTORE: 'makatistore@butfirstcoffe.ph',
};

const readErrorMessage = (payload, fallback) => {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.message || payload.error || payload.detail || fallback;
};

function AuthPage({ onAuthenticated }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    setIsSubmitting(true);

    try {
      const payload = { ...form };
      if (ALIASES[payload.email]) payload.email = ALIASES[payload.email];

      const response = await fetch(`${API_BASE_URL}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data = null;
      if (text) { try { data = JSON.parse(text); } catch { data = text; } }

      if (!response.ok) throw new Error(readErrorMessage(data, 'The request could not be completed.'));

      onAuthenticated(data || {}, payload.email || form.email);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell min-h-screen bg-[#fff7ed] px-4 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden text-slate-900 lg:block">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">Store Admin</p>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight">Manage your branches and orders from one place.</h1>
          <div className="mt-8 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm">
              <i className="fa fa-shield-halved text-xl text-orange-500"></i>
              <span>Secure sign-in for store administrators.</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm">
              <i className="fa fa-bag-shopping text-xl text-orange-500"></i>
              <span>Track orders, update status, and manage branches in real time.</span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl shadow-blue-900/10 sm:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Access your admin dashboard.</p>
          </div>

          {status.message && (
            <div className={`mb-5 rounded-2xl p-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {status.message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-semibold text-slate-700">
              Username / Email
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                name="email"
                type="text"
                autoComplete="username"
                value={form.email}
                onChange={update}
                required
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={update}
                required
              />
            </label>
            <button
              className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-500/25 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
