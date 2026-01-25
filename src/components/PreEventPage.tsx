import React from 'react';
import { Calendar, Clock, Mic2, MessageCircle, Music, Sparkles, ArrowRight, Bell, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UpcomingEvent, EventType } from '@/hooks/useLiveEvent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { SiteHeader } from '@/components/site/SiteHeader';
import { cn } from '@/lib/utils';

interface PreEventPageProps {
  events: UpcomingEvent[];
  showBackButton?: boolean;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Data da definire';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  } catch {
    return 'Data da definire';
  }
};

const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
};

const EventTypeIcon: React.FC<{ type: EventType; className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'openmic':
      return <Mic2 className={cn("w-5 h-5", className)} />;
    case 'dediche':
      return <MessageCircle className={cn("w-5 h-5", className)} />;
    case 'both':
      return <Music className={cn("w-5 h-5", className)} />;
  }
};

const EventTypeEmoji: React.FC<{ type: EventType }> = ({ type }) => {
  switch (type) {
    case 'openmic':
      return <span className="text-2xl">🎤</span>;
    case 'dediche':
      return <span className="text-2xl">💌</span>;
    case 'both':
      return <span className="text-2xl">🎵</span>;
  }
};

const EventTypeLabel: React.FC<{ type: EventType }> = ({ type }) => {
  switch (type) {
    case 'openmic':
      return <>Open Mic</>;
    case 'dediche':
      return <>Dediche</>;
    case 'both':
      return <>Open Mic + Dediche</>;
  }
};

const EventTypeDescription: React.FC<{ type: EventType }> = ({ type }) => {
  switch (type) {
    case 'openmic':
      return <>Sali sul palco e canta le tue canzoni preferite!</>;
    case 'dediche':
      return <>Invia dediche speciali ai tuoi amici e alla tua dolce metà.</>;
    case 'both':
      return <>Karaoke e dediche musicali per una serata indimenticabile!</>;
  }
};

const getEventTypeColors = (type: EventType) => {
  switch (type) {
    case 'openmic':
      return {
        bg: 'bg-secondary/5',
        bgHover: 'hover:bg-secondary/10',
        border: 'border-secondary/20',
        borderHover: 'hover:border-secondary/40',
        icon: 'text-secondary',
        badge: 'bg-secondary/15 text-secondary border-secondary/30',
        gradient: 'from-secondary/20 via-secondary/5 to-transparent',
        ring: 'ring-secondary/30',
      };
    case 'dediche':
      return {
        bg: 'bg-primary/5',
        bgHover: 'hover:bg-primary/10',
        border: 'border-primary/20',
        borderHover: 'hover:border-primary/40',
        icon: 'text-primary',
        badge: 'bg-primary/15 text-primary border-primary/30',
        gradient: 'from-primary/20 via-primary/5 to-transparent',
        ring: 'ring-primary/30',
      };
    case 'both':
      return {
        bg: 'bg-gradient-to-br from-primary/5 to-secondary/5',
        bgHover: 'hover:from-primary/10 hover:to-secondary/10',
        border: 'border-accent/20',
        borderHover: 'hover:border-accent/40',
        icon: 'text-accent',
        badge: 'bg-accent/15 text-accent border-accent/30',
        gradient: 'from-accent/20 via-accent/5 to-transparent',
        ring: 'ring-accent/30',
      };
  }
};

