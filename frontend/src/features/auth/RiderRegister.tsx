import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AuthLayout } from '../../shared/ui/AuthLayout';
import { TextField } from '../../shared/ui/TextField';
import { Button } from '../../shared/ui/Button';

export function RiderRegister() {
  const navigate = useNavigate();
  const registerRider = useAuthStore((s) => s.registerRider);
  const error = useAuthStore((s) => s.error);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await registerRider({ name, email, password });
      navigate('/rider');
    } catch {
      // error is surfaced via the store
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Kullanıcı Kaydı"
      subtitle="Yeni bir hesap oluştur"
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          Zaten hesabın var mı? <Link to="/rider/login">Giriş yap</Link>
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
      <Button type="submit" disabled={loading}>
        {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
      </Button>
    </AuthLayout>
  );
}
