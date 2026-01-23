import React, { useState, useEffect, useCallback } from "react";
import OpenMic from "@/pages/OpenMic";
import OpenMicInfo from "@/pages/OpenMicInfo";
import { FormatPinGate } from "@/components/FormatPinGate";
import { useFormatGating } from "@/hooks/useFormatGating";
import { usePinSession } from "@/hooks/usePinSession";

/**
 * AppOpenMic - Entry point per Open Mic
 * 
 * LOGICA FERREA:
 * 1. Se format NON ATTIVO → mostra TEASER (OpenMicInfo) - sempre visibile, niente PIN
 * 2. Se format ATTIVO:
 *    - Senza PIN → accesso diretto al LIVE
 *    - Con PIN:
 *      - Se sessione valida → accesso diretto (persistenza)
 *      - Altrimenti → mostra schermata PIN, poi LIVE
 * 
 * SESSIONI PERSISTENTI:
 * - Dopo PIN corretto → sessione salvata in localStorage + DB
 * - Utente chiude e rientra → entra senza PIN
 * - Cambio PIN / reset admin → sessione invalidata → richiede nuovo PIN
 */
const AppOpenMic: React.FC = () => {
  const { loading, getGatingDecision } = useFormatGating('openmic');
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

  // Loading state - wait for both gating and session check
  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const decision = getGatingDecision();

  // TEASER: format non attivo → mostra pagina promozionale
  if (decision === 'teaser') {
    return <OpenMicInfo />;
  }

  // PIN REQUIRED: format attivo ma protetto da PIN
  if (decision === 'pin-required' && !pinValidated) {
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

  // LIVE: format attivo senza PIN (o PIN già validato/sessione persistente)
  return <OpenMic appMode />;
};

export default AppOpenMic;
