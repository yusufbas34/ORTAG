import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../shared/ui/Screen';
import { AppHeader } from '../../shared/ui/AppHeader';
import { MapView } from '../../shared/ui/MapView';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { LocationCard, type LocationRow } from '../../shared/ui/LocationCard';
import { AddressSuggestions, type AddressSuggestion } from '../../shared/ui/AddressSuggestions';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { VehicleOptionCard } from '../../shared/ui/VehicleOptionCard';
import { PaymentMethodToggle } from '../../shared/ui/PaymentMethodToggle';
import { Button } from '../../shared/ui/Button';
import { RiderMenu } from '../../shared/ui/RiderMenu';
import { ActiveRideCard } from './ActiveRideCard';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { apiClient } from '../../lib/apiClient';
import { getCurrentPosition } from '../../lib/geolocation';
import { getSocket } from '../../lib/socketClient';
import type {
  DriverContactInfo,
  FavoriteDriver,
  LocationPoint,
  PaymentMethod,
  QuoteResponse,
  Reservation,
  Ride,
  RideStatus,
  SavedAddress,
  VehicleType,
} from './types';
import styles from './RiderHome.module.css';

type ActiveField = 'pickup' | 'dropoff' | null;

const NON_ACTIVE_STATUSES = new Set<RideStatus>(['COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND']);

const VEHICLE_META: { id: VehicleType; icon: string; title: string; subtitle: string }[] = [
  { id: 'STANDARD', icon: 'fa-solid fa-car-side', title: 'YOL Standart', subtitle: '1-4 Kişilik • Hızlı Eşleşme' },
  { id: 'XL', icon: 'fa-solid fa-van-shuttle', title: 'YOL XL', subtitle: 'Geniş Araç • Konfor' },
];

