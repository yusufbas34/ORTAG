import styles from './MapView.module.css';

export interface MapCarMarker {
  id: string;
  topPct: number;
  leftPct: number;
}

interface MapViewProps {
  userTopPct?: number;
  userLeftPct?: number;
  cars?: MapCarMarker[];
}

/**
 * Temporary vector-pattern map placeholder ported from the mockup.
 * Replaced with a real Leaflet map in Stage 3 (route + distance calc).
 */
export function MapView({ userTopPct = 38, userLeftPct = 50, cars = [] }: MapViewProps) {
  return (
    <div className={styles.mapBg}>
      {cars.map((car) => (
        <div
          key={car.id}
          className={styles.carMarker}
          style={{ top: `${car.topPct}%`, left: `${car.leftPct}%` }}
        >
          <i className="fa-solid fa-car" />
        </div>
      ))}

      <div
        className={styles.marker}
        style={{ top: `${userTopPct}%`, left: `${userLeftPct}%` }}
      >
        <div className={styles.pinPulse} />
        <i className="fa-solid fa-location-dot" style={{ fontSize: '2.2rem', color: 'var(--primary)' }} />
      </div>
    </div>
  );
}
