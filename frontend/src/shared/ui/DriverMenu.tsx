import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './RiderMenu.module.css';

interface DriverMenuProps {
  onClose: () => void;
  pushEnabled: boolean | null;
  pushEnabling: boolean;
  onEnablePush: () => void;
}

export function DriverMenu({ onClose, pushEnabled, pushEnabling, onEnablePush }: DriverMenuProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.brand}>YOL</div>

        <button className={styles.item} onClick={() => navigate('/driver')}>
          <i className="fa-solid fa-house" />
          Ana Sayfa
        </button>
        <button className={styles.item} onClick={() => navigate('/driver/profile')}>
          <i className="fa-solid fa-car" />
          Araç Bilgileri
        </button>
        <button className={styles.item} onClick={() => navigate('/driver/profile')}>
          <i className="fa-solid fa-id-card" />
          Kişisel Bilgiler
        </button>
        <button className={styles.item} onClick={() => navigate('/driver')}>
          <i className="fa-solid fa-calendar-check" />
          Planlı YOL
        </button>
        <button className={styles.item} onClick={() => navigate('/driver/history')}>
          <i className="fa-solid fa-ban" />
          İptaller ve Geçmiş
        </button>
        <button className={styles.item} onClick={onEnablePush} disabled={pushEnabling}>
          <i className={pushEnabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash'} />
          {pushEnabling ? 'Açılıyor...' : pushEnabled ? 'Bildirimler açık ✓' : 'Bildirimleri Aç'}
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
