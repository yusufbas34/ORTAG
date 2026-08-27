import { MiniMap } from '../../shared/ui/MiniMap';
import type { DriverContactInfo, Ride } from './types';
import styles from './ActiveRideCard.module.css';

interface ActiveRideCardProps {
  ride: Ride;
  driver: DriverContactInfo | null;
  driverLocation: { lat: number; lng: number } | null;
  cancelling: boolean;
  onCancel: () => void;
  onDismiss: () => void;
}

const WAITING_STATUSES = new Set(['REQUESTED', 'DISPATCHING']);
const ON_THE_WAY_STATUSES = new Set(['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS']);

export function ActiveRideCard({ ride, driver, driverLocation, cancelling, onCancel, onDismiss }: ActiveRideCardProps) {
  const isWaiting = WAITING_STATUSES.has(ride.status);
  const isOnTheWay = ON_THE_WAY_STATUSES.has(ride.status);
  const isClosed = ride.status === 'NO_DRIVER_FOUND' || ride.status === 'CANCELLED' || ride.status === 'COMPLETED';

  return (
    <div className={styles.card}>
      {isWaiting && (
        <div className={styles.statusRow}>
          <span className={styles.spinner} />
          <strong>Sürücü aranıyor...</strong>
        </div>
      )}

      {ride.status === 'ACCEPTED' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary)' }} />
          <strong>Şoför kabul etti</strong>
        </div>
      )}

      {(ride.status === 'DRIVER_ARRIVING' || ride.status === 'IN_PROGRESS') && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-location-arrow" style={{ color: 'var(--primary)' }} />
          <strong>Şoför yolda!</strong>
        </div>
      )}

      {ride.status === 'NO_DRIVER_FOUND' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#F59E0B' }} />
          <strong>Uygun sürücü bulunamadı</strong>
        </div>
      )}

      {ride.status === 'CANCELLED' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-ban" style={{ color: 'var(--danger)' }} />
          <strong>Yolculuk iptal edildi</strong>
        </div>
      )}

      {ride.status === 'COMPLETED' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-flag-checkered" style={{ color: 'var(--primary)' }} />
          <strong>Yolculuk tamamlandı</strong>
        </div>
      )}

      {driver && isOnTheWay && (
        <div className={styles.driverInfo}>
          <div className={styles.driverName}>
            {driver.name} • {driver.vehicleModel} • {driver.vehiclePlate}
          </div>
        </div>
      )}

      {isOnTheWay && (
        <MiniMap pickup={ride.pickup} dropoff={ride.dropoff} driverLocation={driverLocation} height={160} />
      )}

      <div className={styles.route}>
        <div>
          <span className={styles.dot} style={{ background: 'var(--primary)' }} />
          {ride.pickup.address}
        </div>
        <div>
          <span className={styles.dot} style={{ background: 'var(--dark)' }} />
          {ride.dropoff.address}
        </div>
      </div>

      <div className={styles.meta}>
        <span>{ride.distanceKm} km</span>
        <span>₺{ride.priceTry}</span>
        <span>{ride.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN Havale'}</span>
      </div>

      {ride.paymentMethod === 'IBAN_TRANSFER' && driver && isOnTheWay && (
        <div className={styles.ibanBox}>
          <span className={styles.ibanLabel}>Şoförün IBAN'ı</span>
          <span className={styles.ibanValue}>{driver.iban}</span>
        </div>
      )}

      {isClosed ? (
        <button className={styles.dismissBtn} onClick={onDismiss}>
          Kapat
        </button>
      ) : (
        <button className={styles.cancelBtn} onClick={onCancel} disabled={cancelling}>
          {cancelling ? 'İptal ediliyor...' : 'Yolculuğu İptal Et'}
        </button>
      )}
    </div>
  );
}
