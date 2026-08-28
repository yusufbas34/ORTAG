import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { TextField } from '../../shared/ui/TextField';
import { SelectField } from '../../shared/ui/SelectField';
import { Button } from '../../shared/ui/Button';
import styles from './DriverProfile.module.css';

interface DriverProfileData {
  vehiclePlate: string;
  vehicleModel: string;
  vehicleType: 'STANDARD' | 'XL';
  iban: string;
}

export function DriverProfile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [vehicle, setVehicle] = useState<DriverProfileData | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleSaved, setVehicleSaved] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ profile: DriverProfileData }>('/drivers/me').then(({ profile }) => setVehicle(profile));
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    try {
      const { user: updated } = await apiClient.patch<{ user: NonNullable<typeof user> }>('/auth/me', { name });
      setUser(updated);
      setNameSaved(true);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    setSavingVehicle(true);
    setVehicleError(null);
    setVehicleSaved(false);
    try {
      const { profile } = await apiClient.patch<{ profile: DriverProfileData }>('/drivers/me', vehicle);
      setVehicle(profile);
      setVehicleSaved(true);
    } catch (err) {
      setVehicleError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSavingVehicle(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/driver')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Bilgilerim</h1>
      </div>

      <div className={styles.content}>
        <form className={styles.card} onSubmit={handleSaveName}>
          <h2>Kişisel Bilgiler</h2>
          <TextField label="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          <TextField label="E-posta" value={user?.email ?? ''} disabled readOnly />
          {nameError && <p className={styles.error}>{nameError}</p>}
          {nameSaved && <p className={styles.success}>Kaydedildi.</p>}
          <Button type="submit" disabled={savingName}>
            {savingName ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </form>

        {vehicle && (
          <form className={styles.card} onSubmit={handleSaveVehicle}>
            <h2>Araç Bilgileri</h2>
            <TextField
              label="Plaka"
              value={vehicle.vehiclePlate}
              onChange={(e) => setVehicle({ ...vehicle, vehiclePlate: e.target.value })}
              required
            />
            <TextField
              label="Araç Modeli"
              value={vehicle.vehicleModel}
              onChange={(e) => setVehicle({ ...vehicle, vehicleModel: e.target.value })}
              required
            />
            <SelectField
              label="Araç Tipi"
              value={vehicle.vehicleType}
              onChange={(e) => setVehicle({ ...vehicle, vehicleType: e.target.value as 'STANDARD' | 'XL' })}
            >
              <option value="STANDARD">YOL Standart</option>
              <option value="XL">YOL XL</option>
            </SelectField>
            <TextField
              label="IBAN"
              value={vehicle.iban}
              onChange={(e) => setVehicle({ ...vehicle, iban: e.target.value })}
              required
            />
            {vehicleError && <p className={styles.error}>{vehicleError}</p>}
            {vehicleSaved && <p className={styles.success}>Kaydedildi.</p>}
            <Button type="submit" disabled={savingVehicle}>
              {savingVehicle ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
