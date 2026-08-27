import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MiniMap.module.css';

interface MiniMapProps {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number } | null;
  height?: number;
  interactive?: boolean;
}

function dotIcon(color: string) {
  return L.divIcon({
    className: styles.dotWrapper,
    html: `<div class="${styles.dot}" style="background:${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const pickupIcon = dotIcon('#00D26A');
const dropoffIcon = dotIcon('#0F172A');
const carIcon = L.divIcon({
  className: styles.carWrapper,
  html: `<div class="${styles.car}"><i class="fa-solid fa-car"></i></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBoundsOnce({ points }: { points: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current) return;
    didFit.current = true;
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
    // Only frames the map once on mount — once the rider/driver starts
    // panning or zooming manually, live position updates shouldn't yank the
    // view back and fight their gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// A route preview for list items (reservation cards) and active-ride
// tracking — real routing geometry isn't stored per-item, so this draws a
// straight line between pickup/dropoff purely as a visual reference. When
// `driverLocation` is supplied it also plots a live car marker that moves as
// new positions arrive. Pass `interactive` to allow pinch/scroll zoom and
// dragging (used for the live trip-tracking maps, not the small list previews).
export function MiniMap({ pickup, dropoff, driverLocation, height = 120, interactive = false }: MiniMapProps) {
  const points: [number, number][] = [
    [pickup.lat, pickup.lng],
    [dropoff.lat, dropoff.lng],
  ];
  const initialBoundsPoints = driverLocation ? [...points, [driverLocation.lat, driverLocation.lng] as [number, number]] : points;

  return (
    <div className={[styles.wrapper, interactive ? styles.interactive : ''].join(' ')} style={{ height }}>
      <MapContainer
        center={points[0]}
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
        <Marker position={points[0]} icon={pickupIcon} />
        <Marker position={points[1]} icon={dropoffIcon} />
        {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon} />}
        <Polyline positions={points} pathOptions={{ color: '#00D26A', weight: 3, dashArray: '5 7' }} />
        <FitBoundsOnce points={initialBoundsPoints} />
      </MapContainer>
    </div>
  );
}
