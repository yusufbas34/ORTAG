import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import type { FavoriteDriver } from './types';
import styles from './FavoriteDrivers.module.css';

export function FavoriteDrivers() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ favorites: FavoriteDriver[] }>('/favorites')
      .then(({ favorites }) => setFavorites(favorites))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(driverId: string) {
    setFavorites((prev) => prev.filter((f) => f.driverId !== driverId));
    await apiClient.del(`/favorites/${driverId}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/rider')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Favori Şoförlerim</h1>
      </div>

      <div className={styles.list}>
        {!loading && favorites.length === 0 && (
          <p className={styles.empty}>
            Henüz favori şoförün yok. Bir yolculuk sırasında şoför bilgisinin yanındaki kalp ikonuyla favorilere ekleyebilirsin.
          </p>
        )}

        {favorites.map((f) => (
          <div key={f.driverId} className={styles.card}>
            <div className={styles.avatar}>
              <i className="fa-solid fa-user" />
            </div>
            <div className={styles.info}>
              <strong>{f.name}</strong>
              <span>
                {f.vehicleModel} • {f.vehiclePlate}
              </span>
              <span className={[styles.statusDot, f.isAvailable ? styles.statusOnline : styles.statusOffline].join(' ')}>
                {f.isAvailable ? 'Çevrimiçi' : 'Çevrimdışı'}
              </span>
            </div>
            <button className={styles.removeBtn} onClick={() => handleRemove(f.driverId)} aria-label="Favorilerden çıkar">
              <i className="fa-solid fa-heart-crack" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
