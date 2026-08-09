import { useState } from 'react';
import { Screen } from '../../shared/ui/Screen';
import { AppHeader } from '../../shared/ui/AppHeader';
import { MapView, type MapCarMarker } from '../../shared/ui/MapView';
import { BottomSheet } from '../../shared/ui/BottomSheet';
import { LocationCard, type LocationRow } from '../../shared/ui/LocationCard';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { VehicleOptionCard } from '../../shared/ui/VehicleOptionCard';
import { Button } from '../../shared/ui/Button';
import { SearchingOverlay } from '../../shared/ui/SearchingOverlay';

// Stage 1 mock data — replaced by /api/rides/quote and live driver positions in Stage 3-4.
const MOCK_CARS: MapCarMarker[] = [
  { id: '1', topPct: 25, leftPct: 30 },
  { id: '2', topPct: 45, leftPct: 75 },
  { id: '3', topPct: 20, leftPct: 60 },
];

const MOCK_VEHICLES = [
  {
    id: 'standard',
    icon: 'fa-solid fa-car-side',
    title: 'TAG Standart',
    subtitle: '1-4 Kişilik • Hızlı Eşleşme',
    price: '₺185',
    eta: '3 dk yakında',
  },
  {
    id: 'xl',
    icon: 'fa-solid fa-van-shuttle',
    title: 'TAG XL',
    subtitle: 'Geniş Araç • Konfor',
    price: '₺290',
    eta: '6 dk yakında',
  },
];

export function RiderHome() {
  const [pickup, setPickup] = useState('Kadıköy Rıhtım, İstanbul');
  const [dropoff, setDropoff] = useState('Beşiktaş Meydan, İstanbul');
  const [selectedVehicle, setSelectedVehicle] = useState(MOCK_VEHICLES[0].id);
  const [searching, setSearching] = useState(false);

  const rows: LocationRow[] = [
    { key: 'pickup', label: 'Kalkış', value: pickup, dot: 'green', onChange: setPickup },
    { key: 'dropoff', label: 'Varış', value: dropoff, dot: 'black', onChange: setDropoff },
  ];

  return (
    <Screen>
      <AppHeader />
      <MapView cars={MOCK_CARS} />

      <BottomSheet>
        <LocationCard rows={rows} />

        <SectionTitle>YOLCULUK SEÇENEKLERİ</SectionTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {MOCK_VEHICLES.map((v) => (
            <VehicleOptionCard
              key={v.id}
              icon={v.icon}
              title={v.title}
              subtitle={v.subtitle}
              price={v.price}
              eta={v.eta}
              active={selectedVehicle === v.id}
              onClick={() => setSelectedVehicle(v.id)}
            />
          ))}
        </div>

        <Button onClick={() => setSearching(true)}>
          <span>TAG Çağır</span>
          <i className="fa-solid fa-arrow-right" />
        </Button>
      </BottomSheet>

      <SearchingOverlay active={searching} onCancel={() => setSearching(false)} />
    </Screen>
  );
}
