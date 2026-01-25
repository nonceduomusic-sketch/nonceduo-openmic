import React, { useState, useEffect, useCallback } from "react";
import OpenMic from "@/pages/OpenMic";
import OpenMicInfo from "@/pages/OpenMicInfo";
import { PreEventPage } from "@/components/PreEventPage";
import { FormatPinGate } from "@/components/FormatPinGate";
import { FreeModeOpenMic } from "@/components/FreeModeOpenMic";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { usePinSession } from "@/hooks/usePinSession";

/**
 * AppOpenMic - Entry point per Open Mic
 * 
 * LOGICA RENDERING:
 * 1. Se esiste evento LIVE:
 *    - Se event_type = 'dediche' → mostra Info (Open Mic non attivo per questo evento)
 *    - Se event_type = 'openmic' o 'both':
 *      - Se pin_required && !pinValidated → mostra PIN gate
 *      - Altrimenti → mostra LIVE
 * 2. Se Serata Aperta (Free Mode) attiva per openmic → mostra Open Mic senza limiti
 * 3. Se esistono eventi READY → mostra PreEventPage
 * 4. Altrimenti → mostra Info
 */
const AppOpenMic: React.FC = () => {
  const { eventState, liveEvent, upcomingEvents, isOpenmicVisible, isFreeMode, freeMode } = useLiveEvent();
  const { 
    hasValidSession, 
    loading: sessionLoading, 
    sessionInvalidated 
  } = usePinSession('openmic');
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
    // Se l'evento è solo "dediche", Open Mic non è visibile
    if (!isOpenmicVisible) {
      return <OpenMicInfo />;
    }

    // Se PIN richiesto e non ancora validato
    if (liveEvent?.pin_required && !pinValidated) {
      return (
        <FormatPinGate
          format="openmic"
          formatDisplayName="Open Mic"
          onPinValidated={handlePinValidated}
          backTo="/app"
          backLabel="Torna all'app"
        />
      );
    }

    // LIVE: mostra Open Mic con contesto evento
    return <OpenMic appMode liveEvent={liveEvent} />;
  }

  // CASE 2: Serata Aperta (Free Mode) attiva per Open Mic
  if (eventState.type === 'freemode' && freeMode.openmic) {
    return <FreeModeOpenMic />;
  }

  // CASE 3: Eventi READY esistono → Pre-Event Page
  if (eventState.type === 'upcoming') {
    return <PreEventPage events={upcomingEvents} />;
  }

  // CASE 4: Nessun evento → Info page
  return <OpenMicInfo />;
};

export default AppOpenMic;
