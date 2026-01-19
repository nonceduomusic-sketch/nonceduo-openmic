import React, { useEffect, useState } from 'react';
import { X, Bell, Music } from 'lucide-react';
import { Reservation } from '@/hooks/useReservations';

interface NotificationPopupProps {
  reservation: Reservation;
  onClose: () => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  reservation,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-full max-w-sm transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="glass-card p-4 neon-border-pink border-2 animate-neon-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-display font-semibold text-primary">
              Nuova Prenotazione!
            </h4>
            <p className="text-sm text-foreground mt-1">
              <span className="font-medium">{reservation.customer_name}</span>{' '}
              ha prenotato:
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Music className="w-4 h-4 text-secondary" />
              <span className="text-foreground truncate">
                {reservation.song_title} – {reservation.song_artist}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
