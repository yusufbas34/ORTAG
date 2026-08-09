import styles from './SearchingOverlay.module.css';

interface SearchingOverlayProps {
  active: boolean;
  title?: string;
  subtitle?: string;
  onCancel?: () => void;
}

export function SearchingOverlay({
  active,
  title = 'Sürücü Aranıyor...',
  subtitle = 'Yakındaki sürücülere talebin iletiliyor.',
  onCancel,
}: SearchingOverlayProps) {
  return (
    <div className={[styles.overlay, active ? styles.active : ''].join(' ')}>
      <div className={styles.spinner} />
      <h2>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
      {onCancel && (
        <button className={styles.cancelBtn} onClick={onCancel}>
          Aramayı İptal Et
        </button>
      )}
    </div>
  );
}
