import styles from './DriverListItem.module.css';

interface DriverListItemProps {
  name: string;
  vehiclePlate: string;
  vehicleModel: string;
  distanceKm: number;
  etaMin: number;
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

export function DriverListItem({
  name,
  vehiclePlate,
  vehicleModel,
  distanceKm,
  etaMin,
  isFavorite,
  favoriteBusy,
  onClick,
  onToggleFavorite,
}: DriverListItemProps) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.avatar}>
        <i className="fa-solid fa-user" />
      </div>
      <div className={styles.details}>
        <h4>
          {name}
          {isFavorite && <i className={['fa-solid fa-star', styles.favoriteStar].join(' ')} />}
        </h4>
        <p>
          {vehicleModel} • {vehiclePlate}
        </p>
      </div>
      <div className={styles.meta}>
        <div className={styles.distance}>{distanceKm} km</div>
        <div className={styles.eta}>{etaMin} dk</div>
      </div>
      {onToggleFavorite && (
        <button
          className={[styles.favoriteBtn, isFavorite ? styles.favoriteActive : ''].join(' ')}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          disabled={favoriteBusy}
          aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <i className={isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
        </button>
      )}
    </div>
  );
}
