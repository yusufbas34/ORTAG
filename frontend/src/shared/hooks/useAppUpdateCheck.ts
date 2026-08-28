import { useCallback, useEffect, useState } from 'react';
import { fetchAppVersion, getSeenVersion, markVersionSeen, type AppVersionInfo } from '../../lib/appVersion';

export function useAppUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);

  useEffect(() => {
    fetchAppVersion()
      .then((info) => {
        const seen = getSeenVersion();
        if (seen === null) {
          // First-ever visit: nothing to compare against, just record it.
          markVersionSeen(info.version);
          return;
        }
        if (seen !== info.version) setUpdateInfo(info);
      })
      .catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    if (updateInfo) markVersionSeen(updateInfo.version);
    setUpdateInfo(null);
  }, [updateInfo]);

  return { updateInfo, dismiss };
}
