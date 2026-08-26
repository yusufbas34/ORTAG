import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient, ApiError } from '../../lib/apiClient';
import { Button } from '../../shared/ui/Button';
import type { PricingConfig, PricingHistoryEntry } from './types';
import styles from './AdminHome.module.css';

const VEHICLE_MULTIPLIER = { STANDARD: 1, XL: 1.5 };
const PREVIEW_DISTANCE_KM = 10;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AdminHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [history, setHistory] = useState<PricingHistoryEntry[]>([]);
  const [percent, setPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient
      .get<{ config: PricingConfig; history: PricingHistoryEntry[] }>('/admin/pricing')
      .then(({ config, history }) => {
        setConfig(config);
        setPercent(config.adjustmentPercent);
        setHistory(history);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      await apiClient.post<{ config: PricingConfig }>('/admin/pricing', { adjustmentPercent: percent });
      setSaveMessage('Kaydedildi.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const baseRate = config?.baseRatePerKm ?? 40;
  const previewStandard = Math.round(PREVIEW_DISTANCE_KM * baseRate * (1 + percent / 100) * VEHICLE_MULTIPLIER.STANDARD);
  const previewXl = Math.round(PREVIEW_DISTANCE_KM * baseRate * (1 + percent / 100) * VEHICLE_MULTIPLIER.XL);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Yönetici Paneli</h1>
          <p>Hoş geldin, {user?.name}</p>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Çıkış Yap
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Fiyatlandırma</div>
          <div className={styles.baseRate}>Taban ücret: ₺{baseRate} / km</div>

          <div className={styles.sliderRow}>
            <input
              type="range"
              min={-50}
              max={200}
              step={5}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
            <div className={styles.percentValue}>
              {percent > 0 ? '+' : ''}
              {percent}%
            </div>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewCard}>
              <div className={styles.label}>TAG Standart (10 km)</div>
              <div className={styles.value}>₺{previewStandard}</div>
            </div>
            <div className={styles.previewCard}>
              <div className={styles.label}>TAG XL (10 km)</div>
              <div className={styles.value}>₺{previewXl}</div>
            </div>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
          {saveMessage && <div className={styles.saveMsg}>{saveMessage}</div>}

          <Button onClick={handleSave} disabled={saving}>
            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Geçmiş</div>
          {history.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Henüz değişiklik yok.</p>}
          {history.map((h) => (
            <div key={h.id} className={styles.historyItem}>
              <span className={styles.percent}>
                {h.adjustmentPercent > 0 ? '+' : ''}
                {h.adjustmentPercent}%
              </span>
              <span className={styles.meta}>
                {h.updatedByName} • {formatDateTime(h.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
