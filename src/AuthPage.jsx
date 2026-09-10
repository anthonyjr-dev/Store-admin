import { useState } from 'react';
import logo from '../assets/logo.png';

const LOGIN_URL = 'https://api.bfc.net.ph/auth/dashboard/login';

// user_type: 1=admin, 2=branch_admin, 3=superadmin
const ALLOWED_TYPES = new Set([1, 2, 3]);

function readError(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  return data.message || data.error || data.detail || fallback;
}

function AuthPage({ onAuthenticated }) {
  const [form, setForm] = useState({ branch_code: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ branch_code: form.branch_code, password: form.password }),
      });

      const text = await res.text();
      let data = null;
      if (text) { try { data = JSON.parse(text); } catch { data = text; } }

      if (!res.ok) throw new Error(readError(data, 'Login failed. Please check your credentials.'));

      const userType = data?.user?.user_type ?? data?.user_type ?? null;
      if (userType !== null && !ALLOWED_TYPES.has(Number(userType))) {
        throw new Error('Access denied. This portal is for admin accounts only.');
      }

      onAuthenticated(data || {}, form.branch_code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 py-10">

      {/* Brand */}
      <div className="text-center mb-8 select-none">
        <img src={logo} alt="But First, Coffee" className="mx-auto h-20 w-auto object-contain" />
        <div className="mt-5">
          <span className="inline-block border border-[#f0b429]/70 text-[#f0b429] text-[10px] font-bold uppercase tracking-[0.25em] px-5 py-2 rounded-full">
            Merchant Portal
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[360px] bg-[#1c1c1c] rounded-3xl p-7 shadow-2xl">
        <h2 className="text-white text-2xl font-black uppercase tracking-wide mb-1">Branch Sign In</h2>
        <p className="text-gray-500 text-sm mb-6">Access your branch orders and operations.</p>

        {error && (
          <div className="mb-5 rounded-xl p-3 text-sm bg-red-950/60 text-red-400 border border-red-900">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
              Branch Code
            </label>
            <input
              name="branch_code"
              type="text"
              autoComplete="username"
              placeholder="e.g. BGC-001"
              value={form.branch_code}
              onChange={update}
              required
              className="w-full bg-[#272727] text-white rounded-2xl border border-[#3a3a3a] px-4 py-3.5 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20 placeholder-gray-700 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={update}
              required
              className="w-full bg-[#272727] text-white rounded-2xl border border-[#3a3a3a] px-4 py-3.5 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20 placeholder-gray-700 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#f0b429] text-black font-black uppercase tracking-[0.15em] rounded-2xl py-4 text-sm disabled:opacity-50 hover:bg-[#e8ac24] active:bg-[#d9a020] transition-colors"
          >
            {busy ? 'Accessing…' : 'Access Branch'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <span className="text-gray-600 text-xs cursor-default">Skip login (demo) →</span>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-gray-700 text-xs text-center">
        Need access? Contact your BFC Area Manager.
      </p>
    </main>
  );
}

export default AuthPage;
