import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function IconButton({ children, className, ...rest }: IconButtonProps) {
  return (
    <button className={[styles.iconBtn, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
