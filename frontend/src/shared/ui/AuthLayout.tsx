import type { FormEvent, ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  error?: string | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, error, onSubmit, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>TAG</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={onSubmit}>
          {children}
        </form>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
