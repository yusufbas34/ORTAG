import { apiClient } from './apiClient';

const SEEN_VERSION_KEY = 'yol_seen_app_version';

export interface AppVersionInfo {
  version: string;
  downloadUrl: string;
}

export async function fetchAppVersion(): Promise<AppVersionInfo> {
  return apiClient.get<AppVersionInfo>('/app-version');
}

export function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

export function markVersionSeen(version: string): void {
  try {
    localStorage.setItem(SEEN_VERSION_KEY, version);
  } catch {
    /* ignore */
  }
}
