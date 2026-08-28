// A single real audio clip used for every notification sound in the app
// (new ride/reservation offers, new chat messages) — no synthesized tones.
// Reused across calls (rather than a new Audio() per event) so a second
// notification arriving mid-playback restarts the clip instead of
// overlapping it.
const notificationAudio = typeof Audio !== 'undefined' ? new Audio('/sounds/ride-alert.mp3') : null;
if (notificationAudio) notificationAudio.volume = 0.9;

function playNotificationSound() {
  if (!notificationAudio) return;
  try {
    notificationAudio.currentTime = 0;
    void notificationAudio.play().catch(() => {
      // Autoplay can be blocked until the user has interacted with the page
      // at least once — the visual/vibration alert still gets through.
    });
  } catch {
    /* unsupported browser — skip silently */
  }
}

// A new chat message.
export function playChime() {
  playNotificationSound();
}

// A new ride/reservation offer — a driver needs to notice this even if
// they're not looking at the screen.
export function playAlert() {
  playNotificationSound();
}
