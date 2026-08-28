// Short notification chimes generated with the Web Audio API — no audio
// file to fetch/bundle, and it works the same in the browser and inside
// the Capacitor WebView. Each call creates a throwaway AudioContext since
// these fire rarely (a new offer, a new chat message); keeping one alive
// permanently isn't worth the added state.
function playTones(frequencies: number[], durationMs: number, gainValue: number) {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gain.gain.value = gainValue;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const startAt = ctx.currentTime + (i * durationMs) / 1000;
      const endAt = startAt + durationMs / 1000;
      gain.gain.setValueAtTime(gainValue, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, endAt);
      oscillator.start(startAt);
      oscillator.stop(endAt);
    });

    setTimeout(() => ctx.close().catch(() => {}), frequencies.length * durationMs + 200);
  } catch {
    // Autoplay restrictions or an unsupported browser — silently skip the
    // sound, the visual notification still gets through.
  }
}

// A short two-tone "ding" for a new chat message.
export function playChime() {
  playTones([880, 1320], 140, 0.08);
}

// Reused across calls (rather than a new Audio() per alert) so a second
// offer arriving mid-playback restarts the clip instead of overlapping it.
const rideAlertAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/ride-alert.mp3') : null;
if (rideAlertAudio) rideAlertAudio.volume = 0.9;

// A driver needs to notice a new ride/reservation offer even if they're not
// looking at the screen — this plays a real audio clip instead of a
// synthesized tone, which reads as more urgent.
export function playAlert() {
  if (!rideAlertAudio) return;
  try {
    rideAlertAudio.currentTime = 0;
    void rideAlertAudio.play().catch(() => {
      // Autoplay can be blocked until the user has interacted with the page
      // at least once — the visual/vibration alert still gets through.
    });
  } catch {
    /* unsupported browser — skip silently */
  }
}
