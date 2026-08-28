import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AuthLayout } from '../../shared/ui/AuthLayout';
import { TextField } from '../../shared/ui/TextField';
import { Button } from '../../shared/ui/Button';

export function AdminLogin() {
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
      navigate('/admin');
    } catch {
      // error is surfaced via the store
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Yönetici Girişi" subtitle="Fiyatlandırma paneline eriş" error={error} onSubmit={handleSubmit}>
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
      <div style={{ textAlign: 'right', marginTop: '-6px' }}>
        <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
          Şifremi unuttum
        </Link>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </Button>
    </AuthLayout>
  );
}
