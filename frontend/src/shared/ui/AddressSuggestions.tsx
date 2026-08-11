import styles from './AddressSuggestions.module.css';

export interface AddressSuggestion {
  address: string;
  lat: number;
  lng: number;
}

interface AddressSuggestionsProps {
  suggestions: AddressSuggestion[];
  onSelect: (suggestion: AddressSuggestion) => void;
}

export function AddressSuggestions({ suggestions, onSelect }: AddressSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={styles.list}>
      {suggestions.map((s, i) => (
        <button key={`${s.lat}-${s.lng}-${i}`} type="button" className={styles.item} onClick={() => onSelect(s)}>
          <i className="fa-solid fa-location-dot" />
          <span>{s.address}</span>
        </button>
      ))}
    </div>
  );
}
