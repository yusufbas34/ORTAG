import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { getSocket } from '../../lib/socketClient';
import type { IncomingReservationOffer, ReservationOfferItem, ReservationSummary } from './types';
import styles from './DriverReservations.module.css';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export function DriverReservations() {
  const [pendingOffers, setPendingOffers] = useState<ReservationOfferItem[]>([]);
  const [confirmed, setConfirmed] = useState<ReservationSummary[]>([]);

  function load() {
    apiClient
      .get<{ pendingOffers: ReservationOfferItem[]; confirmedReservations: ReservationSummary[] }>(
        '/drivers/me/reservations',
      )
      .then(({ pendingOffers, confirmedReservations }) => {
        setPendingOffers(pendingOffers);
        setConfirmed(confirmedReservations);
      });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleOffer(offer: IncomingReservationOffer) {
      setPendingOffers((current) => [
        {
          offerId: offer.offerId,
          reservation: {
            id: offer.reservationId,
            pickup: offer.pickup,
            dropoff: offer.dropoff,
            scheduledFor: offer.scheduledFor,
            distanceKm: offer.distanceKm,
            priceTry: offer.priceTry,
            paymentMethod: offer.paymentMethod,
            status: 'PENDING_DISPATCH',
          },
        },
        ...current,
      ]);
    }

    function handleClosed(payload: { offerId: string }) {
      setPendingOffers((current) => current.filter((o) => o.offerId !== payload.offerId));
    }

    socket.on('reservation:offer', handleOffer);
    socket.on('reservation:offer_closed', handleClosed);
    return () => {
      socket.off('reservation:offer', handleOffer);
      socket.off('reservation:offer_closed', handleClosed);
    };
  }, []);

  async function handleAccept(offerId: string) {
    try {
      await apiClient.post(`/reservation-offers/${offerId}/accept`);
    } finally {
      load();
    }
  }

  async function handleReject(offerId: string) {
    setPendingOffers((current) => current.filter((o) => o.offerId !== offerId));
    await apiClient.post(`/reservation-offers/${offerId}/reject`);
  }

  if (pendingOffers.length === 0 && confirmed.length === 0) {
    return null;
  }

  return (
    <div className={styles.section}>
      {pendingOffers.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Randevu Talepleri</div>
          {pendingOffers.map(({ offerId, reservation }) => (
            <div key={offerId} className={styles.card}>
              <div className={styles.dateTime}>{formatDateTime(reservation.scheduledFor)}</div>
              <div className={styles.route}>
                {reservation.pickup.address} → {reservation.dropoff.address}
              </div>
              <div className={styles.footer}>
                <span>₺{reservation.priceTry}</span>
                <span>{reservation.distanceKm} km</span>
              </div>
              <div className={styles.actions}>
                <button className={styles.rejectBtn} onClick={() => handleReject(offerId)}>
                  Reddet
                </button>
                <button className={styles.acceptBtn} onClick={() => handleAccept(offerId)}>
                  Kabul Et
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {confirmed.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Onaylı Randevularım</div>
          {confirmed.map((r) => (
            <div key={r.id} className={styles.card}>
              <span className={styles.badge}>Onaylandı</span>
              <div className={styles.dateTime}>{formatDateTime(r.scheduledFor)}</div>
              <div className={styles.route}>
                {r.pickup.address} → {r.dropoff.address}
              </div>
              <div className={styles.footer}>
                <span>₺{r.priceTry}</span>
                <span>{r.distanceKm} km</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
