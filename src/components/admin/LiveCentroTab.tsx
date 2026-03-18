import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Music,
  Heart,
  Check,
  Trash2,
  Bell,
  TrendingUp,
  Loader2,
  Clock,
  ChevronRight,
  Maximize2,
  Flame,
  ThumbsUp,
  Bot,
  Play,
  Square,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LyricsDialog } from '@/components/LyricsDialog';
import { toast } from 'sonner';
import type { AdminMainTab } from '@/components/admin/AdminSidebar';
import { triggerHaptic } from '@/lib/haptics';
import { useAdminFontSize } from '@/hooks/useAdminFontSize';
import { FontSizeControl } from '@/components/admin/FontSizeControl';
import { DedicationExpandDialog } from '@/components/admin/DedicationExpandDialog';
import { useAllVoteCounts } from '@/hooks/useAllVoteCounts';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { useSongs } from '@/hooks/useSongs';

interface LiveCentroTabProps {
  onNavigate?: (tab: AdminMainTab, subTab?: string) => void;
  access?: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
  };
  assistantUnreadCount?: number;
}

type FilterTab = 'all' | 'songs' | 'dediche' | 'queue';

interface UnifiedItem {
  id: string;
  type: 'song' | 'dedica';
  name: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  isNew: boolean;
  hasDedication?: boolean;
  dedicationText?: string;
  status: 'pending' | 'completed';
  originalData: Reservation | Conversation;
}

