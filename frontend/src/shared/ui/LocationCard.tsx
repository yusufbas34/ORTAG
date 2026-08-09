import styles from './LocationCard.module.css';

export interface LocationRow {
  key: string;
  label: string;
  value: string;
  dot: 'green' | 'black';
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
}

interface LocationCardProps {
  rows: LocationRow[];
}

export function LocationCard({ rows }: LocationCardProps) {
  return (
    <div className={styles.card}>
      {rows.map((row, i) => (
        <div key={row.key}>
          <div className={styles.row}>
            <div className={[styles.dot, styles[row.dot]].join(' ')} />
            <div className={styles.text}>
              <label>{row.label}</label>
              <input
                type="text"
                value={row.value}
                readOnly={row.readOnly}
                placeholder={row.placeholder}
                onChange={(e) => row.onChange?.(e.target.value)}
                onFocus={row.onFocus}
              />
            </div>
          </div>
          {i < rows.length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  );
}
