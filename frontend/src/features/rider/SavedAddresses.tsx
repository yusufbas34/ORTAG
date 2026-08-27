import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { TextField } from '../../shared/ui/TextField';
import { AddressSuggestions, type AddressSuggestion } from '../../shared/ui/AddressSuggestions';
import { Button } from '../../shared/ui/Button';
import type { SavedAddress } from './types';
import styles from './SavedAddresses.module.css';

const QUICK_LABELS = ['Ev', 'İş', 'Diğer'];

export function SavedAddresses() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('Ev');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [saving, setSaving] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 400);

  function load() {
    apiClient
      .get<{ addresses: SavedAddress[] }>('/saved-addresses')
      .then(({ addresses }) => setAddresses(addresses))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ results: AddressSuggestion[] }>(`/geocode/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(({ results }) => {
        if (!cancelled) setSuggestions(results);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.address);
    setSuggestions([]);
  }

  async function handleSave() {
    if (!selected || !label.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/saved-addresses', { label: label.trim(), ...selected });
      setQuery('');
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    await apiClient.del(`/saved-addresses/${id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/rider')} aria-label="Geri">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1>Sık Kullanılan Adreslerim</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.form}>
          <div className={styles.labelRow}>
            {QUICK_LABELS.map((l) => (
              <button
                key={l}
                type="button"
                className={[styles.labelChip, label === l ? styles.labelChipActive : ''].join(' ')}
                onClick={() => setLabel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <TextField
            label="Etiket"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ev, İş, Anneler..."
          />
          <TextField
            label="Adres Ara"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Adres yazmaya başla..."
          />
          <AddressSuggestions suggestions={suggestions} onSelect={selectSuggestion} />
          <Button onClick={handleSave} disabled={!selected || !label.trim() || saving}>
            <span>{saving ? 'Kaydediliyor...' : 'Adresi Kaydet'}</span>
          </Button>
        </div>

        <div className={styles.list}>
          {!loading && addresses.length === 0 && <p className={styles.empty}>Henüz kayıtlı adresin yok.</p>}
          {addresses.map((a) => (
            <div key={a.id} className={styles.card}>
              <i className="fa-solid fa-map-pin" />
              <div className={styles.info}>
                <strong>{a.label}</strong>
                <span>{a.address}</span>
              </div>
              <button className={styles.removeBtn} onClick={() => handleDelete(a.id)} aria-label="Sil">
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
