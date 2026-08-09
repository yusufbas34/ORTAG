import { IconButton } from './IconButton';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  onMenuClick?: () => void;
  onBellClick?: () => void;
}

export function AppHeader({ onMenuClick, onBellClick }: AppHeaderProps) {
  return (
    <div className={styles.header}>
      <IconButton onClick={onMenuClick} aria-label="Menü">
        <i className="fa-solid fa-bars" />
      </IconButton>
      <IconButton onClick={onBellClick} aria-label="Bildirimler">
        <i className="fa-solid fa-bell" />
      </IconButton>
    </div>
  );
}
