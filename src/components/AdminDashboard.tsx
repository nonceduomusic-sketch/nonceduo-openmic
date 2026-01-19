import React, { useState, useEffect } from 'react';
import { LogOut, Trash2, Music, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { ReservationCard } from './ReservationCard';
import { NotificationPopup } from './NotificationPopup';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const AdminDashboard: React.FC = () => {
  const { currentUser, logout } = useAdmin();
  const {
    activeReservations,
    completedReservations,
    loading,
    completeReservation,
    reactivateReservation,
    resetAllReservations,
  } = useReservations();

  const [notifications, setNotifications] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    const handleNewReservation = (event: CustomEvent<Reservation>) => {
      setNotifications((prev) => [...prev, event.detail]);
    };

    window.addEventListener(
      'new-reservation',
      handleNewReservation as EventListener
    );

    return () => {
      window.removeEventListener(
        'new-reservation',
        handleNewReservation as EventListener
      );
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Notifications */}
      {notifications.map((notification) => (
        <NotificationPopup
          key={notification.id}
          reservation={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold neon-text-cyan">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">
                Ciao, {currentUser?.username}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Reset</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-destructive">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Reset Serata
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Sei sicuro di voler cancellare tutte le prenotazioni? Questa
                      azione non può essere annullata.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">
                      Annulla
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetAllReservations}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Conferma Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-muted-foreground text-muted-foreground hover:bg-muted"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Esci</span>
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'active'
                  ? 'bg-primary text-primary-foreground neon-glow-pink'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Music className="w-4 h-4 inline-block mr-2" />
              In Corso ({activeReservations.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'completed'
                  ? 'bg-secondary text-secondary-foreground neon-glow-cyan'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline-block mr-2" />
              Completate ({completedReservations.length})
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        {activeTab === 'active' ? (
          <div className="space-y-4">
            {activeReservations.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessuna prenotazione in corso
                </p>
              </div>
            ) : (
              activeReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onComplete={completeReservation}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {completedReservations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessuna prenotazione completata
                </p>
              </div>
            ) : (
              completedReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onReactivate={reactivateReservation}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
