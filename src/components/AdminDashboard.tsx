import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Trash2,
  Music,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
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
    resetActiveReservations,
    resetCompletedReservations,
    deleteReservation,
    deleteMultipleReservations,
  } = useReservations();

  const [notifications, setNotifications] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentReservations =
    activeTab === 'active' ? activeReservations : completedReservations;

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

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeTab]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === currentReservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentReservations.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const success = await deleteMultipleReservations(Array.from(selectedIds));
    if (success) {
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  const handleSingleDelete = async (id: string) => {
    await deleteReservation(id);
  };

  const handleResetCurrent = async () => {
    if (activeTab === 'active') {
      await resetActiveReservations();
    } else {
      await resetCompletedReservations();
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
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
              {!selectionMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectionMode(true)}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    disabled={currentReservations.length === 0}
                  >
                    <CheckSquare className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Seleziona</span>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        disabled={currentReservations.length === 0}
                      >
                        <Trash2 className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Reset</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-destructive">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-5 h-5" />
                          Reset {activeTab === 'active' ? 'In Corso' : 'Completate'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Sei sicuro di voler cancellare tutte le prenotazioni{' '}
                          {activeTab === 'active' ? 'in corso' : 'completate'}? Questa
                          azione non può essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">
                          Annulla
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetCurrent}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Conferma Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  >
                    {selectedIds.size === currentReservations.length ? (
                      <Square className="w-4 h-4 md:mr-2" />
                    ) : (
                      <CheckSquare className="w-4 h-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">
                      {selectedIds.size === currentReservations.length
                        ? 'Deseleziona'
                        : 'Seleziona tutto'}
                    </span>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        disabled={selectedIds.size === 0}
                      >
                        <Trash2 className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">
                          Elimina ({selectedIds.size})
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-destructive">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-5 h-5" />
                          Elimina Selezionate
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Sei sicuro di voler eliminare {selectedIds.size} prenotazioni
                          selezionate? Questa azione non può essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">
                          Annulla
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelected}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Conferma Eliminazione
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exitSelectionMode}
                    className="border-muted-foreground text-muted-foreground hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}

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
                  onDelete={handleSingleDelete}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(reservation.id)}
                  onSelect={handleSelect}
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
                  onDelete={handleSingleDelete}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(reservation.id)}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
