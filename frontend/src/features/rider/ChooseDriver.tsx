import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { DriverListItem } from '../../shared/ui/DriverListItem';
import type { DriverSummary, LocationPoint, PaymentMethod, Ride, VehicleType } from './types';
import styles from './ChooseDriver.module.css';

interface ChooseDriverState {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
}

export function ChooseDriver() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ChooseDriverState | null;

  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (!state) {
      navigate('/rider', { replace: true });
      return;
    }

    apiClient
      .get<{ drivers: DriverSummary[] }>(
        `/drivers/nearby?lat=${state.pickup.lat}&lng=${state.pickup.lng}&vehicleType=${state.vehicleType}`,
      )
      .then(({ drivers }) => setDrivers(drivers))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;

  async function handleSelect(driver: DriverSummary) {
    if (!state) return;
    setSelecting(true);
    try {
      const { ride } = await apiClient.post<{ ride: Ride }>('/rides', {
        pickup: state.pickup,
        dropoff: state.dropoff,
        vehicleType: state.vehicleType,
        dispatchMode: 'DIRECT',
        directDriverId: driver.userId,
        paymentMethod: state.paymentMethod,
      });
      navigate('/rider', { state: { activeRideId: ride.id } });
    } catch {
      setSelecting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/rider')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Şoför Seç</h1>
      </div>

      <div className={styles.list}>
        {loading && <p className={styles.empty}>Yakınındaki şoförler aranıyor...</p>}

        {!loading && drivers.length === 0 && (
          <p className={styles.empty}>Şu an yakınında bu araç tipinde müsait şoför yok.</p>
        )}

        {drivers.map((driver) => (
          <DriverListItem
            key={driver.userId}
            name={driver.name}
            vehiclePlate={driver.vehiclePlate}
            vehicleModel={driver.vehicleModel}
            distanceKm={driver.distanceKm}
            etaMin={driver.etaMin}
            onClick={selecting ? undefined : () => handleSelect(driver)}
          />
        ))}
      </div>
    </div>
  );
}
