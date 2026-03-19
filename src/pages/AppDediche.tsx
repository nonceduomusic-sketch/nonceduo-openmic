import React, { useState, useEffect, useCallback } from "react";
import Messages from "@/pages/Messages";
import DedicheInfo from "@/pages/DedicheInfo";
import { PreEventPage } from "@/components/PreEventPage";
import { FormatPinGate } from "@/components/FormatPinGate";
import { FreeModeDediche } from "@/components/FreeModeDediche";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { usePinSession } from "@/hooks/usePinSession";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

/**
 * AppDediche - Entry point per Dediche
 * 
 * LOGICA RENDERING:
 * 1. Se esiste evento LIVE:
 *    - Se event_type = 'openmic' → mostra Info (Dediche non attivo per questo evento)
 *    - Se event_type = 'dediche' o 'both':
 *      - Se pin_required && !pinValidated → mostra PIN gate
 *      - Altrimenti → mostra LIVE
 * 2. Se Free Mode attiva per dediche:
 *    - Se pin_enabled && !pinValidated → mostra PIN gate (stesso sistema unificato)
 *    - Altrimenti → mostra Dediche senza limiti
 * 3. Se esistono eventi READY → mostra PreEventPage
 * 4. Altrimenti → mostra Info
 * 
 * NOTA IMPORTANTE: Il PIN è legato all'EVENTO, non al format.
 * Una volta validato il PIN, l'utente ha accesso a TUTTI i format dell'evento.
 */
const AppDediche: React.FC = () => {
  const { isActive: isAppVisible, loading: visibilityLoading } = useFormatActiveCheck('dediche', 'app');
  const { isActive: isFormatActive, loading: formatActiveLoading } = useFormatActiveCheck('dediche', 'format_active');
  const { eventState, liveEvent, upcomingEvents, isDedicheVisible, isFreeMode, freeMode } = useLiveEvent();
  const { 
    hasValidSession, 
    loading: sessionLoading, 
    sessionInvalidated 
  } = usePinSession('dediche');
  const [pinValidated, setPinValidated] = useState(false);

  // Auto-validate if session is valid (persistent login - works across format switches!)
  useEffect(() => {
    if (!sessionLoading && hasValidSession && !sessionInvalidated) {
      setPinValidated(true);
    }
  }, [sessionLoading, hasValidSession, sessionInvalidated]);

  // Reset pin validation if session is invalidated (PIN changed, event closed, etc.)
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
  if (eventState.type === 'loading' || sessionLoading || visibilityLoading || formatActiveLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // App visibility toggle is OFF → show info page
  if (!isAppVisible) {
    return <DedicheInfo />;
  }

  // Format not active → show info page only
  if (!isFormatActive) {
    return <DedicheInfo />;
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
          displayPin={liveEvent.show_pin_on_gate ? liveEvent.pin_code : undefined}
        />
      );
    }

    // LIVE: mostra Dediche con contesto evento
    return <Messages appMode liveEvent={liveEvent} />;
  }

  // CASE 2: Free Mode attiva per Dediche
  if (eventState.type === 'freemode' && freeMode.dediche) {
    // Se PIN abilitato e non ancora validato - usa lo stesso sistema unificato
    if (freeMode.pinEnabled && freeMode.pinCode && !pinValidated) {
      return (
        <FormatPinGate
          format="dediche"
          formatDisplayName={freeMode.eventName || "Dediche"}
          onPinValidated={handlePinValidated}
          backTo="/app"
          backLabel="Torna all'app"
          displayPin={freeMode.showPinOnGate ? freeMode.pinCode : undefined}
        />
      );
    }
    
    return <FreeModeDediche freeModeState={freeMode} />;
  }

  // CASE 3: Eventi READY esistono → Pre-Event Page
  if (eventState.type === 'upcoming') {
    return <PreEventPage events={upcomingEvents} />;
  }

  // CASE 4: Nessun evento → Info page
  return <DedicheInfo />;
};

export default AppDediche;
