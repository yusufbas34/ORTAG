import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/apiClient';
import { getCurrentPosition } from '../../lib/geolocation';
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
  const [cancelling, setCancelling] = useState(false);
  const [startingArrival, setStartingArrival] = useState(false);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);

  useEffect(() => {
    apiClient.get<{ profile: DriverProfile }>('/drivers/me').then(({ profile }) => setProfile(profile));
  }, []);

  // Restore whichever ride this driver currently has accepted — otherwise a
  // page reload mid-ride would silently drop back to the idle "waiting" view.
  useEffect(() => {
    apiClient
      .get<{ ride: AcceptedRide | null }>('/rides/active')
      .then(({ ride }) => {
        if (ride) setActiveRide(ride);
      })
      .catch(() => {});
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
    function handleRideStatus(payload: { rideId: string; status: string }) {
      setActiveRide((current) => {
        if (!current || current.id !== payload.rideId) return current;
        // The rider cancelled from their side — clear this driver's active ride too.
        return payload.status === 'CANCELLED' ? null : { ...current, status: payload.status };
      });
    }

    socket.on('ride:offer', handleOffer);
    socket.on('ride:offer_closed', handleOfferClosed);
    socket.on('ride:status', handleRideStatus);
    return () => {
      socket.off('ride:offer', handleOffer);
      socket.off('ride:offer_closed', handleOfferClosed);
      socket.off('ride:status', handleRideStatus);
    };
  }, []);

  // Broadcast live location while actually en route to/with the rider — not
  // before, so the tracking map only lights up once the trip is truly moving.
  useEffect(() => {
    const shouldTrack = activeRide?.status === 'DRIVER_ARRIVING' || activeRide?.status === 'IN_PROGRESS';

    if (shouldTrack && locationWatchIdRef.current === null && navigator.geolocation) {
      locationWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          getSocket()?.emit('driver:location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }

    if (!shouldTrack && locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, [activeRide?.status]);

  async function toggleAvailability() {
    if (!profile) return;
    const isAvailable = !profile.isAvailable;
    setProfile({ ...profile, isAvailable });
    setLocationWarning(null);

    if (!isAvailable) {
      await apiClient.post<{ profile: DriverProfile }>('/drivers/me/availability', { isAvailable });
      return;
    }

    // Going online — attach current location so riders can actually find this
    // driver. Without it the driver stays invisible to nearby-driver search.
    try {
      const pos = await getCurrentPosition();
      await apiClient.post<{ profile: DriverProfile }>('/drivers/me/availability', {
        isAvailable,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch {
      setLocationWarning('Konum paylaşılamadı — yakınındaki yolculuk taleplerini alamayabilirsin. Randevu talepleri yine de gelir.');
      await apiClient.post<{ profile: DriverProfile }>('/drivers/me/availability', { isAvailable });
    }
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

  async function handleStartArriving() {
    if (!activeRide) return;
    setStartingArrival(true);
    try {
      const { ride } = await apiClient.post<{ ride: AcceptedRide }>(`/rides/${activeRide.id}/arriving`);
      setActiveRide(ride);
    } finally {
      setStartingArrival(false);
    }
  }

  async function handleCancelRide() {
    if (!activeRide) return;
    setCancelling(true);
    try {
      await apiClient.post(`/rides/${activeRide.id}/cancel`);
      setActiveRide(null);
    } finally {
      setCancelling(false);
    }
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

      {locationWarning && <p className={styles.locationWarning}>{locationWarning}</p>}

      <div className={styles.body}>
        {activeRide ? (
          <div className={styles.activeRideCard}>
            <span className={styles.badge}>
              {activeRide.status === 'DRIVER_ARRIVING' ? 'Yola Çıktın' : 'Yolculuk Kabul Edildi'}
            </span>
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
            <div className={styles.activeRideActions}>
              {activeRide.status === 'ACCEPTED' && (
                <button className={styles.arrivingBtn} onClick={handleStartArriving} disabled={startingArrival}>
                  {startingArrival ? 'Güncelleniyor...' : 'Yola Çıktım'}
                </button>
              )}
              <button className={styles.cancelRideBtn} onClick={handleCancelRide} disabled={cancelling}>
                {cancelling ? 'İptal ediliyor...' : 'İptal Et'}
              </button>
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
