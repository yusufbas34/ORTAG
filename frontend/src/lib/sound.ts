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

// A slightly more attention-grabbing double-beep for a new ride/reservation
// offer — a driver needs to notice this even if they're not looking at the
// screen.
export function playAlert() {
  playTones([660, 660], 160, 0.1);
}
