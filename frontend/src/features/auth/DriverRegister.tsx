import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AuthLayout } from '../../shared/ui/AuthLayout';
import { TextField } from '../../shared/ui/TextField';
import { SelectField } from '../../shared/ui/SelectField';
import { Button } from '../../shared/ui/Button';

export function DriverRegister() {
  const navigate = useNavigate();
  const registerDriver = useAuthStore((s) => s.registerDriver);
  const error = useAuthStore((s) => s.error);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState<'STANDARD' | 'XL'>('STANDARD');
  const [iban, setIban] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await registerDriver({ name, email, password, vehiclePlate, vehicleModel, vehicleType, iban });
      navigate('/driver');
    } catch {
      // error is surfaced via the store
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Şoför Kaydı"
      subtitle="Araç bilgilerinle kayıt ol"
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          Zaten hesabın var mı? <Link to="/driver/login">Giriş yap</Link>
        </>
      }
    >
      <TextField label="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} required />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextField
        label="Şifre"
        type="password"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <TextField
        label="Plaka"
        placeholder="34 AB 123"
        value={vehiclePlate}
        onChange={(e) => setVehiclePlate(e.target.value)}
        required
      />
      <TextField
        label="Araç Modeli"
        placeholder="Toyota Corolla"
        value={vehicleModel}
        onChange={(e) => setVehicleModel(e.target.value)}
        required
      />
      <SelectField
        label="Araç Tipi"
        value={vehicleType}
        onChange={(e) => setVehicleType(e.target.value as 'STANDARD' | 'XL')}
      >
        <option value="STANDARD">YOL Standart</option>
        <option value="XL">YOL XL</option>
      </SelectField>
      <TextField
        label="IBAN"
        placeholder="TR.."
        value={iban}
        onChange={(e) => setIban(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
      </Button>
    </AuthLayout>
  );
}
