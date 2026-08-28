import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStyle } from '../hooks/useMapStyle';
import { MapAutoResize } from '../hooks/useMapAutoResize';
import { MapStylePicker } from './MapStylePicker';
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

    // The map container's CSS size can still be 0x0 on the very first paint
    // (its height comes from an absolute-positioned ancestor chain that
    // hasn't settled yet). Calling setView/fitBounds before that makes
    // Leaflet compute degenerate pixel bounds and throw "Attempted to load
    // an infinite number of tiles" — with no error boundary in the tree,
    // that single throw used to take the whole app down to a blank screen.
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      try {
        if (points.length === 1) {
          map.setView(points[0], 15);
        } else {
          map.fitBounds(L.latLngBounds(points), { padding: [60, 60] });
        }
      } catch (err) {
        console.error('[MapView] harita odaklanamadı', err);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [map, points]);

  return null;
}

export function MapView({ pickup, dropoff, routeCoordinates, cars = [] }: MapViewProps) {
  const { style, styleId, setStyleId } = useMapStyle();
  const boundsPoints: [number, number][] = [];
  if (pickup) boundsPoints.push([pickup.lat, pickup.lng]);
  if (dropoff) boundsPoints.push([dropoff.lat, dropoff.lng]);

  const routeLatLngs: [number, number][] | undefined = routeCoordinates?.map(([lng, lat]) => [lat, lng]);

  return (
    <div className={styles.mapWrapper}>
      <MapContainer center={DEFAULT_CENTER} zoom={13} zoomControl={false} className={styles.map}>
        <TileLayer key={style.id} attribution={style.attribution} url={style.url} maxZoom={style.maxZoom} />

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
        <MapAutoResize />
      </MapContainer>

      <MapStylePicker value={styleId} onChange={setStyleId} className={styles.stylePicker} />
    </div>
  );
}
