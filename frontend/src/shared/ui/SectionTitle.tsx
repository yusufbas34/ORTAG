import type { ReactNode } from 'react';
import styles from './SectionTitle.module.css';

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className={styles.title}>{children}</div>;
}
