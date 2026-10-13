/**
 * Admin Alerts Engine
 * Handles repeating audio chimes (Web Audio API), document title flashing,
 * screen wake locks, and sound blockage detection for store operators.
 */

let audioCtx: AudioContext | null = null;
let chimeIntervalId: number | null = null;
let titleIntervalId: number | null = null;
let originalTitle = document.title || 'Plinkit Operator';
let wakeLockSentinel: WakeLockSentinel | null = null;

/**
 * Initializes or retrieves the Web Audio context.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/**
 * Plays a pleasant 2-tone bell chime via Web Audio synthesis.
 * Tone 1: 587.33 Hz (D5)
 * Tone 2: 880.00 Hz (A5)
 */
export async function playOrderChime(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') {
      return false;
    }

    const now = ctx.currentTime;

    // First tone (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.15);

    gain2.gain.setValueAtTime(0.001, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.4, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);

    return true;
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
    return false;
  }
}

/**
 * Tests if the browser allows audio playback and attempts to unlock it.
 * Returns true if audio context is running, false if blocked.
 */
export async function testAndUnlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

/**
 * Starts a repeating chime every 3.5 seconds until stopped.
 */
export function startRepeatingChime(): void {
  if (chimeIntervalId !== null) return;
  // Play immediately once
  playOrderChime();
  chimeIntervalId = window.setInterval(() => {
    playOrderChime();
  }, 3500);
}

/**
 * Stops the repeating chime.
 */
export function stopRepeatingChime(): void {
  if (chimeIntervalId !== null) {
    clearInterval(chimeIntervalId);
    chimeIntervalId = null;
  }
}

/**
 * Starts flashing the document title with a new order alert.
 */
export function startFlashingTitle(orderCount = 1): void {
  if (titleIntervalId !== null) return;
  originalTitle = document.title || 'Plinkit Operator';

  let toggle = false;
  titleIntervalId = window.setInterval(() => {
    toggle = !toggle;
    if (toggle) {
      document.title = `🔔 (${orderCount}) NEW ORDER!`;
    } else {
      document.title = `⚡ Plinkit Operator`;
    }
  }, 1000);
}

/**
 * Stops flashing the document title and restores the original title.
 */
export function stopFlashingTitle(): void {
  if (titleIntervalId !== null) {
    clearInterval(titleIntervalId);
    titleIntervalId = null;
  }
  document.title = originalTitle || 'Plinkit Operator';
}

/**
 * Requests a screen wake lock to keep the operator's screen on.
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.warn('Screen wake lock request failed:', err);
    return false;
  }
}

/**
 * Releases the screen wake lock.
 */
export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // Ignore release errors
    }
    wakeLockSentinel = null;
  }
}

/**
 * Sets up visibility listener to re-acquire wake lock if tab returns to foreground.
 */
export function setupWakeLockVisibilityListener(shouldBeActive: () => boolean): () => void {
  const handler = async () => {
    if (document.visibilityState === 'visible' && shouldBeActive() && !wakeLockSentinel) {
      await requestScreenWakeLock();
    }
  };

  document.addEventListener('visibilitychange', handler);
  return () => {
    document.removeEventListener('visibilitychange', handler);
  };
}
