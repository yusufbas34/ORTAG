import type { ReactNode } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  children: ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <div className={styles.sheet}>
      <div className={styles.handle} />
      {children}
    </div>
  );
}
