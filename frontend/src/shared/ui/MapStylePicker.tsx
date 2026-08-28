import { useState } from 'react';
import { MAP_STYLES, type MapStyleId } from '../../lib/mapTiles';
import styles from './MapStylePicker.module.css';

interface MapStylePickerProps {
  value: MapStyleId;
  onChange: (id: MapStyleId) => void;
  className?: string;
}

export function MapStylePicker({ value, onChange, className }: MapStylePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={[styles.wrapper, className ?? ''].join(' ')}>
      <button className={styles.toggleBtn} onClick={() => setOpen((o) => !o)} aria-label="Harita tipi" type="button">
        <i className="fa-solid fa-layer-group" />
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.menu}>
            {MAP_STYLES.map((s) => (
              <button
                key={s.id}
                className={[styles.option, s.id === value ? styles.optionActive : ''].join(' ')}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                type="button"
              >
                <i className={s.icon} />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
