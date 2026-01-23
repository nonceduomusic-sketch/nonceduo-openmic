import React, { useState } from "react";
import OpenMic from "@/pages/OpenMic";
import OpenMicInfo from "@/pages/OpenMicInfo";
import { FormatPinGate } from "@/components/FormatPinGate";
import { useFormatGating } from "@/hooks/useFormatGating";

/**
 * AppOpenMic - Entry point per Open Mic
 * 
 * LOGICA FERREA:
 * 1. Se format NON ATTIVO → mostra TEASER (OpenMicInfo) - sempre visibile, niente PIN
 * 2. Se format ATTIVO:
 *    - Senza PIN → accesso diretto al LIVE
 *    - Con PIN → mostra schermata PIN, poi LIVE
 */
const AppOpenMic: React.FC = () => {
  const { loading, getGatingDecision } = useFormatGating('openmic');
  const [pinValidated, setPinValidated] = useState(false);

  // Loading state
  if (loading) {
    return <div className="min-h-screen bg-background" />;
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
        onPinValidated={() => setPinValidated(true)}
        backTo="/app"
        backLabel="Torna all'app"
      />
    );
  }

  // LIVE: format attivo senza PIN (o PIN già validato)
  return <OpenMic appMode />;
};

export default AppOpenMic;
