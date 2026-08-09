import { useEffect, useState } from 'react';
import { Screen } from '../../shared/ui/Screen';
import { AppHeader } from '../../shared/ui/AppHeader';
import { MapView } from '../../shared/ui/MapView';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { LocationCard, type LocationRow } from '../../shared/ui/LocationCard';
import { AddressSuggestions, type AddressSuggestion } from '../../shared/ui/AddressSuggestions';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { VehicleOptionCard } from '../../shared/ui/VehicleOptionCard';
import { Button } from '../../shared/ui/Button';
import { SearchingOverlay } from '../../shared/ui/SearchingOverlay';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { apiClient } from '../../lib/apiClient';
import { getCurrentPosition } from '../../lib/geolocation';
import type { LocationPoint, QuoteResponse, VehicleType } from './types';

type ActiveField = 'pickup' | 'dropoff' | null;

const VEHICLE_META: { id: VehicleType; icon: string; title: string; subtitle: string }[] = [
  { id: 'STANDARD', icon: 'fa-solid fa-car-side', title: 'TAG Standart', subtitle: '1-4 Kişilik • Hızlı Eşleşme' },
  { id: 'XL', icon: 'fa-solid fa-van-shuttle', title: 'TAG XL', subtitle: 'Geniş Araç • Konfor' },
];

export function RiderHome() {
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('STANDARD');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const activeInputValue = activeField === 'pickup' ? pickupInput : activeField === 'dropoff' ? dropoffInput : '';
  const debouncedQuery = useDebouncedValue(activeInputValue, 400);

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

  return (
    <Screen>
      <AppHeader />
      <MapView pickup={pickup} dropoff={dropoff} routeCoordinates={routeCoordinates} />

      <BottomSheet>
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

        <Button onClick={() => setSearching(true)} disabled={!quote}>
          <span>TAG Çağır</span>
          <i className="fa-solid fa-arrow-right" />
        </Button>
      </BottomSheet>

      <SearchingOverlay active={searching} onCancel={() => setSearching(false)} />
    </Screen>
  );
}
