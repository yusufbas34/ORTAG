import type { ReactNode } from 'react';
import styles from './Screen.module.css';

export function Screen({ children }: { children: ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}
