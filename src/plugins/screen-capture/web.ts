import { WebPlugin } from '@capacitor/core';
import type { ScreenCapturePlugin } from './index';

export class ScreenCaptureWeb extends WebPlugin implements ScreenCapturePlugin {
  async isAvailable(): Promise<{ available: boolean; platform: string }> {
    // Check platform
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    
    // Web implementation - only available on desktop browsers
    const available = !isAndroid && !isIOS && !!navigator.mediaDevices?.getDisplayMedia;
    
    return { available, platform: 'web' };
  }

  async startCapture(): Promise<{ success: boolean; message: string }> {
    try {
      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Store stream for later use (would need state management in real implementation)
      (window as any).__screenCaptureStream = stream;

      // Handle track ended (user stopped sharing via browser UI)
      stream.getVideoTracks()[0].onended = () => {
        this.notifyListeners('captureStopped', {});
      };

      this.notifyListeners('captureStarted', {});
      
      return { success: true, message: 'Screen capture started' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to start screen capture' };
    }
  }

  async stopCapture(): Promise<{ success: boolean; message: string }> {
    const stream = (window as any).__screenCaptureStream as MediaStream | undefined;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      (window as any).__screenCaptureStream = null;
    }
    
    this.notifyListeners('captureStopped', {});
    
    return { success: true, message: 'Screen capture stopped' };
  }

  async isCapturing(): Promise<{ capturing: boolean }> {
    const stream = (window as any).__screenCaptureStream as MediaStream | undefined;
    const capturing = !!stream && stream.active;
    return { capturing };
  }
}
