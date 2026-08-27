import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiClient } from './apiClient';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushEnableResult = 'subscribed' | 'unsupported' | 'denied' | 'unavailable';

// Inside the Capacitor-wrapped native app, real FCM/APNs push replaces Web
// Push entirely — it keeps working even when the app is force-quit, which
// browser-based Web Push cannot guarantee (especially on iOS).
async function enableNativePush(): Promise<PushEnableResult> {
  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }
  if (permStatus.receive !== 'granted') return 'denied';

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      apiClient
        .post('/push/register-native', { platform: Capacitor.getPlatform(), token: token.value })
        .then(() => resolve('subscribed'))
        .catch(() => resolve('unavailable'));
    });
    PushNotifications.addListener('registrationError', () => resolve('unavailable'));
    PushNotifications.register();
  });
}

// Subscribes the current browser to Web Push and registers it with the
// backend. Safe to call repeatedly — an existing subscription is reused
// rather than duplicated.
async function enableWebPush(): Promise<PushEnableResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const { publicKey } = await apiClient.get<{ publicKey: string | null }>('/push/public-key');
  if (!publicKey) return 'unavailable';

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  await apiClient.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
  return 'subscribed';
}

export function enablePushNotifications(): Promise<PushEnableResult> {
  return Capacitor.isNativePlatform() ? enableNativePush() : enableWebPush();
}

export async function isPushSubscribed(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const status = await PushNotifications.checkPermissions();
    return status.receive === 'granted';
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
}
