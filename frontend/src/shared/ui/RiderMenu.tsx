import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { enablePushNotifications } from '../../lib/push';
import styles from './RiderMenu.module.css';

interface RiderMenuProps {
  onClose: () => void;
}

const PUSH_RESULT_LABEL: Record<string, string> = {
  subscribed: 'Bildirimler açıldı ✓',
  denied: 'Bildirim izni verilmedi',
  unsupported: 'Bu cihaz bildirimi desteklemiyor',
  unavailable: 'Bildirim servisi şu an kullanılamıyor',
};

export function RiderMenu({ onClose }: RiderMenuProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleEnablePush() {
    setEnablingPush(true);
    try {
      const result = await enablePushNotifications();
      setPushStatus(PUSH_RESULT_LABEL[result]);
    } catch {
      setPushStatus('Bildirimler açılamadı');
    } finally {
      setEnablingPush(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.brand}>YOL</div>

        <button className={styles.item} onClick={() => navigate('/rider')}>
          <i className="fa-solid fa-house" />
          Ana Sayfa
        </button>
        <button className={styles.item} onClick={() => navigate('/rider/plan')}>
          <i className="fa-solid fa-calendar-plus" />
          Araç Planla
        </button>
        <button className={styles.item} onClick={() => navigate('/rider/planned')}>
          <i className="fa-solid fa-calendar-check" />
          Planlı YOL
        </button>
        <button className={styles.item} onClick={() => navigate('/rider/favorites')}>
          <i className="fa-solid fa-heart" />
          Favori Şoförlerim
        </button>
        <button className={styles.item} onClick={() => navigate('/rider/history')}>
          <i className="fa-solid fa-clock-rotate-left" />
          Yolculuk Geçmişim
        </button>
        <button className={styles.item} onClick={() => navigate('/rider/addresses')}>
          <i className="fa-solid fa-map-pin" />
          Sık Kullanılan Adreslerim
        </button>
        <button className={styles.item} onClick={handleEnablePush} disabled={enablingPush}>
          <i className="fa-solid fa-bell" />
          {pushStatus ?? (enablingPush ? 'Açılıyor...' : 'Bildirimleri Aç')}
        </button>

        <div className={styles.spacer} />

        <button className={[styles.item, styles.logout].join(' ')} onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
