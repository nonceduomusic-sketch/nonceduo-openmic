import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import OpenMic from "@/pages/OpenMic";
import OpenMicInfo from "@/pages/OpenMicInfo";
import { PreEventPage } from "@/components/PreEventPage";
import { FormatPinGate } from "@/components/FormatPinGate";
import { FreeModeOpenMic } from "@/components/FreeModeOpenMic";
import { ConsultableOpenMic } from "@/components/ConsultableOpenMic";
import { useLiveEvent, CatalogPreviewSettings } from "@/hooks/useLiveEvent";
import { usePinSession } from "@/hooks/usePinSession";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

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
 *    - Se is_consultable_mode → mostra versione consultabile (no prenotazioni)
 *    - Se pin_enabled && !pinValidated → mostra PIN gate (stesso sistema unificato)
 *    - Altrimenti → mostra Open Mic senza limiti
 * 3. Se catalog_preview attivo → mostra anteprima limitata
 * 4. Se esistono eventi READY → mostra PreEventPage
 * 5. Altrimenti → mostra Info
 * 
 * NOTA IMPORTANTE: Il PIN è legato all'EVENTO, non al format.
 * Una volta validato il PIN, l'utente ha accesso a TUTTI i format dell'evento.
 */
const AppOpenMic: React.FC = () => {
  const { isActive: isAppVisible, loading: visibilityLoading } = useFormatActiveCheck('openmic', 'app');
  const { eventState, liveEvent, upcomingEvents, isOpenmicVisible, isFreeMode, freeMode } = useLiveEvent();
  const { 
    hasValidSession, 
    loading: sessionLoading, 
    sessionInvalidated 
  } = usePinSession('openmic');
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
  if (eventState.type === 'loading' || sessionLoading || visibilityLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // App visibility toggle is OFF → redirect to app launcher
  if (!isAppVisible) {
    return <Navigate to="/app" replace />;
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
    // CASE 2a: Modalità Consultabile - solo anteprima catalogo
    if (freeMode.isConsultableMode) {
      return (
        <ConsultableOpenMic 
          eventName={freeMode.eventName || 'Open Mic'}
          protectRepertoire={freeMode.protectRepertoire}
          limitType={freeMode.catalogPreviewEnabled ? freeMode.catalogPreviewLimitType : undefined}
          limitValue={freeMode.catalogPreviewEnabled ? freeMode.catalogPreviewLimitValue : undefined}
          previewMessage={freeMode.catalogPreviewMessage}
          message="Il catalogo è in modalità anteprima. Le prenotazioni saranno attive durante l'evento."
        />
      );
    }

    // Se PIN abilitato e non ancora validato - usa lo stesso sistema unificato
    if (freeMode.pinEnabled && freeMode.pinCode && !pinValidated) {
      return (
        <FormatPinGate
          format="openmic"
          formatDisplayName={freeMode.eventName || "Open Mic"}
          onPinValidated={handlePinValidated}
          backTo="/app"
          backLabel="Torna all'app"
        />
      );
    }
    
    return <FreeModeOpenMic freeModeState={freeMode} />;
  }

  // CASE 3: Anteprima Catalogo standalone (nessun evento ma preview attivo)
  if (eventState.type === 'preview') {
    const preview = eventState.previewSettings as CatalogPreviewSettings;
    return (
      <ConsultableOpenMic 
        eventName="Open Mic"
        protectRepertoire={preview.protectRepertoire}
        limitType={preview.limitType}
        limitValue={preview.limitValue}
        previewMessage={preview.message}
        message="Dai un'occhiata al nostro catalogo! Le prenotazioni saranno disponibili durante i nostri eventi."
      />
    );
  }

  // CASE 4: Eventi READY esistono → Pre-Event Page
  if (eventState.type === 'upcoming') {
    return <PreEventPage events={upcomingEvents} />;
  }

  // CASE 5: Nessun evento → Info page
  return <OpenMicInfo />;
};

export default AppOpenMic;
