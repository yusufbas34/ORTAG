import { useEffect, useState } from 'react';
import type { IncomingOffer } from './types';
import styles from './IncomingOfferOverlay.module.css';

interface IncomingOfferOverlayProps {
  offer: IncomingOffer;
  responding: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingOfferOverlay({ offer, responding, onAccept, onReject }: IncomingOfferOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(offer.expiresInSec);

  useEffect(() => {
    setSecondsLeft(offer.expiresInSec);
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [offer.offerId, offer.expiresInSec]);

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.countdown}>{secondsLeft}</div>
        <div className={styles.title}>Yeni Yolculuk Talebi</div>
        <div className={styles.price}>₺{offer.priceTry}</div>

        <div className={styles.locationCard}>
          <div className={styles.locationRow}>
            <i className="fa-solid fa-circle" style={{ color: 'var(--primary)', fontSize: '0.5rem' }} />
            <span>{offer.pickup.address}</span>
          </div>
          <div className={styles.locationRow}>
            <i className="fa-solid fa-flag-checkered" style={{ color: 'var(--dark)', fontSize: '0.7rem' }} />
            <span>{offer.dropoff.address}</span>
          </div>
        </div>

        <div className={styles.meta}>
          <span>{offer.distanceKm} km</span>
          <span>{offer.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN Havale'}</span>
        </div>

        <div className={styles.actions}>
          <button className={styles.rejectBtn} onClick={onReject} disabled={responding}>
            Reddet
          </button>
          <button className={styles.acceptBtn} onClick={onAccept} disabled={responding}>
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
