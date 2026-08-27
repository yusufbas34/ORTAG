import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { SearchingOverlay } from '../../shared/ui/SearchingOverlay';
import { RiderMenu } from '../../shared/ui/RiderMenu';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { apiClient } from '../../lib/apiClient';
import { getCurrentPosition } from '../../lib/geolocation';
import { getSocket } from '../../lib/socketClient';
import type { LocationPoint, PaymentMethod, QuoteResponse, Reservation, Ride, RideStatus, VehicleType } from './types';
import styles from './RiderHome.module.css';

type ActiveField = 'pickup' | 'dropoff' | null;

interface AcceptedDriverInfo {
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
}

const VEHICLE_META: { id: VehicleType; icon: string; title: string; subtitle: string }[] = [
  { id: 'STANDARD', icon: 'fa-solid fa-car-side', title: 'TAG Standart', subtitle: '1-4 Kişilik • Hızlı Eşleşme' },
  { id: 'XL', icon: 'fa-solid fa-van-shuttle', title: 'TAG XL', subtitle: 'Geniş Araç • Konfor' },
];

function overlayContentFor(status: RideStatus, driver: AcceptedDriverInfo | null) {
  switch (status) {
    case 'DISPATCHING':
      return { title: 'Sürücü Aranıyor...', subtitle: 'Yakındaki sürücülere talebin iletiliyor.', icon: '', iconColor: '' };
    case 'ACCEPTED':
      return {
        title: 'Şoförün Yolda!',
        subtitle: driver ? `${driver.name} • ${driver.vehicleModel} • ${driver.vehiclePlate}` : 'Şoför talebini kabul etti.',
        icon: 'fa-solid fa-circle-check',
        iconColor: 'var(--primary)',
      };
    case 'NO_DRIVER_FOUND':
      return {
        title: 'Uygun Sürücü Bulunamadı',
        subtitle: 'Lütfen tekrar deneyin veya farklı bir araç tipi seçin.',
        icon: 'fa-solid fa-triangle-exclamation',
        iconColor: '#F59E0B',
      };
    case 'CANCELLED':
      return { title: 'Yolculuk İptal Edildi', subtitle: '', icon: 'fa-solid fa-ban', iconColor: 'var(--danger)' };
    default:
      return { title: 'Yolculuk Güncelleniyor...', subtitle: '', icon: '', iconColor: '' };
  }
}

export function RiderHome() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [acceptedDriver, setAcceptedDriver] = useState<AcceptedDriverInfo | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);
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

  // Resume tracking a ride created on the "Araç Seç" screen.
  useEffect(() => {
    const state = location.state as { activeRideId?: string } | null;
    if (state?.activeRideId) {
      apiClient.get<{ ride: Ride }>(`/rides/${state.activeRideId}`).then(({ ride }) => setActiveRide(ride));
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live ride status pushed by the server (Socket.IO) — no polling needed.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleStatus(payload: {
      rideId: string;
      status: RideStatus;
      driverId?: string | null;
      driver?: AcceptedDriverInfo | null;
    }) {
      if (payload.rideId !== activeRideIdRef.current) return;
      setActiveRide((prev) =>
        prev ? { ...prev, status: payload.status, driverId: payload.driverId ?? prev.driverId } : prev,
      );
      if (payload.driver) setAcceptedDriver(payload.driver);
    }

    socket.on('ride:status', handleStatus);
    return () => {
      socket.off('ride:status', handleStatus);
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

  async function handleCancel() {
    if (!activeRide) return;
    try {
      await apiClient.post(`/rides/${activeRide.id}/cancel`);
    } finally {
      setActiveRide(null);
      setAcceptedDriver(null);
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
  const overlayActive = activeRide !== null;
  const overlayContent = activeRide ? overlayContentFor(activeRide.status, acceptedDriver) : undefined;
  const isDispatching = activeRide?.status === 'DISPATCHING';

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

        <div className={styles.extraDivider}>
          <span>EKSTRA · HEMEN ARAÇ ÇAĞIR</span>
        </div>

        <LocationCard rows={rows} />

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
      </BottomSheet>

      <SearchingOverlay
        active={overlayActive}
        title={overlayContent?.title}
        subtitle={overlayContent?.subtitle}
        spinning={isDispatching}
        icon={overlayContent?.icon}
        iconColor={overlayContent?.iconColor}
        cancelLabel={isDispatching ? 'Aramayı İptal Et' : 'Kapat'}
        onCancel={isDispatching ? handleCancel : () => setActiveRide(null)}
      />

      {menuOpen && <RiderMenu onClose={() => setMenuOpen(false)} />}
    </Screen>
  );
}
