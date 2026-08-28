import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Leaflet caches its container's pixel size and only re-measures it on an
// explicit invalidateSize() call. If the container is first measured while
// hidden or mid-transition (e.g. rendered behind a menu overlay, inside a
// card that hasn't finished laying out), that stale cache can make even the
// rider/driver's own pinch/zoom gestures compute degenerate tile bounds and
// throw "Attempted to load an infinite number of tiles" — a crash our
// setView/fitBounds try/catch can't prevent, since the user's own gesture
// is what triggers it, not our code. Watching the container with a
// ResizeObserver keeps Leaflet's cached size honest.
export function useMapAutoResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

// Drop this inside a <MapContainer> alongside the other helper components
// (FitBounds/FitBoundsOnce) — it renders nothing, it just runs the hook.
export function MapAutoResize() {
  useMapAutoResize();
  return null;
}
