import webpush from 'web-push';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { prisma } from './prismaClient.js';

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails('mailto:destek@yol.app', publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

let firebaseApp: App | null | undefined;

// Lazily initialized so a missing/invalid credential doesn't crash the
// server — it just disables native push the same way missing VAPID keys
// disable web push, both falling back to a console log.
function getFirebaseApp(): App | null {
  if (firebaseApp !== undefined) return firebaseApp;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    firebaseApp = null;
    return firebaseApp;
  }

  try {
    const serviceAccount = JSON.parse(json);
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    console.error('[push] invalid FIREBASE_SERVICE_ACCOUNT_JSON', err);
    firebaseApp = null;
  }
  return firebaseApp;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendWebPush(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureVapidConfigured()) {
    console.log(`[push:dev:web] -> ${userId}: ${payload.title} — ${payload.body}`);
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404/410 mean the browser subscription is gone for good — clean it up
        // so we stop wasting a request on it every time.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('[push] web sendNotification failed', statusCode ?? err);
        }
      }
    }),
  );
}

// Real FCM push for the Capacitor-wrapped native app — unlike browser Web
// Push, this keeps working even when the app has been force-quit.
async function sendNativePush(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await prisma.nativePushToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;

  const app = getFirebaseApp();
  if (!app) {
    console.log(`[push:dev:native] -> ${userId}: ${payload.title} — ${payload.body}`);
    return;
  }

  const messaging = getMessaging(app);
  await Promise.all(
    tokens.map(async (t) => {
      try {
        await messaging.send({
          token: t.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.url ? { url: payload.url } : undefined,
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        // The device uninstalled the app or the token otherwise expired —
        // clean it up so we stop wasting a request on it every time.
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          await prisma.nativePushToken.delete({ where: { id: t.id } }).catch(() => {});
        } else {
          console.error('[push] native send failed', code ?? err);
        }
      }
    }),
  );
}

// Best-effort push across every channel a user has registered — browser Web
// Push and the native app's FCM/APNs token, whichever exist. Either channel
// missing its own configuration (VAPID/Firebase) falls back to a console
// log rather than failing, so local dev never has to set these up.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  await Promise.all([sendWebPush(userId, payload), sendNativePush(userId, payload)]);
}
