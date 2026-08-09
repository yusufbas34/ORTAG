import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AuthLayout } from '../../shared/ui/AuthLayout';
import { TextField } from '../../shared/ui/TextField';
import { Button } from '../../shared/ui/Button';

export function RiderLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/rider');
    } catch {
      // error is surfaced via the store
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Kullanıcı Girişi"
      subtitle="Hesabına giriş yap"
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          Hesabın yok mu? <Link to="/rider/register">Kayıt ol</Link>
        </>
      }
    >
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </Button>
    </AuthLayout>
  );
}
