import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Heart, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'booking' | 'dedication' | 'join' | 'milestone';
  name: string;
  song?: string;
  message?: string;
}

interface LiveNotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

/**
 * LiveNotificationToast - Notifiche live in stile social
 * Mostra "Mario ha appena prenotato X" in tempo reale
 */
export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.slice(0, 3).map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    booking: Music,
    dedication: Heart,
    join: Users,
    milestone: Sparkles,
  };

  const colors = {
    booking: 'from-primary/20 to-primary/5 border-primary/30',
    dedication: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    join: 'from-secondary/20 to-secondary/5 border-secondary/30',
    milestone: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  };

  const iconColors = {
    booking: 'text-primary bg-primary/20',
    dedication: 'text-pink-500 bg-pink-500/20',
    join: 'text-secondary bg-secondary/20',
    milestone: 'text-amber-500 bg-amber-500/20',
  };

  const Icon = icons[notification.type];

  const getMessage = () => {
    switch (notification.type) {
      case 'booking':
        return (
          <>
            <span className="font-semibold">{notification.name}</span>
            {' ha prenotato '}
            <span className="text-primary font-medium">{notification.song}</span>
          </>
        );
      case 'dedication':
        return (
          <>
            <span className="font-semibold">{notification.name}</span>
            {' ha inviato una dedica '}
            <Heart className="inline w-3 h-3 text-primary" />
          </>
        );
      case 'join':
        return (
          <>
            <span className="font-semibold">{notification.name}</span>
            {' si è unito alla serata!'}
          </>
        );
      case 'milestone':
        return (
          <span className="font-semibold">{notification.message}</span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "pointer-events-auto backdrop-blur-md rounded-xl p-3 border shadow-lg",
        "bg-gradient-to-r",
        colors[notification.type]
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", iconColors[notification.type])}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-sm text-foreground flex-1 leading-snug">
          {getMessage()}
        </p>
      </div>
    </motion.div>
  );
};

export default LiveNotificationToast;
