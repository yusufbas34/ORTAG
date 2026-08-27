import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { PricingTab } from './PricingTab';
import { UsersTab } from './UsersTab';
import { EarningsTab } from './EarningsTab';
import styles from './AdminHome.module.css';

type Tab = 'pricing' | 'users' | 'earnings';

export function AdminHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [tab, setTab] = useState<Tab>('pricing');

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Yönetici Paneli</h1>
          <p>Hoş geldin, {user?.name}</p>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Çıkış Yap
        </button>
      </div>

      <div className={styles.tabs}>
        <button className={[styles.tab, tab === 'pricing' ? styles.tabActive : ''].join(' ')} onClick={() => setTab('pricing')}>
          Fiyatlandırma
        </button>
        <button className={[styles.tab, tab === 'users' ? styles.tabActive : ''].join(' ')} onClick={() => setTab('users')}>
          Kullanıcılar
        </button>
        <button className={[styles.tab, tab === 'earnings' ? styles.tabActive : ''].join(' ')} onClick={() => setTab('earnings')}>
          Hizmet Raporu
        </button>
      </div>

      <div className={styles.body}>
        {tab === 'pricing' && <PricingTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'earnings' && <EarningsTab />}
      </div>
    </div>
  );
}
