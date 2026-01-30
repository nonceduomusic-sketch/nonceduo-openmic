import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ListMusic, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  Music,
  Heart,
  RefreshCw,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const AdminLiveQueueTab: React.FC = () => {
  const { activeReservations, loading, refetch } = useReservations();
  const [reordering, setReordering] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [hasManualChanges, setHasManualChanges] = useState(false);

  // Initialize local order when reservations change (and not during manual reorder)
  useEffect(() => {
    if (!hasManualChanges) {
      const newOrder = activeReservations.map(r => r.id);
      setLocalOrder(newOrder);
    }
  }, [activeReservations, hasManualChanges]);

  // Get ordered reservations based on local order
  const orderedReservations = useMemo(() => {
    if (localOrder.length === 0) return activeReservations;
    
    const orderMap = new Map(localOrder.map((id, index) => [id, index]));
    return [...activeReservations].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Infinity;
      const orderB = orderMap.get(b.id) ?? Infinity;
      return orderA - orderB;
    });
  }, [activeReservations, localOrder]);

  // Check if order has changed from original
  const hasChanges = useMemo(() => {
    if (localOrder.length === 0) return false;
    const originalOrder = activeReservations.map(r => r.id);
    if (originalOrder.length !== localOrder.length) return false;
    return JSON.stringify(originalOrder) !== JSON.stringify(localOrder);
  }, [activeReservations, localOrder]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedReservations.length) return;
    
    // Get current order based on orderedReservations (visual order)
    const currentIds = orderedReservations.map(r => r.id);
    const newOrder = [...currentIds];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    setLocalOrder(newOrder);
    setHasManualChanges(true);
  }, [orderedReservations]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setIsDragging(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId === targetId) {
      setIsDragging(null);
      return;
    }

    const currentIds = orderedReservations.map(r => r.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex = currentIds.indexOf(targetId);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      const newOrder = [...currentIds];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      setLocalOrder(newOrder);
      setHasManualChanges(true);
    }
    
    setIsDragging(null);
  };

  const handleDragEnd = () => {
    setIsDragging(null);
  };

  const saveOrder = async () => {
    setReordering(true);
    try {
      // Update the created_at timestamps to reflect new order
      // We'll use a small increment to maintain order
      const baseTime = new Date();
      
      for (let i = 0; i < localOrder.length; i++) {
        const reservationId = localOrder[i];
        const newTime = new Date(baseTime.getTime() + (i * 1000)); // 1 second apart
        
        const { error } = await supabase
          .from('reservations')
          .update({ created_at: newTime.toISOString() })
          .eq('id', reservationId);
          
        if (error) {
          console.error('Error updating order:', error);
          throw error;
        }
      }
      
      toast.success('Ordine scaletta salvato!');
      setHasManualChanges(false);
      await refetch();
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Errore nel salvare l\'ordine');
    } finally {
      setReordering(false);
    }
  };

  const cancelChanges = useCallback(() => {
    setLocalOrder(activeReservations.map(r => r.id));
    setHasManualChanges(false);
  }, [activeReservations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListMusic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Scaletta Live</CardTitle>
                <CardDescription className="text-xs">
                  {orderedReservations.length} {orderedReservations.length === 1 ? 'canzone' : 'canzoni'} in coda
                </CardDescription>
              </div>
            </div>
            
            {hasChanges && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={cancelChanges} 
                  variant="outline"
                  size="sm"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={saveOrder} 
                  disabled={reordering}
                  className="neon-button-pink"
                  size="sm"
                >
                  {reordering ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Salva Ordine
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Trascina le canzoni per riordinare la scaletta, oppure usa le frecce. 
            Clicca "Salva Ordine" per confermare le modifiche.
          </p>
        </CardContent>
      </Card>

      {/* Queue List */}
      {orderedReservations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Nessuna canzone in coda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le prenotazioni appariranno qui quando gli utenti le effettueranno
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orderedReservations.map((reservation, index) => {
            const isDedica = reservation.dedication_message && reservation.dedication_message.trim() !== '';
            const isBeingDragged = isDragging === reservation.id;
            
            return (
              <div
                key={reservation.id}
                draggable
                onDragStart={(e) => handleDragStart(e, reservation.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, reservation.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-grab active:cursor-grabbing",
                  isBeingDragged && "opacity-50 border-primary scale-[0.98]",
                  isDedica && "border-l-4 border-l-pink-500"
                )}
              >
                {/* Drag Handle */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="w-5 h-5" />
                  <span className="w-6 text-center font-mono text-sm font-bold">
                    {index + 1}
                  </span>
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate text-sm">
                      {reservation.song_title}
                    </p>
                    {isDedica && (
                      <Heart className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {reservation.song_artist}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs h-5">
                      <User className="w-3 h-3 mr-1" />
                      {reservation.customer_name}
                    </Badge>
                  </div>
                  {/* Dedication message - full text */}
                  {isDedica && (
                    <div className="mt-2 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                      <p className="text-xs text-pink-300 italic whitespace-pre-wrap break-words">
                        "{reservation.dedication_message}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Move Buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === orderedReservations.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      {orderedReservations.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Le canzoni con il bordo rosa sono dediche
        </p>
      )}
    </div>
  );
};
