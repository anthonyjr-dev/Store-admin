let audioCtx = null;

// --- persisted "sound enabled" flag ---------------------------------------
// Once the operator has activated sound (any first interaction, or the
// one-time button), we remember it so a refresh / reopen restores the state
// without asking again.
const LS_KEY = 'bfc.soundEnabled';

export function isSoundEnabled() {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}

function setSoundEnabledFlag(on) {
  try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** True while audio can't play yet (no context, or Chrome still has it suspended). */
export function audioBlocked() {
  return !audioCtx || audioCtx.state !== 'running';
}

async function getCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Try to (re)activate audio. Call it on load to restore a previously-enabled
 * state, or from a click for the one-time activation button. Resolves to true
 * only when the context is actually running. Chrome blocks resume() without a
 * gesture until the origin has enough media engagement — this call is then a
 * harmless no-op and the gesture listeners in unlockAudio() finish the job.
 */
export async function activateAudio({ persist = true } = {}) {
  try {
    const ctx = await getCtx();
    if (ctx.state === 'running') {
      if (persist) setSoundEnabledFlag(true);
      return true;
    }
  } catch { /* blocked — will unlock on the next gesture */ }
  return false;
}

function playTone(freq, startTime, duration, volume, ctx, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// 3-note ascending chime for new orders
export async function playNewOrderSound() {
  try {
    const ctx = await getCtx();
    const now = ctx.currentTime;
    playTone(880,  now,        0.45, 0.45, ctx);
    playTone(1100, now + 0.18, 0.45, 0.45, ctx);
    playTone(1320, now + 0.36, 0.55, 0.5,  ctx);
  } catch {
    // AudioContext blocked; ignore
  }
}

// Fire the new-order chime `times` times in sequence (non-blocking). Used both
// when an order arrives and for the recurring reminder while it sits unhandled.
export function playNewOrderAlert(times = 5, gapMs = 1000) {
  let n = 0;
  const fire = () => {
    playNewOrderSound();
    if (++n < times) setTimeout(fire, gapMs);
  };
  fire();
}

// Single soft ping for status updates
export async function playStatusUpdateSound() {
  try {
    const ctx = await getCtx();
    const now = ctx.currentTime;
    playTone(660, now, 0.35, 0.25, ctx);
  } catch {
    // ignore
  }
}

// Unlock and keep AudioContext alive across tab bg/fg cycles.
// The first real interaction (anywhere in the app, incl. the Orders page)
// resumes the context and persists the enabled flag; later gestures keep it
// running after tab background/foreground cycles.
export function unlockAudio() {
  const resume = async () => {
    try {
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if (audioCtx.state === 'running') setSoundEnabledFlag(true);
    } catch { /* ignore — retried on the next gesture */ }
  };
  // Permanent listeners — re-resume on every gesture so context stays running
  document.addEventListener('click',      resume, true);
  document.addEventListener('keydown',    resume, true);
  document.addEventListener('touchstart', resume, true);
  // Returning operator: attempt an immediate restore (no-op if Chrome blocks
  // it without a gesture — the listeners above then finish on first click).
  if (isSoundEnabled()) resume();
}
