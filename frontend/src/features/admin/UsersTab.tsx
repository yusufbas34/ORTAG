import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import type { AdminUser, AdminUserRole } from './types';
import styles from './AdminHome.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function UsersTab() {
  const [role, setRole] = useState<AdminUserRole>('RIDER');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [banFormFor, setBanFormFor] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    const q = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : '';
    apiClient
      .get<{ users: AdminUser[] }>(`/admin/users?role=${role}${q}`)
      .then(({ users }) => setUsers(users))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function handleBan(id: string) {
    setBusyId(id);
    try {
      await apiClient.post(`/admin/users/${id}/ban`, { reason: banReason });
      setBanFormFor(null);
      setBanReason('');
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnban(id: string) {
    setBusyId(id);
    try {
      await apiClient.post(`/admin/users/${id}/unban`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Kullanıcı Yönetimi</div>

      <div className={styles.roleToggle}>
        <button className={[styles.roleOption, role === 'RIDER' ? styles.roleActive : ''].join(' ')} onClick={() => setRole('RIDER')}>
          Yolcular
        </button>
        <button className={[styles.roleOption, role === 'DRIVER' ? styles.roleActive : ''].join(' ')} onClick={() => setRole('DRIVER')}>
          Şoförler
        </button>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder="İsim veya email ara..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className={styles.searchBtn} onClick={load}>
          <i className="fa-solid fa-magnifying-glass" />
        </button>
      </div>

      {!loading && users.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Kullanıcı bulunamadı.</p>}

      <div className={styles.userList}>
        {users.map((u) => (
          <div key={u.id} className={styles.userRow}>
            <div className={styles.userInfo}>
              <strong>
                {u.name}
                {u.isBanned && <span className={styles.bannedBadge}>Engelli</span>}
              </strong>
              <span>{u.email}</span>
              {u.vehiclePlate && (
                <span>
                  {u.vehicleModel} • {u.vehiclePlate}
                </span>
              )}
              <span className={styles.userMeta}>Kayıt: {formatDate(u.createdAt)}</span>
              {u.isBanned && u.bannedReason && <span className={styles.bannedReason}>Sebep: {u.bannedReason}</span>}
            </div>

            {u.isBanned ? (
              <button className={styles.unbanBtn} onClick={() => handleUnban(u.id)} disabled={busyId === u.id}>
                Engeli Kaldır
              </button>
            ) : banFormFor === u.id ? (
              <div className={styles.banForm}>
                <textarea
                  className={styles.banTextarea}
                  placeholder="Engelleme sebebi (opsiyonel)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                />
                <div className={styles.banFormActions}>
                  <button
                    className={styles.cancelBanBtn}
                    onClick={() => {
                      setBanFormFor(null);
                      setBanReason('');
                    }}
                    disabled={busyId === u.id}
                  >
                    Vazgeç
                  </button>
                  <button className={styles.confirmBanBtn} onClick={() => handleBan(u.id)} disabled={busyId === u.id}>
                    {busyId === u.id ? 'Engelleniyor...' : 'Engelle'}
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.banBtn} onClick={() => setBanFormFor(u.id)}>
                Engelle
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
