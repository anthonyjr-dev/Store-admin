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