const UpcomingEventCard: React.FC<{ event: UpcomingEvent; index: number }> = ({ event, index }) => {
  const colors = getEventTypeColors(event.event_type);
  const dateStr = formatDate(event.event_date);
  const timeStr = formatTime(event.event_start_time);
  const isNext = index === 0;

  // Link destination based on event type
  const eventLink = event.event_type === 'openmic' 
    ? '/openmic' 
    : event.event_type === 'dediche' 
      ? '/messaggi' 
      : '/';

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 group",
      colors.bg,
      colors.bgHover,
      colors.border,
      colors.borderHover,
      isNext && "ring-2",
      isNext && colors.ring,
      isNext && "shadow-xl"
    )}>
      {/* Gradient overlay */}
      <div className={cn(
        "absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl opacity-50 rounded-full -translate-y-1/2 translate-x-1/4",
        colors.gradient
      )} />

      <CardContent className="relative p-5">
        {/* Top row: Badge + Next indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
            colors.badge
          )}>
            <EventTypeEmoji type={event.event_type} />
            <EventTypeLabel type={event.event_type} />
          </div>
          {isNext && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/30 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Prossimo
            </span>
          )}
        </div>

        {/* Event name */}
        <h3 className="font-display text-xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">
          {event.event_name}
        </h3>

        {/* Event description */}
        <p className="text-sm text-muted-foreground mb-4">
          <EventTypeDescription type={event.event_type} />
        </p>

        {/* Date & Time row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
          <div className="flex items-center gap-2 bg-muted/50 px-2.5 py-1.5 rounded-lg">
            <Calendar className={cn("w-4 h-4", colors.icon)} />
            <span className="capitalize font-medium">{dateStr}</span>
          </div>
          {timeStr && (
            <div className="flex items-center gap-2 bg-muted/50 px-2.5 py-1.5 rounded-lg">
              <Clock className={cn("w-4 h-4", colors.icon)} />
              <span className="font-medium">{timeStr}</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Link to={eventLink}>
          <Button 
            variant="outline" 
            className={cn(
              "w-full group/btn transition-all",
              colors.border,
              colors.borderHover
            )}
          >
            <span>Scopri di più</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const NoEventsState: React.FC = () => (
  <div className="text-center py-16 px-4">
    {/* Animated icon container */}
    <div className="relative inline-flex items-center justify-center mb-8">
      {/* Outer glow rings */}
      <div className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-ping opacity-30" />
      <div className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 animate-pulse" />
      
      {/* Icon container */}
      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/10">
        <Music className="w-12 h-12 text-primary" />
      </div>
      
      {/* Floating badges */}
      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center animate-bounce border border-secondary/30">
        <Mic2 className="w-4 h-4 text-secondary" />
      </div>
      <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-bounce border border-primary/30" style={{ animationDelay: '0.3s' }}>
        <MessageCircle className="w-4 h-4 text-primary" />
      </div>
    </div>

    <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground mb-4">
      Stiamo preparando qualcosa di speciale!
    </h2>
    <p className="text-muted-foreground max-w-md mx-auto mb-8 text-base">
      Non ci sono eventi programmati al momento, ma stiamo lavorando per offrirti 
      un'esperienza musicale indimenticabile. Resta sintonizzato!
    </p>

    {/* Action buttons */}
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
      <Link to="/">
        <Button variant="default" className="min-w-[160px] gap-2">
          <Sparkles className="w-4 h-4" />
          Scopri chi siamo
        </Button>
      </Link>
      <Link to="/openmic">
        <Button variant="outline" className="min-w-[160px] gap-2">
          <Mic2 className="w-4 h-4" />
          Cos'è Open Mic
        </Button>
      </Link>
    </div>

    {/* Social proof */}
    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span>500+ partecipanti</span>
      </div>
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-secondary" />
        <span>1000+ canzoni</span>
      </div>
    </div>
  </div>
);

export const PreEventPage: React.FC<PreEventPageProps> = ({ 
  events, 
  showBackButton = true 
}) => {
  const hasEvents = events.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Prossimi Eventi | Non C'è Duo"
        description="Scopri i prossimi eventi live di Non C'è Duo. Karaoke, dediche e tanto divertimento!"
      />

      <SiteHeader />

      <main className="container py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {hasEvents ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Bell className="w-4 h-4" />
                  <span>Eventi in arrivo</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-black neon-text-pink mb-3">
                  Prossimi Eventi
                </h1>
                <p className="text-muted-foreground">
                  Ecco cosa abbiamo in programma per te
                </p>
              </div>

              {/* Events list */}
              <div className="space-y-5">
                {events.map((event, index) => (
                  <UpcomingEventCard 
                    key={event.id} 
                    event={event} 
                    index={index} 
                  />
                ))}
              </div>

              {/* Info note */}
              <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Gli eventi verranno attivati poco prima dell'inizio. Torna a trovarci!
                </p>
              </div>
            </>
          ) : (
            <NoEventsState />
          )}

          {/* Back button */}
          {showBackButton && (
            <div className="mt-8 text-center">
              <Link to="/">
                <Button variant="ghost" className="text-muted-foreground gap-2">
                  ← Torna alla home
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PreEventPage;