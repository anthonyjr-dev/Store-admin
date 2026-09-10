import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { API_BASE as BASE } from '../config.js';

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.detail || 'Request failed';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

function decodeFrame(video, canvas, ctx, detector) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });
  return code ? code.data : null;
}

export default function GivePointsModal({ token, onClose }) {
  const [searchQ, setSearchQ] = useState('');
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const doLookup = useCallback(async (q) => {
    const trimmed = q?.trim();
    if (!trimmed) return;
    setLookupBusy(true);
    setError('');
    setUser(null);
    try {
      const data = await apiFetch(`/rewards/lookup-user?q=${encodeURIComponent(trimmed)}`, token);
      setUser(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLookupBusy(false);
    }
  }, [token]);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setScanning(true);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scan = () => {
        if (!streamRef.current || !video) return;
        const val = decodeFrame(video, canvas, ctx, null);
        if (val) {
          stopCamera();
          setSearchQ(val);
          doLookup(val);
          return;
        }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      setError('Camera error: ' + (e.message || e.name));
    }
  }, [stopCamera, doLookup]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !points) return;
    setSubmitBusy(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/rewards/give-points', token, {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          points: Number(points),
          description: description.trim() || undefined,
        }),
      });
      setSuccess(`Successfully gave ${points} pts to ${user.name}!`);
      setUser(null);
      setSearchQ('');
      setPoints('');
      setDescription('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4">
      {/* hidden canvas for jsQR frame decoding */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-md rounded-3xl bg-[#1c1c1c] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-black uppercase tracking-wide">Give Points</h2>
            <p className="text-gray-500 text-sm">Scan QR or search customer</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#272727] text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* QR Scanner */}
        <div className="mb-4">
          {scanning ? (
            <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-[#f0b429] rounded-2xl opacity-80" />
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-xl px-3 py-1.5 text-sm font-semibold"
              >
                Stop
              </button>
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60 px-4">
                Point at customer QR code
              </p>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-dashed border-[#f0b429]/40 bg-[#272727] py-5 text-[#f0b429] hover:bg-[#2a2a2a] transition-colors"
            >
              <i className="fa fa-qrcode text-2xl" />
              <span className="font-bold text-sm">Scan Customer QR Code</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#2a2a2a]" />
          <span className="text-gray-600 text-xs uppercase tracking-widest">or search</span>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
        </div>

        {/* Manual search */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLookup(searchQ)}
            placeholder="Referral code, email, or phone"
            style={{ fontSize: '16px' }}
            className="flex-1 bg-[#272727] text-white rounded-2xl border border-[#3a3a3a] px-4 py-3 outline-none focus:border-[#f0b429] placeholder-gray-700 transition-colors"
          />
          <button
            onClick={() => doLookup(searchQ)}
            disabled={lookupBusy || !searchQ.trim()}
            className="bg-[#272727] border border-[#3a3a3a] text-[#f0b429] rounded-2xl px-4 py-3 hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors"
          >
            {lookupBusy
              ? <i className="fa fa-spinner fa-spin" />
              : <i className="fa fa-magnifying-glass" />}
          </button>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mb-4 rounded-xl p-3 text-sm bg-red-950/60 text-red-400 border border-red-900">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-xl p-3 text-sm bg-green-950/60 text-green-400 border border-green-900 flex items-center gap-2">
            <i className="fa fa-circle-check" /> {success}
          </div>
        )}

        {/* User card + form */}
        {user && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-[#272727] border border-[#f0b429]/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 shrink-0 rounded-full bg-[#f0b429]/15 flex items-center justify-center text-[#f0b429] font-black text-lg">
                  {(user.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{user.name}</p>
                  <p className="text-gray-500 text-xs truncate">{user.email}</p>
                  {user.phone && <p className="text-gray-600 text-xs">{user.phone}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[#f0b429] font-black text-xl leading-tight">
                    {(user.totalPoints ?? 0).toLocaleString()}
                  </p>
                  <p className="text-gray-600 text-[10px] uppercase tracking-widest">pts</p>
                </div>
              </div>
              {user.referral_code && (
                <p className="mt-2 text-xs text-gray-600">
                  Code: <span className="text-gray-400 font-mono">{user.referral_code}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                Points to Give
              </label>
              <input
                type="number"
                min="1"
                value={points}
                onChange={e => setPoints(e.target.value)}
                placeholder="e.g. 50"
                required
                style={{ fontSize: '16px' }}
                className="w-full bg-[#272727] text-white rounded-2xl border border-[#3a3a3a] px-4 py-3.5 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20 placeholder-gray-700 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                Description <span className="normal-case text-gray-600">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Birthday bonus, in-store promo"
                style={{ fontSize: '16px' }}
                className="w-full bg-[#272727] text-white rounded-2xl border border-[#3a3a3a] px-4 py-3.5 outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20 placeholder-gray-700 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitBusy || !points}
              className="w-full bg-[#f0b429] text-black font-black uppercase tracking-[0.15em] rounded-2xl py-4 text-sm disabled:opacity-50 hover:bg-[#e8ac24] active:bg-[#d9a020] transition-colors"
            >
              {submitBusy ? 'Giving Points…' : `Give ${points || '?'} Points`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
