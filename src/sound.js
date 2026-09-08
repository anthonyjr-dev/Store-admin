let audioCtx = null;

async function getCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
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

// Serialises new-order chime sequences so they never overlap.
// At most one sequence can be queued behind the currently-playing one;
// any extra calls while a sequence is already waiting are dropped.
let _soundChain = Promise.resolve();
let _hasQueued   = false;

// 3-note ascending chime, repeated 5 times per order
export function playNewOrderSound() {
  if (_hasQueued) return; // one already queued — don't stack more
  _hasQueued = true;

  _soundChain = _soundChain.then(async () => {
    _hasQueued = false; // this sequence is now running
    try {
      const ctx  = await getCtx();
      const now  = ctx.currentTime;
      const gap  = 1.1; // seconds between each chime

      for (let i = 0; i < 5; i++) {
        const t = now + i * gap;
        playTone(880,  t,        0.45, 0.45, ctx);
        playTone(1100, t + 0.18, 0.45, 0.45, ctx);
        playTone(1320, t + 0.36, 0.55, 0.5,  ctx);
      }

      // Wait for all 5 chimes to finish before releasing the chain
      await new Promise(r => setTimeout(r, (5 * gap + 0.6) * 1000));
    } catch {
      // AudioContext blocked; ignore
    }
  });
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

// Unlock and keep AudioContext alive across tab bg/fg cycles
export function unlockAudio() {
  const resume = () => {
    if (!audioCtx || audioCtx.state === 'closed') {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    } else if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  // Permanent listeners — re-resume on every gesture so context stays running
  document.addEventListener('click',      resume, true);
  document.addEventListener('keydown',    resume, true);
  document.addEventListener('touchstart', resume, true);
}
