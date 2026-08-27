import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { getSocket } from '../../lib/socketClient';
import { MiniMap } from '../../shared/ui/MiniMap';
import type { Reservation, ReservationStatus } from './types';
import styles from './PlannedRides.module.css';

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING_DISPATCH: 'Bekliyor',
  CONFIRMED: 'Onaylandı',
  CANCELLED: 'İptal Edildi',
  EXPIRED: 'Süresi Doldu',
  COMPLETED: 'Tamamlandı',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export function PlannedRides() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  function loadReservations() {
    apiClient
      .get<{ reservations: Reservation[] }>('/reservations/mine')
      .then(({ reservations }) => setReservations(reservations))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleStatus() {
      loadReservations();
    }
    socket.on('reservation:status', handleStatus);
    return () => {
      socket.off('reservation:status', handleStatus);
    };
  }, []);

  async function handleCancel(id: string) {
    await apiClient.post(`/reservations/${id}/cancel`);
    loadReservations();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/rider')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Planlı YOL</h1>
      </div>

      <div className={styles.list}>
        {!loading && reservations.length === 0 && <p className={styles.empty}>Henüz planlanmış bir yolculuğun yok.</p>}

        {reservations.map((r) => (
          <div key={r.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.dateTime}>{formatDateTime(r.scheduledFor)}</span>
              <span className={[styles.badge, styles[r.status]].join(' ')}>{STATUS_LABEL[r.status]}</span>
            </div>
            <MiniMap pickup={r.pickup} dropoff={r.dropoff} />
            <div className={styles.route}>
              {r.pickup.address} → {r.dropoff.address}
            </div>
            <div className={styles.footer}>
              <span>₺{r.priceTry}</span>
              <span>{r.distanceKm} km</span>
            </div>
            {(r.status === 'PENDING_DISPATCH' || r.status === 'CONFIRMED') && (
              <button className={styles.cancelBtn} onClick={() => handleCancel(r.id)}>
                İptal Et
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
