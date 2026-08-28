import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/apiClient';
import { getCurrentPosition } from '../../lib/geolocation';
import { getSocket, onSocketReady } from '../../lib/socketClient';
import { enablePushNotifications } from '../../lib/push';
import { playAlert } from '../../lib/sound';
import { useRideChat } from '../../shared/hooks/useRideChat';
import { usePushStatus } from '../../shared/hooks/usePushStatus';
import { useAppUpdateCheck } from '../../shared/hooks/useAppUpdateCheck';
import { RideChatPanel } from '../../shared/ui/RideChatPanel';
import { DriverMenu } from '../../shared/ui/DriverMenu';
import { NotificationSetupBanner } from '../../shared/ui/NotificationSetupBanner';
import { AppUpdateBanner } from '../../shared/ui/AppUpdateBanner';
import { IncomingOfferOverlay } from './IncomingOfferOverlay';
import { DriverReservations } from './DriverReservations';
import { MiniMap } from '../../shared/ui/MiniMap';
import type { AcceptedRide, IncomingOffer } from './types';
import styles from './DriverHome.module.css';

const TRACKING_STATUSES = new Set(['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS']);

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
  const [startingTrip, setStartingTrip] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const [ownLocation, setOwnLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushInfoMessage, setPushInfoMessage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const locationWatchIdRef = useRef<number | null>(null);
  const chat = useRideChat(activeRide?.id ?? null);
  const pushStatus = usePushStatus();
  const appUpdate = useAppUpdateCheck();

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
    let cleanup: (() => void) | undefined;

    // connectSocket() (called once /auth/me resolves) can finish a tick
    // after this component mounts — a plain getSocket() read here could see
    // null and skip attaching forever, silently missing every new ride
    // offer. onSocketReady fires immediately if the socket already exists,
    // and again as soon as one is created.
    const unsubscribeReady = onSocketReady((socket) => {
      function handleOffer(offer: IncomingOffer) {
        setIncomingOffer((current) => {
          if (current) return current;
          playAlert();
          return offer;
        });
      }
      function handleOfferClosed(payload: { offerId: string; reason: string }) {
        setIncomingOffer((current) => (current?.offerId === payload.offerId ? null : current));
      }
      function handleRideStatus(payload: { rideId: string; status: string; cancelledReason?: string | null }) {
        setActiveRide((current) => {
          if (!current || current.id !== payload.rideId) return current;
          // The rider cancelled from their side — keep the card visible with the
          // reason so the driver knows why, rather than silently vanishing.
          return { ...current, status: payload.status, cancelledReason: payload.cancelledReason ?? current.cancelledReason };
        });
      }

      socket.on('ride:offer', handleOffer);
      socket.on('ride:offer_closed', handleOfferClosed);
      socket.on('ride:status', handleRideStatus);
      cleanup = () => {
        socket.off('ride:offer', handleOffer);
        socket.off('ride:offer_closed', handleOfferClosed);
        socket.off('ride:status', handleRideStatus);
      };
    });

    return () => {
      unsubscribeReady();
      cleanup?.();
    };
  }, []);

  // Track (and broadcast) live location for the whole lifetime of an accepted
  // ride — the driver's own map needs it right away, and the rider's tracking
  // map picks up the same stream once the driver is en route.
  useEffect(() => {
    const shouldTrack = !!activeRide && TRACKING_STATUSES.has(activeRide.status);

    if (shouldTrack && locationWatchIdRef.current === null && navigator.geolocation) {
      locationWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setOwnLocation(coords);
          getSocket()?.emit('driver:location', coords);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }

    if (!shouldTrack && locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
      setOwnLocation(null);
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

  async function handleStartTrip() {
    if (!activeRide) return;
    setStartingTrip(true);
    try {
      const { ride } = await apiClient.post<{ ride: AcceptedRide }>(`/rides/${activeRide.id}/start`);
      setActiveRide(ride);
    } finally {
      setStartingTrip(false);
    }
  }

  async function handleCompleteTrip() {
    if (!activeRide) return;
    setCompletingTrip(true);
    try {
      const { ride } = await apiClient.post<{ ride: AcceptedRide }>(`/rides/${activeRide.id}/complete`);
      setActiveRide(ride);
    } finally {
      setCompletingTrip(false);
    }
  }

  async function handleCancelRide() {
    if (!activeRide) return;
    setCancelling(true);
    try {
      await apiClient.post(`/rides/${activeRide.id}/cancel`, { reason: cancelReason });
      setActiveRide((prev) => (prev ? { ...prev, status: 'CANCELLED', cancelledReason: cancelReason || null } : prev));
      setShowCancelForm(false);
      setCancelReason('');
    } finally {
      setCancelling(false);
    }
  }

  function handleDismissRide() {
    setActiveRide(null);
  }

  async function handleEnablePush() {
    // Once the OS has granted notification permission, an app can't revoke
    // it from within itself — only the user can, from system settings. So
    // tapping an already-green bell isn't a broken toggle, it just has
    // nothing left to do here; explain that instead of silently no-op'ing.
    if (pushStatus.enabled) {
      setPushInfoMessage('Bildirimler zaten açık. Kapatmak istersen telefonun Ayarlar > Uygulamalar > YOL > Bildirimler bölümüne gitmen gerekir.');
      return;
    }
    setPushEnabling(true);
    try {
      await enablePushNotifications();
      pushStatus.refresh();
    } finally {
      setPushEnabling(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.bellBtn} onClick={() => setMenuOpen(true)} aria-label="Menü" title="Menü">
            <i className="fa-solid fa-bars" />
          </button>
          <div className={styles.greeting}>
            <h1>Hoş geldin, {user?.name}</h1>
            <p>{profile ? `${profile.vehicleModel} • ${profile.vehiclePlate}` : ''}</p>
          </div>
        </div>
        <div className={styles.toggle}>
          <button
            className={[styles.bellBtn, pushStatus.enabled ? styles.bellOn : ''].join(' ')}
            onClick={handleEnablePush}
            disabled={pushEnabling}
            aria-label={pushStatus.enabled ? 'Bildirimler açık' : 'Bildirimleri Aç'}
            title={pushStatus.enabled ? 'Bildirimler açık' : 'Bildirimleri Aç'}
          >
            <i className={pushStatus.enabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash'} />
          </button>
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
      {pushInfoMessage && (
        <p className={styles.locationWarning} onClick={() => setPushInfoMessage(null)}>
          {pushInfoMessage}
        </p>
      )}

      {appUpdate.updateInfo && <AppUpdateBanner info={appUpdate.updateInfo} onDismiss={appUpdate.dismiss} />}
      {pushStatus.enabled === false && <NotificationSetupBanner onEnabled={pushStatus.refresh} />}

      <div className={styles.body}>
        {activeRide ? (
          <div className={styles.activeRideCard}>
            <div className={styles.cardHeaderRow}>
              <span className={styles.badge}>
                {activeRide.status === 'CANCELLED'
                  ? 'İptal Edildi'
                  : activeRide.status === 'COMPLETED'
                    ? 'Tamamlandı'
                    : activeRide.status === 'IN_PROGRESS'
                      ? 'Yolculuk Devam Ediyor'
                      : activeRide.status === 'DRIVER_ARRIVING'
                        ? 'Yola Çıktın'
                        : 'Yolculuk Kabul Edildi'}
              </span>
              <button className={styles.chatBtn} onClick={chat.open} aria-label="Yolcuyla mesajlaş">
                <i className="fa-solid fa-comment-dots" />
                {chat.unreadCount > 0 && <span className={styles.chatBadge}>{chat.unreadCount}</span>}
              </button>
            </div>
            {activeRide.status === 'CANCELLED' && activeRide.cancelledReason && (
              <p className={styles.cancelledReasonText}>Sebep: {activeRide.cancelledReason}</p>
            )}
            <div className={styles.routeInfo}>
              <div>
                <span className={styles.routeDot} style={{ background: 'var(--primary)' }} />
                {activeRide.pickup.address}
              </div>
              <div>
                <span className={styles.routeDot} style={{ background: 'var(--dark)' }} />
                {activeRide.dropoff.address}
              </div>
            </div>

            {TRACKING_STATUSES.has(activeRide.status) && (
              <MiniMap
                pickup={activeRide.pickup}
                dropoff={activeRide.dropoff}
                routeGeometry={activeRide.routeGeometry}
                driverLocation={ownLocation}
                height={180}
                interactive
              />
            )}

            <div className={styles.meta}>
              <span className={styles.metaChip}>
                <i className="fa-solid fa-route" />
                {activeRide.distanceKm} km
              </span>
              <span className={styles.metaChip}>
                <i className="fa-solid fa-clock" />
                {activeRide.durationMin} dk
              </span>
              <span className={styles.metaChip}>
                <i className="fa-solid fa-wallet" />₺{activeRide.priceTry}
              </span>
              <span className={styles.metaChip}>
                <i className={activeRide.paymentMethod === 'CASH' ? 'fa-solid fa-money-bill-wave' : 'fa-solid fa-building-columns'} />
                {activeRide.paymentMethod === 'CASH' ? 'Nakit' : 'IBAN'}
              </span>
            </div>

            {activeRide.status === 'CANCELLED' || activeRide.status === 'COMPLETED' ? (
              <button className={styles.dismissRideBtn} onClick={handleDismissRide}>
                Kapat
              </button>
            ) : showCancelForm ? (
              <div className={styles.cancelForm}>
                <textarea
                  className={styles.cancelTextarea}
                  placeholder="İptal sebebini yaz (opsiyonel)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                />
                <div className={styles.activeRideActions}>
                  <button className={styles.dismissRideBtn} onClick={() => setShowCancelForm(false)} disabled={cancelling}>
                    Vazgeç
                  </button>
                  <button className={styles.cancelRideBtn} onClick={handleCancelRide} disabled={cancelling}>
                    {cancelling ? 'İptal ediliyor...' : 'İptali Onayla'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.activeRideActions}>
                {activeRide.status === 'ACCEPTED' && (
                  <button className={styles.arrivingBtn} onClick={handleStartArriving} disabled={startingArrival}>
                    {startingArrival ? 'Güncelleniyor...' : 'Yola Çıktım'}
                  </button>
                )}
                {activeRide.status === 'DRIVER_ARRIVING' && (
                  <button className={styles.arrivingBtn} onClick={handleStartTrip} disabled={startingTrip}>
                    {startingTrip ? 'Güncelleniyor...' : 'Yolcu Bindi'}
                  </button>
                )}
                {activeRide.status === 'IN_PROGRESS' && (
                  <button className={styles.arrivingBtn} onClick={handleCompleteTrip} disabled={completingTrip}>
                    {completingTrip ? 'Tamamlanıyor...' : 'Yolculuğu Tamamla'}
                  </button>
                )}
                <button className={styles.cancelRideBtn} onClick={() => setShowCancelForm(true)}>
                  İptal Et
                </button>
              </div>
            )}
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

      {chat.isOpen && user && (
        <RideChatPanel
          messages={chat.messages}
          myUserId={user.id}
          otherPartyName="Yolcu"
          sending={chat.sending}
          onSend={chat.sendMessage}
          onClose={chat.close}
        />
      )}

      {menuOpen && (
        <DriverMenu
          onClose={() => setMenuOpen(false)}
          pushEnabled={pushStatus.enabled}
          pushEnabling={pushEnabling}
          onEnablePush={handleEnablePush}
        />
      )}
    </div>
  );
}
