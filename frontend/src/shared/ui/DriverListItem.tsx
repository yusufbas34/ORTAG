import styles from './DriverListItem.module.css';

interface DriverListItemProps {
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  distanceKm: number;
  etaMin: number;
  onClick?: () => void;
}

export function DriverListItem({ name, vehiclePlate, vehicleModel, distanceKm, etaMin, onClick }: DriverListItemProps) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.avatar}>
        <i className="fa-solid fa-user" />
      </div>
      <div className={styles.details}>
        <h4>{name}</h4>
        <p>
          {vehicleModel} • {vehiclePlate}
        </p>
      </div>
      <div className={styles.meta}>
        <div className={styles.distance}>{distanceKm} km</div>
        <div className={styles.eta}>{etaMin} dk</div>
      </div>
    </div>
  );
}
