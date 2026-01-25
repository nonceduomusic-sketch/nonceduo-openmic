import React from 'react';
import { Calendar, Clock, Mic2, MessageCircle, Music } from 'lucide-react';
import { LiveEvent, EventType } from '@/hooks/useLiveEvent';
import { cn } from '@/lib/utils';

interface EventContextBannerProps {
  event: LiveEvent;
  className?: string;
  compact?: boolean;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  } catch {
    return '';
  }
};

const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '';
  try {
    // timeStr is in format "HH:MM:SS" or "HH:MM"
    return timeStr.slice(0, 5);
  } catch {
    return '';
  }
};

const EventTypeIcon: React.FC<{ type: EventType }> = ({ type }) => {
  switch (type) {
    case 'openmic':
      return <Mic2 className="w-4 h-4" />;
    case 'dediche':
      return <MessageCircle className="w-4 h-4" />;
    case 'both':
      return <Music className="w-4 h-4" />;
  }
};

const EventTypeLabel: React.FC<{ type: EventType }> = ({ type }) => {
  switch (type) {
    case 'openmic':
      return <span>Open Mic</span>;
    case 'dediche':
      return <span>Dediche</span>;
    case 'both':
      return <span>Open Mic + Dediche</span>;
  }
};

export const EventContextBanner: React.FC<EventContextBannerProps> = ({ 
  event, 
  className,
  compact = false 
}) => {
  const dateStr = formatDate(event.event_date);
  const startTime = formatTime(event.event_start_time);
  const endTime = formatTime(event.event_end_time);

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10",
        "border border-primary/20",
        className
      )}>
        <div className="flex items-center gap-1.5 text-primary">
          <EventTypeIcon type={event.event_type} />
          <span className="text-sm font-medium">{event.event_name}</span>
        </div>
        {dateStr && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Calendar className="w-3 h-3" />
            <span>{dateStr}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-4",
      "bg-gradient-to-br from-card via-card to-muted/30",
      "border border-primary/30",
      "shadow-lg shadow-primary/5",
      className
    )}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        {/* Event Type Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-3">
          <EventTypeIcon type={event.event_type} />
          <EventTypeLabel type={event.event_type} />
        </div>

        {/* Event Name */}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
          {event.event_name}
        </h2>

        {/* Date & Time */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {dateStr && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-secondary" />
              <span className="capitalize">{dateStr}</span>
            </div>
          )}
          {startTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-secondary" />
              <span>
                {startTime}
                {endTime && ` - ${endTime}`}
              </span>
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
          <span className="text-xs font-medium text-accent uppercase tracking-wide">Live</span>
        </div>
      </div>
    </div>
  );
};
