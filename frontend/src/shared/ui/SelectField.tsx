import type { SelectHTMLAttributes, ReactNode } from 'react';
import styles from './TextField.module.css';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function SelectField({ label, id, children, ...rest }: SelectFieldProps) {
  const inputId = id ?? label;
  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <select id={inputId} {...rest}>
        {children}
      </select>
    </div>
  );
}
