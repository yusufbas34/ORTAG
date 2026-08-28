import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yol.app',
  appName: 'YOL',
  webDir: 'dist',
  server: {
    // Points the native shell at the deployed backend so the app always
    // shows the live production site.
    url: 'https://yol.up.railway.app',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
