import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nonceduo.openmic',
  appName: 'NonceDuo OpenMic',
  webDir: 'dist',
  server: {
    // Hot reload from Lovable preview - comment this out for production build
    url: 'https://7d19d02b-b5ef-46b9-9b90-a42c481f8441.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    // Allow mixed content for WebRTC
    allowMixedContent: true,
    // Force cleartext traffic for development
    useLegacyBridge: false,
  },
  plugins: {
    // Screen capture plugin configuration
    ScreenCapture: {
      // MediaProjection settings
      notificationTitle: 'NonceDuo Screen Share',
      notificationText: 'Condivisione schermo attiva',
      notificationIcon: 'ic_stat_screen_share',
    },
  },
};

export default config;
