import React from "react";
import OpenMic from "@/pages/OpenMic";
import { SectionOffLanding } from "@/components/SectionOffLanding";
import { useSectionStatus } from "@/hooks/useSectionStatus";

const AppOpenMic: React.FC = () => {
  const { status, loading } = useSectionStatus("openmic");

  if (loading) {
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

  return <OpenMic appMode />;
};

export default AppOpenMic;
