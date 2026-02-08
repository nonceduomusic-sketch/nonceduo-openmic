import { registerPlugin } from '@capacitor/core';

export interface ScreenCapturePlugin {
  /**
   * Check if screen capture is available on this platform
   */
  isAvailable(): Promise<{ available: boolean; platform: string }>;

  /**
   * Start screen capture - will prompt user for permission
   */
  startCapture(): Promise<{ success: boolean; message: string }>;

  /**
   * Stop screen capture
   */
  stopCapture(): Promise<{ success: boolean; message: string }>;

  /**
   * Check if currently capturing
   */
  isCapturing(): Promise<{ capturing: boolean }>;

  /**
   * Add listener for capture events
   */
  addListener(
    eventName: 'captureStarted' | 'captureStopped',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;
}

const ScreenCapture = registerPlugin<ScreenCapturePlugin>('ScreenCapture', {
  web: () => import('./web').then((m) => new m.ScreenCaptureWeb()),
});

export { ScreenCapture };
