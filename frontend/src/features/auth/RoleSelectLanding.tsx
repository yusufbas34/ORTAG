import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';
import styles from './RoleSelectLanding.module.css';

export function RoleSelectLanding() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <div className={styles.badge}>
          <i className="fa-solid fa-route" />
        </div>
        <div className={styles.logo}>YOL</div>
        <p>Nasıl devam etmek istersin?</p>
      </div>

      <div className={styles.options}>
        <button className={styles.card} onClick={() => navigate('/rider/login')}>
          <i className="fa-solid fa-user" />
          <div>
            <h3>Kullanıcı</h3>
            <p>Araç çağır veya randevu planla</p>
          </div>
        </button>

        <button className={styles.card} onClick={() => navigate('/driver/login')}>
          <i className="fa-solid fa-car-side" />
          <div>
            <h3>Şoför</h3>
            <p>Talepleri gör, yolculuk kabul et</p>
          </div>
        </button>
      </div>

      <Button variant="ghost" onClick={() => navigate('/admin/login')}>
        Yönetici Girişi
      </Button>
    </div>
  );
}