export const LiveCentroTab: React.FC<LiveCentroTabProps> = ({
  onNavigate,
  access = { openmic: true, dediche: true, community: true },
  assistantUnreadCount = 0,
}) => {
  const {
    activeReservations,
    completedReservations,
    loading: reservationsLoading,
    completeReservation,
    reactivateReservation,
    deleteReservation,
  } = useReservations();

  const { conversations, loading: conversationsLoading } = useConversations();
  const { getVotesForReservation } = useAllVoteCounts();
  const { broadcastSong, stopBroadcast, session } = useHybridBroadcast('main');
  const currentBroadcastSongId = session?.current_song_id || null;
  // Filter state - default to 'queue' so completed items are hidden by default
  const [activeFilter, setActiveFilter] = useState<FilterTab>('queue');
  const [showCompleted, setShowCompleted] = useState(false);

  // Swipe state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const swipeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Lyrics dialog
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ title: string; artist: string } | null>(null);

  // Font size
  const { fontSize, setFontSize, fontSizeClass } = useAdminFontSize();

  // Dedication expand dialog
  const [dedicationDialogOpen, setDedicationDialogOpen] = useState(false);
  const [selectedDedication, setSelectedDedication] = useState<{
    text: string;
    senderName: string;
    songTitle?: string;
    songArtist?: string;
  } | null>(null);

  // Seen items tracking (localStorage)
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('admin-seen-items');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  // Mark item as seen after 3 seconds of being visible
  const markAsSeen = useCallback((id: string) => {
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('admin-seen-items', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Clean up seen items cache when reservations list becomes empty (after reset)
  useEffect(() => {
    if (activeReservations.length === 0 && completedReservations.length === 0 && seenIds.size > 0) {
      // All reservations cleared (likely after reset), clear the seen cache
      const songSeenIds = [...seenIds].filter(id => id.startsWith('song-'));
      if (songSeenIds.length > 0) {
        setSeenIds(prev => {
          const next = new Set([...prev].filter(id => !id.startsWith('song-')));
          localStorage.setItem('admin-seen-items', JSON.stringify([...next]));
          return next;
        });
      }
    }
  }, [activeReservations.length, completedReservations.length, seenIds]);

  // Build unified items list
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Add reservations (songs)
    if (access.openmic) {
      const reservationsToShow = showCompleted ? completedReservations : activeReservations;
      reservationsToShow.forEach(r => {
        items.push({
          id: `song-${r.id}`,
          type: 'song',
          name: r.customer_name,
          title: r.song_title,
          subtitle: r.song_artist,
          timestamp: new Date(r.created_at),
          isNew: !seenIds.has(`song-${r.id}`),
          hasDedication: Boolean(r.dedication_message?.trim()),
          dedicationText: r.dedication_message || undefined,
          status: r.status === 'completed' ? 'completed' : 'pending',
          originalData: r,
        });
      });
    }

    // Add unread dediche conversations
    if (access.dediche && !showCompleted) {
      const dedicheConvs = conversations.filter(
        c => c.section === 'dediche' && !c.is_group && !c.is_read
      );
      dedicheConvs.forEach(c => {
        // Get most recent message
        const lastMsg = c.messages?.[c.messages.length - 1];
        // For private dediche, get sender name from participants or last message
        const senderName = c.participants?.[0]?.participant_name 
          || lastMsg?.sender_name 
          || 'Utente';
        items.push({
          id: `dedica-${c.id}`,
          type: 'dedica',
          name: senderName,
          title: lastMsg?.message_text?.slice(0, 50) || 'Nuova dedica',
          subtitle: `Messaggio privato`,
          timestamp: new Date(c.updated_at || c.created_at),
          isNew: !seenIds.has(`dedica-${c.id}`),
          status: 'pending',
          originalData: c,
        });
      });
    }

    // Sort by timestamp (oldest first - chronological order like Open Mic page)
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [access, activeReservations, completedReservations, conversations, seenIds, showCompleted]);

  // Apply filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return unifiedItems;
    if (activeFilter === 'songs') return unifiedItems.filter(i => i.type === 'song');
    if (activeFilter === 'dediche') return unifiedItems.filter(i => i.type === 'dedica');
    if (activeFilter === 'queue') return unifiedItems.filter(i => i.type === 'song' && i.status === 'pending');
    return unifiedItems;
  }, [unifiedItems, activeFilter]);

  // Counts
  const songCount = unifiedItems.filter(i => i.type === 'song').length;
  const dedicheCount = unifiedItems.filter(i => i.type === 'dedica').length;
  const newCount = unifiedItems.filter(i => i.isNew).length;
  const completedToday = completedReservations.filter(r => {
    const today = new Date();
    const completedDate = r.completed_at ? new Date(r.completed_at) : new Date(r.created_at);
    return completedDate.toDateString() === today.toDateString();
  }).length;

  // Handle touch swipe
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = touchStartX.current - touchCurrentX;
    const diffY = Math.abs(touchStartY.current - touchCurrentY);

    // Only swipe if horizontal movement is greater than vertical
    if (diffX > 50 && diffX > diffY) {
      setSwipedId(id);
    } else if (diffX < -30) {
      setSwipedId(null);
    }
  };

  const handleTouchEnd = () => {
    // Keep swiped state for action
  };

  // Broadcast action (toggle: same song → stop, different song → switch)
  const handleBroadcastItem = async (item: UnifiedItem) => {
    if (item.type !== 'song') return;
    const reservation = item.originalData as Reservation;
    const songDb = allSongsDb.find(
      s => s.titolo === reservation.song_title && s.artista === reservation.song_artist
    );
    if (!songDb) {
      toast.error('Canzone non trovata nel catalogo');
      return;
    }
    // If this song is already broadcasting → stop
    if (currentBroadcastSongId === songDb.id) {
      await stopBroadcast();
      toast.success('Trasmissione interrotta');
    } else {
      const success = await broadcastSong(songDb.id, reservation.id);
      if (success) {
        toast.success('Trasmissione avviata!');
      }
    }
  };

  // Actions
  const handleComplete = async (item: UnifiedItem) => {
    if (item.type === 'song') {
      triggerHaptic('success');
      const success = await completeReservation((item.originalData as Reservation).id);
      if (success) {
        markAsSeen(item.id);
        setSwipedId(null);
        toast.success('Canzone completata!');
      }
    }
  };

  const handleDelete = async (item: UnifiedItem) => {
    if (item.type === 'song') {
      triggerHaptic('warning');
      const success = await deleteReservation((item.originalData as Reservation).id);
      if (success) {
        setSwipedId(null);
        toast.success('Rimossa');
      }
    }
  };

  const handleItemClick = (item: UnifiedItem) => {
    if (swipedId === item.id) {
      setSwipedId(null);
      return;
    }
    
    markAsSeen(item.id);

    if (item.type === 'song') {
      setSelectedSong({ title: item.title, artist: item.subtitle });
      setLyricsOpen(true);
    } else if (item.type === 'dedica') {
      onNavigate?.('dediche');
    }
  };

  // Reset swipe on outside click
  useEffect(() => {
    const handleClickOutside = () => setSwipedId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loading = reservationsLoading || conversationsLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ========== STICKY HEADER ========== */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-2xl border-b border-border/30 px-3 py-3 space-y-3">
        {/* Title + Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Title with live indicator */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-5 h-5 text-primary" />
                {newCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                )}
              </div>
              <h1 className="font-display text-lg font-bold text-foreground">Centro</h1>
            </div>

            {/* Compact stats */}
            <div className="flex items-center gap-2">
              {/* Queue counter */}
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
                filteredItems.length > 0 
                  ? "bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30"
                  : "bg-muted/50 border border-border/50"
              )}>
                <span className="text-xl font-bold text-foreground">
                  {filteredItems.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {showCompleted ? 'fatte' : 'in coda'}
                </span>
              </div>

              {/* Completed today - mini stat */}
              {completedToday > 0 && !showCompleted && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {completedToday}
                  </span>
                </div>
              )}

              {/* New badge */}
              {newCount > 0 && !showCompleted && (
                <Badge 
                  variant="destructive" 
                  className="h-6 px-2 text-xs font-semibold animate-pulse"
                >
                  +{newCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Controls: Font size + Toggle completed */}
          <div className="flex items-center gap-2">
            <FontSizeControl 
              fontSize={fontSize} 
              onFontSizeChange={setFontSize} 
            />
            <Button
              variant={showCompleted ? "secondary" : "outline"}
              size="sm"
              className="h-8 px-2.5 rounded-lg text-xs"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <Check className={cn("w-4 h-4", showCompleted && "text-emerald-500")} />
              <span className="ml-1 hidden sm:inline">{showCompleted ? 'Fatte' : 'Vedi fatte'}</span>
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { key: 'queue' as const, label: 'In coda', count: unifiedItems.filter(i => i.status === 'pending').length },
            { key: 'songs' as const, label: 'Canzoni', count: songCount, icon: Music },
            { key: 'dediche' as const, label: 'Dediche', count: dedicheCount, icon: Heart },
            { key: 'all' as const, label: 'Tutte', count: unifiedItems.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold",
                  activeFilter === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ========== ASSISTENTE QUICK CARD ========== */}
      {assistantUnreadCount > 0 && (
        <button
          onClick={() => onNavigate?.('assistant')}
          className="mx-2 mb-2 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-3 w-[calc(100%-1rem)] text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Assistente</span>
              <Badge variant="destructive" className="h-5 px-1.5 text-xs animate-pulse">
                {assistantUnreadCount}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {assistantUnreadCount === 1 ? 'Nuova richiesta da gestire' : `${assistantUnreadCount} nuove richieste da gestire`}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      {/* ========== ITEMS LIST ========== */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
              {showCompleted ? (
                <Check className="w-10 h-10 text-muted-foreground" />
              ) : (
                <Music className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {showCompleted ? 'Nessuna completata' : 'Nessuna richiesta'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {showCompleted 
                ? 'Le canzoni completate appariranno qui'
                : 'Le richieste dei clienti appariranno qui in tempo reale'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-xl"
                onTouchStart={(e) => handleTouchStart(e, item.id)}
                onTouchMove={(e) => handleTouchMove(e, item.id)}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(item);
                }}
              >
                {/* Swipe actions background */}
                <div className={cn(
                  "absolute inset-y-0 right-0 flex items-stretch transition-all duration-200",
                  swipedId === item.id ? "w-[140px]" : "w-0"
                )}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete(item);
                    }}
                    className="flex-1 flex items-center justify-center bg-emerald-500 text-white"
                  >
                    <Check className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="flex-1 flex items-center justify-center bg-destructive text-destructive-foreground"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>

                {/* Main card content */}
                <div
                  className={cn(
                    "relative flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl transition-all duration-200",
                    "min-h-[88px]", // Touch-friendly height
                    item.isNew && !showCompleted && "bg-gradient-to-r from-primary/5 to-transparent border-primary/30",
                    item.status === 'completed' && "opacity-60",
                    swipedId === item.id && "transform -translate-x-[140px]"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center",
                    item.type === 'song' 
                      ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" 
                      : "bg-gradient-to-br from-pink-500/20 to-rose-500/20"
                  )}>
                    {item.type === 'song' ? (
                      <Music className="w-7 h-7 text-amber-400" />
                    ) : (
                      <Heart className="w-7 h-7 text-pink-400 fill-pink-400/30" />
                    )}
                    
                    {/* New indicator */}
                    {item.isNew && !showCompleted && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name row */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("font-semibold text-foreground truncate", fontSizeClass === 'text-xs' ? 'text-sm' : fontSizeClass === 'text-base' ? 'text-lg' : 'text-base')}>
                          {item.name}
                        </span>
                        {item.hasDedication && item.type === 'song' && (
                          <Heart className="w-4 h-4 text-pink-400 fill-pink-400 flex-shrink-0" />
                        )}
                        {item.status === 'completed' && (
                          <Badge variant="secondary" className="text-xs h-5">
                            <Check className="w-3 h-3 mr-0.5" /> Fatta
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <p className={cn("font-medium text-foreground truncate leading-snug", fontSizeClass)}>
                        {item.title}
                      </p>

                      {/* Subtitle + time + votes */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-muted-foreground truncate", fontSizeClass === 'text-base' ? 'text-sm' : 'text-xs')}>
                          {item.subtitle}
                        </span>
                        <span className="text-xs text-muted-foreground/60 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(item.timestamp, { addSuffix: false, locale: it })}
                      </span>
                      
                      {/* Vote counts for songs */}
                      {item.type === 'song' && (() => {
                        const votes = getVotesForReservation((item.originalData as Reservation).id);
                        if (!votes || votes.total_votes === 0) return null;
                        const upVotes = votes.total_votes - votes.fire_votes - votes.heart_votes;
                        return (
                          <div className="flex items-center gap-1.5 ml-auto">
                            {upVotes > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-secondary font-semibold">
                                <ThumbsUp className="w-3 h-3" />
                                {upVotes}
                              </span>
                            )}
                            {votes.fire_votes > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                                <Flame className="w-3 h-3" />
                                {votes.fire_votes}
                              </span>
                            )}
                            {votes.heart_votes > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-pink-500">
                                <Heart className="w-3 h-3 fill-current" />
                                {votes.heart_votes}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Dedication preview for songs - clickable to expand */}
                    {item.hasDedication && item.dedicationText && item.type === 'song' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDedication({
                            text: item.dedicationText!,
                            senderName: item.name,
                            songTitle: item.title,
                            songArtist: item.subtitle,
                          });
                          setDedicationDialogOpen(true);
                        }}
                        className="mt-2 w-full text-left px-2 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary hover:from-primary/20 transition-colors group"
                      >
                        <div className="flex items-center gap-1">
                          <p className={cn(
                            "text-foreground/80 italic line-clamp-2 flex-1",
                            fontSizeClass
                          )}>
                            "{item.dedicationText}"
                          </p>
                          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Trasmetti button for songs / Arrow for dediche */}
                  {item.type === 'song' ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      {/* Testo / Accordi */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSong({ title: item.title, artist: item.subtitle });
                          setLyricsOpen(true);
                        }}
                        className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs border-secondary/40 text-secondary hover:bg-secondary hover:text-secondary-foreground"
                        title="Testo / Accordi"
                      >
                        <FileText className="w-3.5 h-3.5 sm:mr-1" />
                        <span className="hidden lg:inline">Testo</span>
                      </Button>

                      {/* Trasmetti */}
                      {item.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBroadcastItem(item);
                          }}
                          className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                          title="Trasmetti"
                        >
                          <Play className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden lg:inline">Trasmetti</span>
                        </Button>
                      )}

                      {/* Completa / Riattiva */}
                      {item.status === 'completed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            reactivateReservation((item.originalData as Reservation).id);
                            toast.success('Riattivata!');
                          }}
                          className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                          title="Riattiva"
                        >
                          <RotateCcw className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden lg:inline">Riattiva</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(item);
                          }}
                          className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white"
                          title="Completa"
                        >
                          <Check className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden lg:inline">Completa</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick hint for swipe */}
      {filteredItems.length > 0 && !showCompleted && (
        <div className="px-4 py-2 bg-muted/30 border-t border-border/20">
          <p className="text-xs text-muted-foreground text-center">
            ← Scorri a sinistra per completare o eliminare
          </p>
        </div>
      )}

      {/* Lyrics Dialog */}
      <LyricsDialog
        open={lyricsOpen}
        onOpenChange={setLyricsOpen}
        songTitle={selectedSong?.title || ''}
        songArtist={selectedSong?.artist || ''}
      />

      {/* Dedication Expand Dialog */}
      <DedicationExpandDialog
        open={dedicationDialogOpen}
        onOpenChange={setDedicationDialogOpen}
        dedicationText={selectedDedication?.text || ''}
        senderName={selectedDedication?.senderName || ''}
        songTitle={selectedDedication?.songTitle}
        songArtist={selectedDedication?.songArtist}
        fontSizeClass={fontSizeClass}
      />
    </div>
  );
};
