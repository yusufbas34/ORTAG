import { useState } from 'react';
import { MiniMap } from '../../shared/ui/MiniMap';
import type { DriverContactInfo, Ride } from './types';
import styles from './ActiveRideCard.module.css';

interface ActiveRideCardProps {
  ride: Ride;
  driver: DriverContactInfo | null;
  driverLocation: { lat: number; lng: number } | null;
  driverEtaMin: number | null;
  cancelling: boolean;
  isFavoriteDriver: boolean;
  chatUnreadCount: number;
  onCancel: (reason: string) => void;
  onDismiss: () => void;
  onToggleFavorite: () => void;
  onOpenChat: () => void;
}

const WAITING_STATUSES = new Set(['REQUESTED', 'DISPATCHING']);
const ON_THE_WAY_STATUSES = new Set(['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS']);

export function ActiveRideCard({
  ride,
  driver,
  driverLocation,
  driverEtaMin,
  cancelling,
  isFavoriteDriver,
  chatUnreadCount,
  onCancel,
  onDismiss,
  onToggleFavorite,
  onOpenChat,
}: ActiveRideCardProps) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reason, setReason] = useState('');

  const isWaiting = WAITING_STATUSES.has(ride.status);
  const isOnTheWay = ON_THE_WAY_STATUSES.has(ride.status);
  const isClosed = ride.status === 'NO_DRIVER_FOUND' || ride.status === 'CANCELLED' || ride.status === 'COMPLETED';

  function submitCancel() {
    onCancel(reason);
    setShowCancelForm(false);
    setReason('');
  }

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

      {ride.status === 'DRIVER_ARRIVING' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-location-arrow" style={{ color: 'var(--primary)' }} />
          <strong>Şoför yolda!</strong>
        </div>
      )}

      {ride.status === 'IN_PROGRESS' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-road" style={{ color: 'var(--primary)' }} />
          <strong>Yolculuğunuz devam ediyor</strong>
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

      {ride.status === 'CANCELLED' && ride.cancelledReason && (
        <p className={styles.cancelReasonText}>Sebep: {ride.cancelledReason}</p>
      )}

      {ride.status === 'COMPLETED' && (
        <div className={styles.statusRow}>
          <i className="fa-solid fa-flag-checkered" style={{ color: 'var(--primary)' }} />
          <strong>Yolculuk tamamlandı</strong>
        </div>
      )}

      {driver && isOnTheWay && (
        <div className={styles.driverInfo}>
          <div className={styles.driverInfoRow}>
            <div className={styles.driverName}>
              {driver.name} • {driver.vehicleModel} • {driver.vehiclePlate}
            </div>
            <div className={styles.driverInfoActions}>
              <button className={styles.chatBtn} onClick={onOpenChat} aria-label="Şoförle mesajlaş">
                <i className="fa-solid fa-comment-dots" />
                {chatUnreadCount > 0 && <span className={styles.chatBadge}>{chatUnreadCount}</span>}
              </button>
              <button
                className={[styles.favoriteBtn, isFavoriteDriver ? styles.favoriteActive : ''].join(' ')}
                onClick={onToggleFavorite}
                aria-label={isFavoriteDriver ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              >
                <i className={isFavoriteDriver ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
              </button>
            </div>
          </div>
          {driverEtaMin !== null && (
            <div className={styles.etaText}>
              {ride.status === 'IN_PROGRESS' ? 'Varış' : 'Şoför'} yaklaşık {driverEtaMin} dakika içinde
            </div>
          )}
        </div>
      )}

      {isOnTheWay && (
        <MiniMap
          pickup={ride.pickup}
          dropoff={ride.dropoff}
          routeGeometry={ride.routeGeometry}
          driverLocation={driverLocation}
          height={180}
          interactive
        />
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
        <span className={styles.metaChip}>
          <i className="fa-solid fa-route" />
          {ride.distanceKm} km
        </span>
        <span className={styles.metaChip}>
          <i className="fa-solid fa-clock" />
          {ride.durationMin} dk
        </span>
        <span className={styles.metaChip}>
          <i className="fa-solid fa-wallet" />₺{ride.priceTry}
        </span>
        <span className={styles.metaChip}>
          <i className={ride.paymentMethod === 'CASH' ? 'fa-solid fa-money-bill-wave' : 'fa-solid fa-building-columns'} />
          {ride.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN'}
        </span>
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
      ) : showCancelForm ? (
        <div className={styles.cancelForm}>
          <textarea
            className={styles.cancelTextarea}
            placeholder="İptal sebebini yaz (opsiyonel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className={styles.cancelFormActions}>
            <button className={styles.dismissBtn} onClick={() => setShowCancelForm(false)} disabled={cancelling}>
              Vazgeç
            </button>
            <button className={styles.cancelBtn} onClick={submitCancel} disabled={cancelling}>
              {cancelling ? 'İptal ediliyor...' : 'İptali Onayla'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.cancelBtn} onClick={() => setShowCancelForm(true)}>
          Yolculuğu İptal Et
        </button>
      )}
    </div>
  );
}
