export type MapStyleId = 'standard' | 'light' | 'dark' | 'satellite';

export interface MapStyleDef {
  id: MapStyleId;
  label: string;
  icon: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

export const MAP_STYLES: MapStyleDef[] = [
  {
    id: 'standard',
    label: 'Standart',
    icon: 'fa-solid fa-map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap katkıda bulunanlar',
  },
  {
    id: 'light',
    label: 'Açık',
    icon: 'fa-solid fa-sun',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap katkıda bulunanlar &copy; CARTO',
    maxZoom: 20,
  },
  {
    id: 'dark',
    label: 'Koyu',
    icon: 'fa-solid fa-moon',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap katkıda bulunanlar &copy; CARTO',
    maxZoom: 20,
  },
  {
    id: 'satellite',
    label: 'Uydu',
    icon: 'fa-solid fa-satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
];

const STORAGE_KEY = 'yol_map_style';

export function getSavedMapStyle(): MapStyleId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && MAP_STYLES.some((s) => s.id === saved)) return saved as MapStyleId;
  } catch {
    /* ignore */
  }
  return 'standard';
}

export function saveMapStyle(id: MapStyleId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
