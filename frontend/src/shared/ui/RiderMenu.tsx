import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './RiderMenu.module.css';

interface RiderMenuProps {
  onClose: () => void;
}

export function RiderMenu({ onClose }: RiderMenuProps) {
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

        <div className={styles.spacer} />

        <button className={[styles.item, styles.logout].join(' ')} onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
