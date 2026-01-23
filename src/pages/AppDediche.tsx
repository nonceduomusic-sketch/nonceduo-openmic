import React from "react";
import Messages from "@/pages/Messages";
import { SectionOffLanding } from "@/components/SectionOffLanding";
import { useSectionStatus } from "@/hooks/useSectionStatus";
import { useFormatAvailability } from "@/hooks/useUnifiedLiveSession";

const AppDediche: React.FC = () => {
  const { status, loading } = useSectionStatus("dediche");
  const { isOtherFormatOnly, loading: availLoading } = useFormatAvailability();

  if (loading || availLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (status && !status.isEnabled) {
    return (
      <SectionOffLanding
        title="Dediche"
        description="Le Dediche sono disponibili durante le serate. Per maggiori info e date, contattaci."
        backTo="/"
        backLabel="Torna al sito"
        secondaryBackTo="/app"
        secondaryBackLabel="Torna all'app"
      />
    );
  }

  // Check if only OpenMic is active (Dediche not protected means unavailable during this live session)
  if (isOtherFormatOnly('dediche')) {
    return (
      <SectionOffLanding
        title="Dediche non disponibili"
        description="Stasera è serata Open Mic! Le dediche non sono attive – goditi lo spettacolo e prenota una canzone!"
        backTo="/app/openmic"
        backLabel="Vai all'Open Mic"
        secondaryBackTo="/app"
        secondaryBackLabel="Torna all'app"
      />
    );
  }

  return <Messages appMode />;
};

export default AppDediche;
