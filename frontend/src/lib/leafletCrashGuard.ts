// React error boundaries only catch errors thrown during render/commit or
// inside React's own synthetic event dispatch — NOT errors thrown from a
// third-party library's raw DOM event listeners. Leaflet wires its own
// pan/zoom/pinch handling directly with addEventListener, so a stale
// container-size cache can make the rider/driver's own map gesture throw
// "Attempted to load an infinite number of tiles" completely outside
// React's reach, with no error boundary able to catch it. This installs a
// narrow, last-resort guard for that one known, harmless Leaflet failure
// mode so a bad gesture degrades the map instead of leaving the page stuck.
const KNOWN_HARMLESS_MESSAGES = ['Attempted to load an infinite number of tiles'];

function isKnownHarmless(message: unknown): boolean {
  return typeof message === 'string' && KNOWN_HARMLESS_MESSAGES.some((known) => message.includes(known));
}

export function installLeafletCrashGuard() {
  window.addEventListener('error', (event) => {
    if (isKnownHarmless(event.error?.message ?? event.message)) {
      console.error('[leafletCrashGuard] bilinen zararsız harita hatası bastırıldı', event.error ?? event.message);
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string } | undefined;
    if (isKnownHarmless(reason?.message)) {
      console.error('[leafletCrashGuard] bilinen zararsız harita hatası bastırıldı (promise)', reason);
      event.preventDefault();
    }
  });
}
