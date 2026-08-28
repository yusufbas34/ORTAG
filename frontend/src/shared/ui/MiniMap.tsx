import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStyle } from '../hooks/useMapStyle';
import { MapAutoResize } from '../hooks/useMapAutoResize';
import { MapStylePicker } from './MapStylePicker';
import styles from './MiniMap.module.css';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

interface MiniMapProps {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  routeGeometry?: RouteGeometry | null;
  driverLocation?: { lat: number; lng: number } | null;
  height?: number;
  interactive?: boolean;
}

const pickupIcon = L.divIcon({
  className: styles.pickupWrapper,
  html: `<div class="${styles.pickupPulse}"></div><div class="${styles.pickupDot}"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const dropoffIcon = L.divIcon({
  className: styles.pinWrapper,
  html: `<div class="${styles.pin}"><i class="fa-solid fa-flag-checkered"></i></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26],
});

const carIcon = L.divIcon({
  className: styles.carWrapper,
  html: `<div class="${styles.car}"><i class="fa-solid fa-car"></i></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function FitBoundsOnce({ points }: { points: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current) return;
    didFit.current = true;
    // Deferred a frame + wrapped defensively: if the container's CSS size
    // isn't settled yet, fitBounds/setView can throw ("infinite number of
    // tiles") and, with no error boundary above it, take the whole app down.
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      try {
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
      } catch (err) {
        console.error('[MiniMap] harita odaklanamadı', err);
      }
    });
    return () => cancelAnimationFrame(raf);
    // Only frames the map once on mount — once the rider/driver starts
    // panning or zooming manually, live position updates shouldn't yank the
    // view back and fight their gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// Trip preview + live tracking map. When `routeGeometry` (the actual OSRM
// road path) is available it's drawn turn-by-turn like a navigation app;
// otherwise it falls back to a dashed as-the-crow-flies line between the two
// points (only relevant for rides created before route storage existed).
// Pass `interactive` to allow pinch/scroll zoom and dragging.
export function MiniMap({ pickup, dropoff, routeGeometry, driverLocation, height = 120, interactive = false }: MiniMapProps) {
  const [expanded, setExpanded] = useState(false);
  const { style, styleId, setStyleId } = useMapStyle();
  const pickupPoint: [number, number] = [pickup.lat, pickup.lng];
  const dropoffPoint: [number, number] = [dropoff.lat, dropoff.lng];
  const hasRoute = !!routeGeometry?.coordinates?.length;
  const routePoints: [number, number][] = hasRoute
    ? routeGeometry!.coordinates.map(([lng, lat]) => [lat, lng])
    : [pickupPoint, dropoffPoint];

  const boundsPoints = driverLocation ? [...routePoints, [driverLocation.lat, driverLocation.lng] as [number, number]] : routePoints;

  function renderMapContent(mapInteractive: boolean) {
    return (
      <MapContainer
        center={pickupPoint}
        zoom={12}
        zoomControl={mapInteractive}
        dragging={mapInteractive}
        scrollWheelZoom={mapInteractive}
        doubleClickZoom={mapInteractive}
        touchZoom={mapInteractive}
        attributionControl={false}
        className={styles.map}
      >
        <TileLayer key={style.id} attribution={style.attribution} url={style.url} maxZoom={style.maxZoom} />

        {hasRoute ? (
          <>
            {/* Light casing underneath the colored line gives the route a
                crisp navigation-app look and keeps it legible over any tile. */}
            <Polyline positions={routePoints} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={routePoints} pathOptions={{ color: '#00B85C', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
          </>
        ) : (
          <Polyline positions={routePoints} pathOptions={{ color: '#00D26A', weight: 3, dashArray: '5 7' }} />
        )}

        <Marker position={pickupPoint} icon={pickupIcon} />
        <Marker position={dropoffPoint} icon={dropoffIcon} />
        {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon} />}
        <FitBoundsOnce points={boundsPoints} />
        <MapAutoResize />
      </MapContainer>
    );
  }

  return (
    <>
      <div className={[styles.wrapper, interactive ? styles.interactive : ''].join(' ')} style={{ height }}>
        {renderMapContent(interactive)}
        <button className={styles.expandBtn} onClick={() => setExpanded(true)} aria-label="Haritayı büyüt" type="button">
          <i className="fa-solid fa-expand" />
        </button>
      </div>

      {expanded && (
        <div className={styles.fullscreenOverlay}>
          <button className={styles.fullscreenClose} onClick={() => setExpanded(false)} aria-label="Haritayı kapat" type="button">
            <i className="fa-solid fa-xmark" />
          </button>
          <MapStylePicker value={styleId} onChange={setStyleId} className={styles.fullscreenStylePicker} />
          <div className={styles.fullscreenMap}>{renderMapContent(true)}</div>
        </div>
      )}
    </>
  );
}
