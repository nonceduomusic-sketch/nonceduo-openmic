/**
 * Haptic feedback utilities for iOS/Android-style tactile responses.
 * Uses the Vibration API where available.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 30, 10], // Short-pause-short
  warning: [25, 50, 25],
  error: [50, 100, 50, 100, 50],
  selection: 5,
};

/**
 * Trigger haptic feedback if supported by the device.
 * Fails silently on unsupported devices.
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    const pattern = HAPTIC_PATTERNS[style];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail if vibration is blocked
  }
}

/**
 * Play a subtle audio feedback (like Apple's keyboard click).
 * Uses Web Audio API for instant, low-latency playback.
 */
export function playClickSound(volume: number = 0.05): void {
  try {
    const AudioContextClass = window.AudioContext || 
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.03);
  } catch {
    // Silently fail
  }
}

/**
 * Combined haptic + audio feedback for important actions.
 */
export function feedbackAction(style: HapticStyle = 'medium'): void {
  triggerHaptic(style);
  
  // Only play sound for success/error states
  if (style === 'success' || style === 'error') {
    playClickSound(0.03);
  }
}
