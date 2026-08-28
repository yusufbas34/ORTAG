import { Capacitor } from '@capacitor/core';
import type { AppVersionInfo } from '../../lib/appVersion';
import styles from './AppUpdateBanner.module.css';

interface AppUpdateBannerProps {
  info: AppVersionInfo;
  onDismiss: () => void;
}

export function AppUpdateBanner({ info, onDismiss }: AppUpdateBannerProps) {
  const isNative = Capacitor.isNativePlatform();

  function handleAction() {
    if (isNative) {
      window.location.href = info.downloadUrl;
    } else {
      window.location.reload();
    }
    onDismiss();
  }

  return (
    <div className={styles.banner}>
      <i className="fa-solid fa-circle-up" />
      <span>{isNative ? 'YOL güncellendi. Yeni sürümü indirip kur.' : 'YOL güncellendi. Yeni özellikler için sayfayı yenile.'}</span>
      <button className={styles.actionBtn} onClick={handleAction} type="button">
        {isNative ? 'İndir' : 'Yenile'}
      </button>
      <button className={styles.closeBtn} onClick={onDismiss} aria-label="Kapat" type="button">
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}
