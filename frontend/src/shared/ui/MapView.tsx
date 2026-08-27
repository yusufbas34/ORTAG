import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';

export interface MapCarMarker {
  id: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][];
  cars?: MapCarMarker[];
}

const DEFAULT_CENTER: [number, number] = [41.0082, 28.9784];

function pinIcon(color: string, iconClass: string) {
  return L.divIcon({
    className: styles.pinIconWrapper,
    html: `<div class="${styles.pin}" style="background:${color}"><i class="${iconClass}"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

const pickupIcon = pinIcon('#00D26A', 'fa-solid fa-location-dot');
const dropoffIcon = pinIcon('#0F172A', 'fa-solid fa-flag-checkered');
const carIcon = L.divIcon({
  className: styles.pinIconWrapper,
  html: `<div class="${styles.carMarker}"><i class="fa-solid fa-car"></i></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
  }, [map, points]);

  return null;
}

export function MapView({ pickup, dropoff, routeCoordinates, cars = [] }: MapViewProps) {
  const boundsPoints: [number, number][] = [];
  if (pickup) boundsPoints.push([pickup.lat, pickup.lng]);
  if (dropoff) boundsPoints.push([dropoff.lat, dropoff.lng]);

  const routeLatLngs: [number, number][] | undefined = routeCoordinates?.map(([lng, lat]) => [lat, lng]);

  return (
    <div className={styles.mapWrapper}>
      <MapContainer center={DEFAULT_CENTER} zoom={13} zoomControl={false} className={styles.map}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {cars.map((car) => (
          <Marker key={car.id} position={[car.lat, car.lng]} icon={carIcon} />
        ))}

        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}

        {routeLatLngs && routeLatLngs.length > 1 && (
          <>
            <Polyline positions={routeLatLngs} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={routeLatLngs} pathOptions={{ color: '#00B85C', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
          </>
        )}

        <FitBounds points={boundsPoints} />
      </MapContainer>
    </div>
  );
}
