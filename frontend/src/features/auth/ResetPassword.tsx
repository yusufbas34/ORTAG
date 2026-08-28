import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, ApiError } from '../../lib/apiClient';
import { AuthLayout } from '../../shared/ui/AuthLayout';
import { TextField } from '../../shared/ui/TextField';
import { Button } from '../../shared/ui/Button';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (!token) {
      setError('Bağlantı geçersiz. Yeni bir sıfırlama bağlantısı iste.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Şifre sıfırlanamadı.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Şifre Sıfırlandı" subtitle="Artık yeni şifrenle giriş yapabilirsin" onSubmit={(e) => e.preventDefault()}>
        <Button type="button" onClick={() => navigate('/')}>
          Giriş Ekranına Dön
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Yeni Şifre Belirle" subtitle="Hesabın için yeni bir şifre oluştur" error={error} onSubmit={handleSubmit}>
      {!token && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Bağlantı geçersiz veya eksik.</p>}
      <TextField
        label="Yeni Şifre"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      <TextField
        label="Yeni Şifre (Tekrar)"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        minLength={8}
        required
      />
      <Button type="submit" disabled={loading || !token}>
        {loading ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
      </Button>
    </AuthLayout>
  );
}
