import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { AuthLayout } from '../../shared/ui/AuthLayout';
import { TextField } from '../../shared/ui/TextField';
import { Button } from '../../shared/ui/Button';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      // The backend always responds the same way whether or not the email
      // is registered, so there's nothing role-specific to branch on here.
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Şifremi Unuttum" subtitle="E-postanı kontrol et" onSubmit={(e) => e.preventDefault()}>
        <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <strong>{email}</strong> adresi kayıtlıysa, şifreni sıfırlaman için bir bağlantı gönderdik. Bağlantı 1 saat
          geçerlidir.
        </p>
        <Button type="button" onClick={() => navigate('/')}>
          Giriş Ekranına Dön
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Şifremi Unuttum"
      subtitle="Kayıtlı email adresini gir, sana sıfırlama bağlantısı gönderelim"
      onSubmit={handleSubmit}
      footer={
        <>
          Şifreni hatırladın mı? <Link to="/">Giriş ekranına dön</Link>
        </>
      }
    >
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
      </Button>
    </AuthLayout>
  );
}
