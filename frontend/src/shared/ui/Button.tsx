import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
}

export function Button({ children, variant = 'primary', className, ...rest }: ButtonProps) {
  const variantClass = variant === 'ghost' ? styles.ghost : styles.primary;
  return (
    <button className={[styles.btn, variantClass, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
