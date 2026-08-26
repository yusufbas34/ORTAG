import { SectionTitle } from './SectionTitle';
import styles from './PaymentMethodToggle.module.css';

export type PaymentMethod = 'CASH' | 'IBAN_TRANSFER';

interface PaymentMethodToggleProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export function PaymentMethodToggle({ value, onChange }: PaymentMethodToggleProps) {
  return (
    <div className={styles.wrapper}>
      <SectionTitle>ÖDEME YÖNTEMİ</SectionTitle>
      <div className={styles.options}>
        <button
          type="button"
          className={[styles.option, value === 'CASH' ? styles.active : ''].join(' ')}
          onClick={() => onChange('CASH')}
        >
          <i className="fa-solid fa-money-bill-wave" />
          Nakit
        </button>
        <button
          type="button"
          className={[styles.option, value === 'IBAN_TRANSFER' ? styles.active : ''].join(' ')}
          onClick={() => onChange('IBAN_TRANSFER')}
        >
          <i className="fa-solid fa-building-columns" />
          IBAN Havale
        </button>
      </div>
    </div>
  );
}
