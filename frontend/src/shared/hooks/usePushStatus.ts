import { useCallback, useEffect, useState } from 'react';
import { isPushSubscribed } from '../../lib/push';

export function usePushStatus() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    isPushSubscribed()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { enabled, refresh };
}
