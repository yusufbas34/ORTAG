import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/apiClient';
import { getSocket } from '../../lib/socketClient';
import { IncomingOfferOverlay } from './IncomingOfferOverlay';
import { DriverReservations } from './DriverReservations';
import type { AcceptedRide, IncomingOffer } from './types';
import styles from './DriverHome.module.css';

interface DriverProfile {
  isAvailable: boolean;
  vehiclePlate: string;
  vehicleModel: string;
}

export function DriverHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<IncomingOffer | null>(null);
  const [responding, setResponding] = useState(false);
  const [activeRide, setActiveRide] = useState<AcceptedRide | null>(null);

  useEffect(() => {
    apiClient.get<{ profile: DriverProfile }>('/drivers/me').then(({ profile }) => setProfile(profile));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleOffer(offer: IncomingOffer) {
      setIncomingOffer((current) => current ?? offer);
    }
    function handleOfferClosed(payload: { offerId: string; reason: string }) {
      setIncomingOffer((current) => (current?.offerId === payload.offerId ? null : current));
    }

    socket.on('ride:offer', handleOffer);
    socket.on('ride:offer_closed', handleOfferClosed);
    return () => {
      socket.off('ride:offer', handleOffer);
      socket.off('ride:offer_closed', handleOfferClosed);
    };
  }, []);

  async function toggleAvailability() {
    if (!profile) return;
    const isAvailable = !profile.isAvailable;
    setProfile({ ...profile, isAvailable });
    await apiClient.post<{ profile: DriverProfile }>('/drivers/me/availability', { isAvailable });
  }

  async function handleAccept() {
    if (!incomingOffer) return;
    setResponding(true);
    try {
      const { ride } = await apiClient.post<{ ride: AcceptedRide }>(`/ride-offers/${incomingOffer.offerId}/accept`);
      setActiveRide(ride);
      setIncomingOffer(null);
    } catch {
      setIncomingOffer(null);
    } finally {
      setResponding(false);
    }
  }

  async function handleReject() {
    if (!incomingOffer) return;
    setResponding(true);
    try {
      await apiClient.post(`/ride-offers/${incomingOffer.offerId}/reject`);
    } finally {
      setIncomingOffer(null);
      setResponding(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.greeting}>
          <h1>Hoş geldin, {user?.name}</h1>
          <p>{profile ? `${profile.vehicleModel} • ${profile.vehiclePlate}` : ''}</p>
        </div>
        <div className={styles.toggle}>
          <span className={[styles.toggleLabel, profile?.isAvailable ? styles.online : styles.offline].join(' ')}>
            {profile?.isAvailable ? 'Çevrimiçi' : 'Çevrimdışı'}
          </span>
          <button
            className={[styles.switch, profile?.isAvailable ? styles.on : ''].join(' ')}
            onClick={toggleAvailability}
            aria-label="Müsaitlik durumu"
          >
            <span className={styles.knob} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {activeRide ? (
          <div className={styles.activeRideCard}>
            <span className={styles.badge}>Yolculuk Kabul Edildi</span>
            <div>
              <strong>Kalkış:</strong> {activeRide.pickup.address}
            </div>
            <div>
              <strong>Varış:</strong> {activeRide.dropoff.address}
            </div>
            <div>
              {activeRide.distanceKm} km • ₺{activeRide.priceTry} •{' '}
              {activeRide.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN Havale'}
            </div>
          </div>
        ) : profile?.isAvailable ? (
          <>
            <i className="fa-solid fa-satellite-dish" />
            <h2>Talep Bekleniyor</h2>
            <p>Çevrimiçisin, yeni bir yolculuk talebi geldiğinde burada göreceksin.</p>
          </>
        ) : (
          <>
            <i className="fa-solid fa-power-off" />
            <h2>Çevrimdışısın</h2>
            <p>Talep almaya başlamak için yukarıdaki anahtarla çevrimiçi ol.</p>
          </>
        )}
      </div>

      <DriverReservations />

      <button className={styles.logoutBtn} onClick={handleLogout}>
        Çıkış Yap
      </button>

      {incomingOffer && (
        <IncomingOfferOverlay
          offer={incomingOffer}
          responding={responding}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
