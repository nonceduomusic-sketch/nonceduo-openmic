import React, { useState, useEffect, useCallback } from "react";
import OpenMic from "@/pages/OpenMic";
import OpenMicInfo from "@/pages/OpenMicInfo";
import { PreEventPage } from "@/components/PreEventPage";
import { FormatPinGate } from "@/components/FormatPinGate";
import { FreeModePinGate } from "@/components/FreeModePinGate";
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
 * 2. Se Free Mode attiva per openmic:
 *    - Se pin_enabled && !pinValidated → mostra PIN gate
 *    - Altrimenti → mostra Open Mic senza limiti
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
  const [freeModePinValidated, setFreeModePinValidated] = useState(false);

  // Check sessionStorage for free mode PIN validation
  useEffect(() => {
    const sessionKey = 'freemode_pin_openmic';
    const validated = sessionStorage.getItem(sessionKey);
    if (validated === 'validated') {
      setFreeModePinValidated(true);
    }
  }, []);

  // Invalidate free mode PIN session when PIN is disabled
  useEffect(() => {
    if (!freeMode.pinEnabled) {
      sessionStorage.removeItem('freemode_pin_openmic');
      setFreeModePinValidated(false);
    }
  }, [freeMode.pinEnabled]);

  // Auto-validate if session is valid (persistent login for scheduled events)
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

  // Handler for free mode pin validation
  const handleFreeModePinValidated = useCallback(() => {
    setFreeModePinValidated(true);
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

  // CASE 2: Free Mode attiva per Open Mic
  if (eventState.type === 'freemode' && freeMode.openmic) {
    // Se PIN abilitato e non ancora validato
    if (freeMode.pinEnabled && freeMode.pinCode && !freeModePinValidated) {
      return (
        <FreeModePinGate
          format="openmic"
          formatDisplayName={freeMode.eventName || "Open Mic"}
          expectedPin={freeMode.pinCode}
          onPinValidated={handleFreeModePinValidated}
          backTo="/app"
          backLabel="Torna all'app"
        />
      );
    }
    
    return <FreeModeOpenMic freeModeState={freeMode} />;
  }

  // CASE 3: Eventi READY esistono → Pre-Event Page
  if (eventState.type === 'upcoming') {
    return <PreEventPage events={upcomingEvents} />;
  }

  // CASE 4: Nessun evento → Info page
  return <OpenMicInfo />;
};

export default AppOpenMic;
