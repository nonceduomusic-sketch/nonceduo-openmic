import React from 'react';
import { useConsecutiveUnlockNotification } from '@/hooks/useConsecutiveUnlockNotification';

/**
 * Mounted at page-level so the user can receive the "sbloccato" toast
 * even after closing the booking modal.
 */
export const ConsecutiveUnlockListener: React.FC = () => {
  useConsecutiveUnlockNotification('active');
  return null;
};
