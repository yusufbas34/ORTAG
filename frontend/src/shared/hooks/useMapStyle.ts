import { useCallback, useState } from 'react';
import { MAP_STYLES, getSavedMapStyle, saveMapStyle, type MapStyleId } from '../../lib/mapTiles';

export function useMapStyle() {
  const [styleId, setStyleIdState] = useState<MapStyleId>(getSavedMapStyle);
  const style = MAP_STYLES.find((s) => s.id === styleId) ?? MAP_STYLES[0];

  const setStyleId = useCallback((id: MapStyleId) => {
    setStyleIdState(id);
    saveMapStyle(id);
  }, []);

  return { style, styleId, setStyleId };
}
