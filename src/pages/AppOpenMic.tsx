import React from "react";
import OpenMic from "@/pages/OpenMic";
import { SectionOffLanding } from "@/components/SectionOffLanding";
import { useSectionStatus } from "@/hooks/useSectionStatus";
import { useFormatAvailability } from "@/hooks/useUnifiedLiveSession";

const AppOpenMic: React.FC = () => {
  const { status, loading } = useSectionStatus("openmic");
  const { isOtherFormatOnly, loading: availLoading } = useFormatAvailability();

  if (loading || availLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (status && !status.isEnabled) {
    return (
      <SectionOffLanding
        title="Open Mic"
        description="Open Mic è disponibile durante le serate. Per maggiori info e date, contattaci."
        backTo="/"
        backLabel="Torna al sito"
        secondaryBackTo="/app"
        secondaryBackLabel="Torna all'app"
      />
    );
  }

  // Check if only Dediche is active (OpenMic not protected means unavailable during this live session)
  if (isOtherFormatOnly('openmic')) {
    return (
      <SectionOffLanding
        title="Open Mic non disponibile"
        description="Stasera è serata Dediche! L'Open Mic non è attivo – invia una dedica speciale!"
        backTo="/app/dediche"
        backLabel="Vai alle Dediche"
        secondaryBackTo="/app"
        secondaryBackLabel="Torna all'app"
      />
    );
  }

  return <OpenMic appMode />;
};

export default AppOpenMic;
