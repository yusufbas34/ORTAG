import styles from './VehicleOptionCard.module.css';

interface VehicleOptionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  price: string;
  eta: string;
  active?: boolean;
  onClick?: () => void;
}

export function VehicleOptionCard({
  icon,
  title,
  subtitle,
  price,
  eta,
  active,
  onClick,
}: VehicleOptionCardProps) {
  return (
    <div
      className={[styles.card, active ? styles.active : ''].join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className={styles.info}>
        <div className={styles.icon}>
          <i className={icon} />
        </div>
        <div className={styles.details}>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={styles.price}>
        <div className={styles.priceValue}>{price}</div>
        <div className={styles.eta}>{eta}</div>
      </div>
    </div>
  );
}
