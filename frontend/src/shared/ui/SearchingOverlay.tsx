import styles from './SearchingOverlay.module.css';

interface SearchingOverlayProps {
  active: boolean;
  title?: string;
  subtitle?: string;
  spinning?: boolean;
  icon?: string;
  iconColor?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

export function SearchingOverlay({
  active,
  title = 'Sürücü Aranıyor...',
  subtitle = 'Yakındaki sürücülere talebin iletiliyor.',
  spinning = true,
  icon = 'fa-solid fa-triangle-exclamation',
  iconColor,
  cancelLabel = 'Aramayı İptal Et',
  onCancel,
}: SearchingOverlayProps) {
  return (
    <div className={[styles.overlay, active ? styles.active : ''].join(' ')}>
      {spinning ? (
        <div className={styles.spinner} />
      ) : (
        <i className={`${icon} ${styles.statusIcon}`} style={iconColor ? { color: iconColor } : undefined} />
      )}
      <h2>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
      {onCancel && (
        <button className={styles.cancelBtn} onClick={onCancel}>
          {cancelLabel}
        </button>
      )}
    </div>
  );
}
