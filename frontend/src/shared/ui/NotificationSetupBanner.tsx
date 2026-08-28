import { useState } from 'react';
import { enablePushNotifications } from '../../lib/push';
import styles from './NotificationSetupBanner.module.css';

const DISMISS_KEY = 'yol_push_banner_dismissed';

interface NotificationSetupBannerProps {
  onEnabled: () => void;
}

export function NotificationSetupBanner({ onEnabled }: NotificationSetupBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [enabling, setEnabling] = useState(false);

  if (dismissed) return null;

  async function handleEnable() {
    setEnabling(true);
    try {
      const result = await enablePushNotifications();
      if (result === 'subscribed') onEnabled();
    } finally {
      setEnabling(false);
    }
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className={styles.banner}>
      <i className="fa-solid fa-bell" />
      <span>Yeni yolculuk ve mesaj bildirimlerini kaçırma, bildirimleri şimdi aç.</span>
      <button className={styles.enableBtn} onClick={handleEnable} disabled={enabling}>
        {enabling ? 'Açılıyor...' : 'Aç'}
      </button>
      <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Kapat">
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}
