import React from "react";
import Messages from "@/pages/Messages";
import { SectionOffLanding } from "@/components/SectionOffLanding";
import { useSectionStatus } from "@/hooks/useSectionStatus";

const AppDediche: React.FC = () => {
  const { status, loading } = useSectionStatus("dediche");

  if (loading) {
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

  return <Messages appMode />;
};

export default AppDediche;
