import React, { useState } from "react";
import { MessageCircle, Ban } from "lucide-react";
import { AdminMessagesTab } from "@/components/AdminMessagesTab";
import { AdminBlockedUsersTab } from "@/components/AdminBlockedUsersTab";

interface AdminDedichePanelProps {
  onUnreadCountChange?: (count: number) => void;
}

export const AdminDedichePanel: React.FC<AdminDedichePanelProps> = ({ onUnreadCountChange }) => {
  const [subTab, setSubTab] = useState<"messages" | "blocked">("messages");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab("messages")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            subTab === "messages"
              ? "bg-secondary text-secondary-foreground neon-glow-cyan"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <MessageCircle className="w-4 h-4 inline-block mr-2" />
          Messaggi + Gruppi
        </button>
        <button
          onClick={() => setSubTab("blocked")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            subTab === "blocked"
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Ban className="w-4 h-4 inline-block mr-2" />
          Bloccati (Dediche)
        </button>
      </div>

      {subTab === "messages" ? (
        <AdminMessagesTab
          section="dediche"
          onUnreadCountChange={onUnreadCountChange}
          visibleSubTabs={["unread", "read", "groups"]}
        />
      ) : (
        <AdminBlockedUsersTab />
      )}
    </div>
  );
};
