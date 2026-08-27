import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../../lib/apiClient';
import { getCurrentPosition } from '../../lib/geolocation';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { LocationCard, type LocationRow } from '../../shared/ui/LocationCard';
import { AddressSuggestions, type AddressSuggestion } from '../../shared/ui/AddressSuggestions';
import { TextField } from '../../shared/ui/TextField';
import { SelectField } from '../../shared/ui/SelectField';
import { PaymentMethodToggle } from '../../shared/ui/PaymentMethodToggle';
import { Button } from '../../shared/ui/Button';
import type { LocationPoint, PaymentMethod, Reservation, ReservationDriverOption, VehicleType } from './types';
import styles from './PlanRide.module.css';

type ActiveField = 'pickup' | 'dropoff' | null;
type TargetMode = 'BROADCAST' | 'MANUAL';

function defaultScheduledFor(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlanRide() {
  const navigate = useNavigate();

  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);

  const [scheduledFor, setScheduledFor] = useState(defaultScheduledFor());
  const [vehicleType, setVehicleType] = useState<VehicleType>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [targetMode, setTargetMode] = useState<TargetMode>('BROADCAST');
  const [allDrivers, setAllDrivers] = useState<ReservationDriverOption[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeInputValue = activeField === 'pickup' ? pickupInput : activeField === 'dropoff' ? dropoffInput : '';
  const debouncedQuery = useDebouncedValue(activeInputValue, 400);

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
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (targetMode !== 'MANUAL') return;
    const locationQuery = pickup ? `&lat=${pickup.lat}&lng=${pickup.lng}` : '';
    apiClient
      .get<{ drivers: ReservationDriverOption[] }>(`/drivers/all?vehicleType=${vehicleType}${locationQuery}`)
      .then(({ drivers }) => setAllDrivers(drivers));
  }, [targetMode, pickup?.lat, pickup?.lng, vehicleType]);

  function selectSuggestion(field: 'pickup' | 'dropoff', suggestion: AddressSuggestion) {
    if (field === 'pickup') {
      setPickup(suggestion);
      setPickupInput(suggestion.address);
    } else {
      setDropoff(suggestion);
      setDropoffInput(suggestion.address);
    }
    setSuggestions([]);
    setActiveField(null);
  }

  function toggleDriver(userId: string) {
    setSelectedDriverIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit() {
    if (!pickup || !dropoff) {
      setError('Kalkış ve varış noktası seçmelisiniz.');
      return;
    }
    if (targetMode === 'MANUAL' && selectedDriverIds.length === 0) {
      setError('En az bir şoför seçmelisiniz.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { reservation } = await apiClient.post<{ reservation: Reservation }>('/reservations', {
        pickup,
        dropoff,
        vehicleType,
        dispatchMode: targetMode === 'BROADCAST' ? 'BROADCAST' : 'DIRECT',
        directDriverIds: targetMode === 'MANUAL' ? selectedDriverIds : undefined,
        paymentMethod,
        scheduledFor: new Date(scheduledFor).toISOString(),
      });
      navigate('/rider/planned', { state: { justCreatedId: reservation.id } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Randevu oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/rider')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Araç Planla</h1>
      </div>

      <div className={styles.body}>
        {error && <div className={styles.error}>{error}</div>}

        <LocationCard rows={rows} />
        {activeField && (
          <AddressSuggestions suggestions={suggestions} onSelect={(s) => selectSuggestion(activeField, s)} />
        )}

        <TextField
          label="Tarih ve Saat"
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
        />

        <SelectField label="Araç Tipi" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
          <option value="STANDARD">YOL Standart</option>
          <option value="XL">YOL XL</option>
        </SelectField>

        <div>
          <div className={styles.modeToggle}>
            <button
              className={[styles.modeOption, targetMode === 'BROADCAST' ? styles.active : ''].join(' ')}
              onClick={() => setTargetMode('BROADCAST')}
            >
              Yakındaki Şoförlere Gönder
            </button>
            <button
              className={[styles.modeOption, targetMode === 'MANUAL' ? styles.active : ''].join(' ')}
              onClick={() => setTargetMode('MANUAL')}
            >
              Şoför Seç
            </button>
          </div>
        </div>

        {targetMode === 'MANUAL' && (
          <div className={styles.driverList}>
            {allDrivers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bu araç tipinde kayıtlı şoför bulunamadı.</p>}
            {allDrivers.map((d) => (
              <label
                key={d.userId}
                className={[styles.driverCheck, selectedDriverIds.includes(d.userId) ? styles.checked : ''].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={selectedDriverIds.includes(d.userId)}
                  onChange={() => toggleDriver(d.userId)}
                />
                <div className={styles.info}>
                  <strong>
                    {d.name}
                    {d.isFavorite && <i className="fa-solid fa-star" style={{ color: '#F59E0B', marginLeft: 6, fontSize: '0.75rem' }} />}
                  </strong>
                  <span>
                    {d.vehicleModel} • {d.vehiclePlate}
                    {d.distanceKm !== null ? ` • ${d.distanceKm} km` : ''}
                  </span>
                </div>
                <span className={[styles.statusDot, d.isAvailable ? styles.statusOnline : styles.statusOffline].join(' ')}>
                  {d.isAvailable ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
              </label>
            ))}
          </div>
        )}

        <PaymentMethodToggle value={paymentMethod} onChange={setPaymentMethod} />

        <Button onClick={handleSubmit} disabled={submitting}>
          <span>{submitting ? 'Gönderiliyor...' : 'Randevu Oluştur'}</span>
        </Button>
      </div>
    </div>
  );
}
