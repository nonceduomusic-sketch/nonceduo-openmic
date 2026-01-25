import React, { useState, useEffect, useCallback } from "react";
import Messages from "@/pages/Messages";
import DedicheInfo from "@/pages/DedicheInfo";
import { PreEventPage } from "@/components/PreEventPage";
import { FormatPinGate } from "@/components/FormatPinGate";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { usePinSession } from "@/hooks/usePinSession";

/**
 * AppDediche - Entry point per Dediche
 * 
 * LOGICA RENDERING:
 * 1. Se esiste evento LIVE:
 *    - Se event_type = 'openmic' → mostra Info (Dediche non attivo per questo evento)
 *    - Se event_type = 'dediche' o 'both':
 *      - Se pin_required && !pinValidated → mostra PIN gate
 *      - Altrimenti → mostra LIVE
 * 2. Se esistono eventi READY → mostra PreEventPage
 * 3. Altrimenti → mostra Info
 */
const AppDediche: React.FC = () => {
  const { eventState, liveEvent, upcomingEvents, isDedicheVisible } = useLiveEvent();
  const { 
    hasValidSession, 
    loading: sessionLoading, 
    sessionInvalidated 
  } = usePinSession('dediche');
  const [pinValidated, setPinValidated] = useState(false);

  // Auto-validate if session is valid (persistent login)
  useEffect(() => {
    if (!sessionLoading && hasValidSession && !sessionInvalidated) {
      setPinValidated(true);
    }
  }, [sessionLoading, hasValidSession, sessionInvalidated]);

  // Reset pin validation if session is invalidated
  useEffect(() => {
    if (sessionInvalidated) {
      setPinValidated(false);
    }
  }, [sessionInvalidated]);

  // Handler for pin validation from FormatPinGate
  const handlePinValidated = useCallback(() => {
    setPinValidated(true);
  }, []);

  // Loading state
  if (eventState.type === 'loading' || sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // CASE 1: Evento LIVE esiste
  if (eventState.type === 'live') {
    // Se l'evento è solo "openmic", Dediche non è visibile
    if (!isDedicheVisible) {
      return <DedicheInfo />;
    }

    // Se PIN richiesto e non ancora validato
    if (liveEvent?.pin_required && !pinValidated) {
      return (
        <FormatPinGate
          format="dediche"
          formatDisplayName="Dediche"
          onPinValidated={handlePinValidated}
          backTo="/app"
          backLabel="Torna all'app"
        />
      );
    }

    // LIVE: mostra Dediche con contesto evento
    return <Messages appMode liveEvent={liveEvent} />;
  }

  // CASE 2: Eventi READY esistono → Pre-Event Page
  if (eventState.type === 'upcoming') {
    return <PreEventPage events={upcomingEvents} />;
  }

  // CASE 3: Nessun evento → Info page
  return <DedicheInfo />;
};

export default AppDediche;