export function RiderHome() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [acceptedDriver, setAcceptedDriver] = useState<DriverContactInfo | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverEtaMin, setDriverEtaMin] = useState<number | null>(null);
  const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);
  const [favoriteDriverIds, setFavoriteDriverIds] = useState<Set<string>>(new Set());
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const activeRideIdRef = useRef<string | null>(null);

  const activeInputValue = activeField === 'pickup' ? pickupInput : activeField === 'dropoff' ? dropoffInput : '';
  const debouncedQuery = useDebouncedValue(activeInputValue, 400);

  useEffect(() => {
    activeRideIdRef.current = activeRide?.id ?? null;
  }, [activeRide]);

  // Default pickup from browser geolocation, reverse-geocoded to an address.
  useEffect(() => {
    getCurrentPosition()
      .then(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const { result } = await apiClient.get<{ result: { address: string } }>(
            `/geocode/reverse?lat=${lat}&lng=${lng}`,
          );
          setPickup({ lat, lng, address: result.address });
          setPickupInput(result.address);
        } catch {
          setPickup({ lat, lng, address: 'Mevcut Konum' });
          setPickupInput('Mevcut Konum');
        }
      })
      .catch(() => {
        // Geolocation denied/unavailable — rider types the pickup manually.
      });
  }, []);

  // Surface the nearest upcoming reservation right on the home screen —
  // scheduling a ride is the primary flow, so it shouldn't be buried in a menu.
  useEffect(() => {
    apiClient
      .get<{ reservations: Reservation[] }>('/reservations/mine')
      .then(({ reservations }) => {
        const upcoming = reservations
          .filter((r) => (r.status === 'PENDING_DISPATCH' || r.status === 'CONFIRMED') && new Date(r.scheduledFor) > new Date())
          .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
        setUpcomingReservation(upcoming[0] ?? null);
      })
      .catch(() => {});
  }, []);

  // Favorite drivers — loaded once so the active-ride card and driver lists
  // can show/toggle heart state without an extra round-trip per render.
  useEffect(() => {
    apiClient
      .get<{ favorites: FavoriteDriver[] }>('/favorites')
      .then(({ favorites }) => setFavoriteDriverIds(new Set(favorites.map((f) => f.driverId))))
      .catch(() => {});
  }, []);

  // Saved addresses (Ev/İş/...) — offered as one-tap quick picks before the
  // rider even starts typing a pickup/dropoff.
  useEffect(() => {
    apiClient
      .get<{ addresses: SavedAddress[] }>('/saved-addresses')
      .then(({ addresses }) => setSavedAddresses(addresses))
      .catch(() => {});
  }, []);

  // Address suggestions for whichever field currently has focus.
  useEffect(() => {
    if (!activeField || debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ results: AddressSuggestion[] }>(`/geocode/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(({ results }) => {
        if (!cancelled) setSuggestions(results);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeField, debouncedQuery]);

  // Fetch a fresh quote whenever both points are confirmed.
  useEffect(() => {
    if (!pickup || !dropoff) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    apiClient
      .post<QuoteResponse>('/rides/quote', { pickup, dropoff })
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setQuoteLoading(false));
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Restore whatever ride is currently in flight — covers both a fresh
  // "Araç Seç" hand-off and simply reopening/reloading the app mid-ride.
  useEffect(() => {
    apiClient
      .get<{ ride: Ride | null; driver: DriverContactInfo | null }>('/rides/active')
      .then(({ ride, driver }) => {
        if (ride) {
          setActiveRide(ride);
          setAcceptedDriver(driver);
          if (driver?.currentLat != null && driver?.currentLng != null) {
            setDriverLocation({ lat: driver.currentLat, lng: driver.currentLng });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Live ride status pushed by the server (Socket.IO) — no polling needed.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleStatus(payload: {
      rideId: string;
      status: RideStatus;
      driverId?: string | null;
      driver?: DriverContactInfo | null;
      cancelledReason?: string | null;
    }) {
      if (payload.rideId !== activeRideIdRef.current) return;
      setActiveRide((prev) =>
        prev
          ? {
              ...prev,
              status: payload.status,
              driverId: payload.driverId ?? prev.driverId,
              cancelledReason: payload.cancelledReason ?? prev.cancelledReason,
            }
          : prev,
      );
      if (payload.driver) {
        setAcceptedDriver(payload.driver);
        if (payload.driver.currentLat != null && payload.driver.currentLng != null) {
          setDriverLocation({ lat: payload.driver.currentLat, lng: payload.driver.currentLng });
        }
      }
    }

    function handleDriverLocation(payload: { rideId: string; lat: number; lng: number; etaMin?: number }) {
      if (payload.rideId !== activeRideIdRef.current) return;
      setDriverLocation({ lat: payload.lat, lng: payload.lng });
      if (typeof payload.etaMin === 'number') setDriverEtaMin(payload.etaMin);
    }

    socket.on('ride:status', handleStatus);
    socket.on('ride:driver_location', handleDriverLocation);
    return () => {
      socket.off('ride:status', handleStatus);
      socket.off('ride:driver_location', handleDriverLocation);
    };
  }, []);

  async function handleFindCar() {
    if (!pickup || !dropoff) return;
    setDispatching(true);
    try {
      const { ride } = await apiClient.post<{ ride: Ride }>('/rides', {
        pickup,
        dropoff,
        vehicleType: selectedVehicle,
        dispatchMode: 'BROADCAST',
        paymentMethod,
      });
      setAcceptedDriver(null);
      setDriverLocation(null);
      setDriverEtaMin(null);
      setActiveRide(ride);
    } finally {
      setDispatching(false);
    }
  }

  function handleChooseDriver() {
    if (!pickup || !dropoff) return;
    navigate('/rider/choose-driver', {
      state: { pickup, dropoff, vehicleType: selectedVehicle, paymentMethod },
    });
  }

  async function handleCancel(reason: string) {
    if (!activeRide) return;
    setCancelling(true);
    try {
      await apiClient.post(`/rides/${activeRide.id}/cancel`, { reason });
      setActiveRide((prev) => (prev ? { ...prev, status: 'CANCELLED', cancelledReason: reason || null } : prev));
    } finally {
      setCancelling(false);
    }
  }

  function handleDismissRide() {
    setActiveRide(null);
    setAcceptedDriver(null);
    setDriverLocation(null);
    setDriverEtaMin(null);
  }

  async function handleToggleFavorite() {
    const driverId = activeRide?.driverId;
    if (!driverId) return;
    const isFavorite = favoriteDriverIds.has(driverId);
    setFavoriteDriverIds((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
    try {
      if (isFavorite) {
        await apiClient.del(`/favorites/${driverId}`);
      } else {
        await apiClient.post('/favorites', { driverId });
      }
    } catch {
      setFavoriteDriverIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(driverId);
        else next.delete(driverId);
        return next;
      });
    }
  }

  function selectSuggestion(field: 'pickup' | 'dropoff', suggestion: AddressSuggestion) {
    const point: LocationPoint = suggestion;
    if (field === 'pickup') {
      setPickup(point);
      setPickupInput(suggestion.address);
    } else {
      setDropoff(point);
      setDropoffInput(suggestion.address);
    }
    setSuggestions([]);
    setActiveField(null);
  }

  const rows: LocationRow[] = [
    {
      key: 'pickup',
      label: 'Kalkış',
      value: pickupInput,
      dot: 'green',
      placeholder: 'Kalkış noktası',
      onChange: setPickupInput,
      onFocus: () => setActiveField('pickup'),
    },
    {
      key: 'dropoff',
      label: 'Varış',
      value: dropoffInput,
      dot: 'black',
      placeholder: 'Nereye gidiyorsunuz?',
      onChange: setDropoffInput,
      onFocus: () => setActiveField('dropoff'),
    },
  ];

  const routeCoordinates = quote?.routeGeometry.coordinates;
  // While a ride is genuinely in flight, the instant-booking form is hidden —
  // starting a second overlapping ride from the same screen isn't a real flow.
  const hasActiveRide = activeRide !== null && !NON_ACTIVE_STATUSES.has(activeRide.status);
  const showRideOutcome = activeRide !== null;

  return (
    <Screen>
      <AppHeader onMenuClick={() => setMenuOpen(true)} />
      <MapView pickup={pickup} dropoff={dropoff} routeCoordinates={routeCoordinates} />

      <BottomSheet>
        <div className={styles.planHero} onClick={() => navigate('/rider/plan')} role="button" tabIndex={0}>
          <div className={styles.planHeroIcon}>
            <i className="fa-solid fa-calendar-plus" />
          </div>
          <div className={styles.planHeroBody}>
            <strong>Araç Planla</strong>
            <span>İleri bir tarih/saat için randevulu araç ayarla</span>
          </div>
          <i className="fa-solid fa-chevron-right" />
        </div>

        {upcomingReservation && (
          <div className={styles.upcomingCard} onClick={() => navigate('/rider/planned')} role="button" tabIndex={0}>
            <i className="fa-solid fa-calendar-check" />
            <div className={styles.upcomingBody}>
              <strong>
                {upcomingReservation.status === 'CONFIRMED' ? 'Onaylı randevun var' : 'Randevu talebin bekleniyor'}
              </strong>
              <span>
                {new Date(upcomingReservation.scheduledFor).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                • {upcomingReservation.dropoff.address}
              </span>
            </div>
            <i className="fa-solid fa-chevron-right" />
          </div>
        )}

        {showRideOutcome && activeRide && (
          <ActiveRideCard
            ride={activeRide}
            driver={acceptedDriver}
            driverLocation={driverLocation}
            driverEtaMin={driverEtaMin}
            cancelling={cancelling}
            isFavoriteDriver={!!activeRide.driverId && favoriteDriverIds.has(activeRide.driverId)}
            onCancel={handleCancel}
            onDismiss={handleDismissRide}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {!hasActiveRide && (
          <>
            <div className={styles.extraDivider}>
              <span>EKSTRA · HEMEN ARAÇ ÇAĞIR</span>
            </div>

            <LocationCard rows={rows} />

            {activeField && debouncedQuery.trim().length < 3 && savedAddresses.length > 0 && (
              <div className={styles.savedAddressChips}>
                {savedAddresses.map((a) => (
                  <button key={a.id} type="button" className={styles.savedAddressChip} onClick={() => selectSuggestion(activeField, a)}>
                    <i className="fa-solid fa-map-pin" />
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {activeField && (
              <AddressSuggestions suggestions={suggestions} onSelect={(s) => selectSuggestion(activeField, s)} />
            )}

            <SectionTitle>YOLCULUK SEÇENEKLERİ</SectionTitle>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {VEHICLE_META.map((v) => {
                const vehicleQuote = quote?.quotes.find((q) => q.vehicleType === v.id);
                const priceLabel = quoteLoading ? '...' : vehicleQuote ? `₺${vehicleQuote.priceTry}` : '—';
                const etaLabel = quote ? `${quote.distanceKm} km • ${quote.durationMin} dk` : 'Konum seçin';

                return (
                  <VehicleOptionCard
                    key={v.id}
                    icon={v.icon}
                    title={v.title}
                    subtitle={v.subtitle}
                    price={priceLabel}
                    eta={etaLabel}
                    active={selectedVehicle === v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                  />
                );
              })}
            </div>

            <PaymentMethodToggle value={paymentMethod} onChange={setPaymentMethod} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button onClick={handleFindCar} disabled={!quote || dispatching}>
                <span>Araç Bul</span>
                <i className="fa-solid fa-arrow-right" />
              </Button>
              <Button variant="ghost" onClick={handleChooseDriver} disabled={!quote || dispatching}>
                <span>Araç Seç</span>
              </Button>
            </div>
          </>
        )}
      </BottomSheet>

      {menuOpen && <RiderMenu onClose={() => setMenuOpen(false)} />}
    </Screen>
  );
}
