import React, { useState } from "react";
import { MessageCircle, Ban } from "lucide-react";
import { AdminMessagesTab } from "@/components/AdminMessagesTab";
import { AdminBlockedUsersTab } from "@/components/AdminBlockedUsersTab";

interface AdminDedichePanelProps {
  onUnreadCountChange?: (count: number) => void;
}

export const AdminDedichePanel: React.FC<AdminDedichePanelProps> = ({ onUnreadCountChange }) => {
  const [mainView, setMainView] = useState<"messages" | "blocked">("messages");

  return (
    <div className="space-y-4">
      {/* Primary toggle: Messages vs Blocked */}
      <div className="flex gap-2">
        <button
          onClick={() => setMainView("messages")}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
            mainView === "messages"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <MessageCircle className="w-4 h-4 inline-block mr-2" />
          Conversazioni
        </button>
        <button
          onClick={() => setMainView("blocked")}
          className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
            mainView === "blocked"
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Ban className="w-4 h-4 inline-block mr-2" />
          Bloccati
        </button>
      </div>

      {/* Content */}
      {mainView === "messages" ? (
        <AdminMessagesTab
          section="dediche"
          onUnreadCountChange={onUnreadCountChange}
          visibleSubTabs={["unread", "read", "groups"]}
          initialSubTab="unread"
        />
      ) : (
        <AdminBlockedUsersTab />
      )}
    </div>
  );
};
