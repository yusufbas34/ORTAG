import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './PlaceholderScreen.module.css';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className={styles.page}>
      <h1>{title}</h1>
      <p>
        Hoş geldin, {user?.name}. {description}
      </p>
      {children}
      <button className={styles.logoutBtn} onClick={handleLogout}>
        Çıkış Yap
      </button>
    </div>
  );
}
