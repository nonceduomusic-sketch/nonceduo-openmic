import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nonceduo.openmic',
  appName: 'NonceDuo OpenMic',
  webDir: 'dist',
  // Use local files instead of live preview (more stable, no black-screen issues)
  // Uncomment the server block below for hot-reload during development
  // server: {
  //   url: 'https://7d19d02b-b5ef-46b9-9b90-a42c481f8441.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  android: {
    allowMixedContent: true,
    useLegacyBridge: false,
  },
  plugins: {
    ScreenCapture: {
      notificationTitle: 'NonceDuo Screen Share',
      notificationText: 'Condivisione schermo attiva',
      notificationIcon: 'ic_stat_screen_share',
    },
  },
};

export default config;
