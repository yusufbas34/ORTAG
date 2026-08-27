import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import type { Reservation, RideHistoryItem } from './types';
import styles from './RideHistory.module.css';

const RIDE_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
  NO_DRIVER_FOUND: 'Şoför Bulunamadı',
  EXPIRED: 'Süresi Doldu',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export function RideHistory() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'rides' | 'reservations'>('rides');
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ rides: RideHistoryItem[] }>('/rides/history'),
      apiClient.get<{ reservations: Reservation[] }>('/reservations/history'),
    ])
      .then(([rideRes, reservationRes]) => {
        setRides(rideRes.rides);
        setReservations(reservationRes.reservations);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/rider')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Yolculuk Geçmişim</h1>
      </div>

      <div className={styles.tabs}>
        <button className={[styles.tab, tab === 'rides' ? styles.tabActive : ''].join(' ')} onClick={() => setTab('rides')}>
          Anlık Yolculuklar
        </button>
        <button
          className={[styles.tab, tab === 'reservations' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('reservations')}
        >
          Randevular
        </button>
      </div>

      <div className={styles.list}>
        {!loading && tab === 'rides' && rides.length === 0 && <p className={styles.empty}>Henüz geçmiş yolculuğun yok.</p>}
        {tab === 'rides' &&
          rides.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.dateTime}>{formatDateTime(r.createdAt)}</span>
                <span className={[styles.badge, styles[r.status]].join(' ')}>{RIDE_STATUS_LABEL[r.status] ?? r.status}</span>
              </div>
              <div className={styles.route}>
                {r.pickup.address} → {r.dropoff.address}
              </div>
              {r.otherParty && (
                <div className={styles.otherParty}>
                  <i className="fa-solid fa-user" /> {r.otherParty.name}
                  {r.otherParty.vehicleModel ? ` • ${r.otherParty.vehicleModel} • ${r.otherParty.vehiclePlate}` : ''}
                </div>
              )}
              <div className={styles.footer}>
                <span>₺{r.priceTry}</span>
                <span>{r.distanceKm} km</span>
              </div>
              {r.status === 'CANCELLED' && r.cancelledReason && <p className={styles.cancelReason}>Sebep: {r.cancelledReason}</p>}
            </div>
          ))}

        {!loading && tab === 'reservations' && reservations.length === 0 && (
          <p className={styles.empty}>Henüz geçmiş randevun yok.</p>
        )}
        {tab === 'reservations' &&
          reservations.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.dateTime}>{formatDateTime(r.scheduledFor)}</span>
                <span className={[styles.badge, styles[r.status]].join(' ')}>{RIDE_STATUS_LABEL[r.status] ?? r.status}</span>
              </div>
              <div className={styles.route}>
                {r.pickup.address} → {r.dropoff.address}
              </div>
              <div className={styles.footer}>
                <span>₺{r.priceTry}</span>
                <span>{r.distanceKm} km</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
