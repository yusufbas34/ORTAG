import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
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
  const pickupPoint: [number, number] = [pickup.lat, pickup.lng];
  const dropoffPoint: [number, number] = [dropoff.lat, dropoff.lng];
  const hasRoute = !!routeGeometry?.coordinates?.length;
  const routePoints: [number, number][] = hasRoute
    ? routeGeometry!.coordinates.map(([lng, lat]) => [lat, lng])
    : [pickupPoint, dropoffPoint];

  const boundsPoints = driverLocation ? [...routePoints, [driverLocation.lat, driverLocation.lng] as [number, number]] : routePoints;

  return (
    <div className={[styles.wrapper, interactive ? styles.interactive : ''].join(' ')} style={{ height }}>
      <MapContainer
        center={pickupPoint}
        zoom={12}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        attributionControl={false}
        className={styles.map}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
      </MapContainer>
    </div>
  );
}
