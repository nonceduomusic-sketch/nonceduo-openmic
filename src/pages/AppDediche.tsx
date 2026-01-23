import React, { useState } from "react";
import Messages from "@/pages/Messages";
import DedicheInfo from "@/pages/DedicheInfo";
import { FormatPinGate } from "@/components/FormatPinGate";
import { useFormatGating } from "@/hooks/useFormatGating";

/**
 * AppDediche - Entry point per Dediche
 * 
 * LOGICA FERREA:
 * 1. Se format NON ATTIVO → mostra TEASER (DedicheInfo) - sempre visibile, niente PIN
 * 2. Se format ATTIVO:
 *    - Senza PIN → accesso diretto al LIVE
 *    - Con PIN → mostra schermata PIN, poi LIVE
 */
const AppDediche: React.FC = () => {
  const { loading, getGatingDecision } = useFormatGating('dediche');
  const [pinValidated, setPinValidated] = useState(false);

  // Loading state
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  const decision = getGatingDecision();

  // TEASER: format non attivo → mostra pagina promozionale
  if (decision === 'teaser') {
    return <DedicheInfo />;
  }

  // PIN REQUIRED: format attivo ma protetto da PIN
  if (decision === 'pin-required' && !pinValidated) {
    return (
      <FormatPinGate
        format="dediche"
        formatDisplayName="Dediche"
        onPinValidated={() => setPinValidated(true)}
        backTo="/app"
        backLabel="Torna all'app"
      />
    );
  }

  // LIVE: format attivo senza PIN (o PIN già validato)
  return <Messages appMode />;
};

export default AppDediche;
