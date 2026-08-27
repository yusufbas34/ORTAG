import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yol.app',
  appName: 'YOL',
  webDir: 'dist',
  server: {
    // Points the native shell at the deployed backend so the app always
    // shows the live production site — swap this to your real domain once
    // you have one, or remove `server` entirely to bundle the built
    // frontend inside the app instead of loading it over the network.
    url: 'https://your-railway-app.up.railway.app',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
