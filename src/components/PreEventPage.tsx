import React from 'react';
import { Calendar, Clock, Mic2, MessageCircle, Music, Sparkles } from 'lucide-react';
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

const getEventTypeColors = (type: EventType) => {
  switch (type) {
    case 'openmic':
      return {
        bg: 'bg-secondary/10',
        border: 'border-secondary/30',
        icon: 'text-secondary',
        badge: 'bg-secondary/20 text-secondary',
      };
    case 'dediche':
      return {
        bg: 'bg-primary/10',
        border: 'border-primary/30',
        icon: 'text-primary',
        badge: 'bg-primary/20 text-primary',
      };
    case 'both':
      return {
        bg: 'bg-gradient-to-br from-primary/10 to-secondary/10',
        border: 'border-accent/30',
        icon: 'text-accent',
        badge: 'bg-accent/20 text-accent',
      };
  }
};

const UpcomingEventCard: React.FC<{ event: UpcomingEvent; index: number }> = ({ event, index }) => {
  const colors = getEventTypeColors(event.event_type);
  const dateStr = formatDate(event.event_date);
  const timeStr = formatTime(event.event_start_time);
  const isNext = index === 0;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      colors.bg,
      colors.border,
      isNext && "ring-2 ring-primary/50 shadow-lg shadow-primary/10"
    )}>
      <CardContent className="p-5">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            colors.badge
          )}>
            <EventTypeIcon type={event.event_type} className="w-3.5 h-3.5" />
            <EventTypeLabel type={event.event_type} />
          </div>
          {isNext && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              Prossimo
            </span>
          )}
        </div>

        {/* Event name */}
        <h3 className="font-display text-lg font-bold text-foreground mb-2">
          {event.event_name}
        </h3>

        {/* Date & Time */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className={cn("w-4 h-4", colors.icon)} />
            <span className="capitalize">{dateStr}</span>
          </div>
          {timeStr && (
            <div className="flex items-center gap-1.5">
              <Clock className={cn("w-4 h-4", colors.icon)} />
              <span>{timeStr}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const NoEventsState: React.FC = () => (
  <div className="text-center py-16 px-4">
    <div className="relative inline-block mb-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <Music className="w-10 h-10 text-primary animate-pulse" />
      </div>
      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-secondary/30 flex items-center justify-center">
        <Sparkles className="w-3 h-3 text-secondary" />
      </div>
    </div>
    <h2 className="font-display text-2xl font-bold text-foreground mb-3">
      Stiamo preparando la prossima serata
    </h2>
    <p className="text-muted-foreground max-w-md mx-auto mb-6">
      Non ci sono eventi programmati al momento, ma stiamo lavorando per offrirti 
      un'esperienza indimenticabile. Resta sintonizzato!
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Link to="/">
        <Button variant="outline" className="min-w-[140px]">
          Scopri di più
        </Button>
      </Link>
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
                <h1 className="font-display text-3xl sm:text-4xl font-black neon-text-pink mb-3">
                  Prossimi Eventi
                </h1>
                <p className="text-muted-foreground">
                  Ecco cosa abbiamo in programma per te
                </p>
              </div>

              {/* Events list */}
              <div className="space-y-4">
                {events.map((event, index) => (
                  <UpcomingEventCard 
                    key={event.id} 
                    event={event} 
                    index={index} 
                  />
                ))}
              </div>

              {/* Info note */}
              <p className="text-center text-sm text-muted-foreground mt-8">
                Gli eventi verranno attivati poco prima dell'inizio. 
                <br className="sm:hidden" />
                Torna a trovarci!
              </p>
            </>
          ) : (
            <NoEventsState />
          )}

          {/* Back button */}
          {showBackButton && (
            <div className="mt-8 text-center">
              <Link to="/">
                <Button variant="ghost" className="text-muted-foreground">
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
