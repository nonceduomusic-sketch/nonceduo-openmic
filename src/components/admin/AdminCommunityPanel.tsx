import React, { useEffect, useState } from "react";
import { Users, Link2, Newspaper, Shield, Ban } from "lucide-react";
import { AdminMessagesTab } from "@/components/AdminMessagesTab";
import { AdminUsersTab } from "@/components/AdminUsersTab";
import { AdminFeedTab } from "@/components/AdminFeedTab";
import { AdminCommunityInvitesTab } from "@/components/admin/AdminCommunityInvitesTab";
import { AdminCommunityBlockedUsersTab } from "@/components/admin/AdminCommunityBlockedUsersTab";

type SubTab = "groups" | "invites" | "users" | "feed" | "blocked";

export const AdminCommunityPanel: React.FC<{
  subTab?: SubTab;
  onSubTabChange?: (tab: SubTab) => void;
}> = ({ subTab: controlledSubTab, onSubTabChange }) => {
  const [internalSubTab, setInternalSubTab] = useState<SubTab>("groups");

  const subTab = controlledSubTab ?? internalSubTab;
  const setSubTab = (tab: SubTab) => {
    onSubTabChange?.(tab);
    if (!controlledSubTab) setInternalSubTab(tab);
  };

  // If the parent starts controlling this, sync internal state once.
  useEffect(() => {
    if (controlledSubTab) setInternalSubTab(controlledSubTab);
  }, [controlledSubTab]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-wrap">
        <button
          onClick={() => setSubTab("groups")}
          className={`shrink-0 md:flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            subTab === "groups" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Gruppi
        </button>
        <button
          onClick={() => setSubTab("invites")}
          className={`shrink-0 md:flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            subTab === "invites" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Link2 className="w-4 h-4 inline-block mr-2" />
          Inviti
        </button>
        <button
          onClick={() => setSubTab("users")}
          className={`shrink-0 md:flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            subTab === "users" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Shield className="w-4 h-4 inline-block mr-2" />
          Utenti & Staff
        </button>
        <button
          onClick={() => setSubTab("feed")}
          className={`shrink-0 md:flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            subTab === "feed" ? "bg-gradient-to-r from-accent to-secondary text-accent-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Newspaper className="w-4 h-4 inline-block mr-2" />
          Bacheca
        </button>
        <button
          onClick={() => setSubTab("blocked")}
          className={`shrink-0 md:flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            subTab === "blocked" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Ban className="w-4 h-4 inline-block mr-2" />
          Bloccati
        </button>
      </div>

      {subTab === "groups" && (
        <AdminMessagesTab section="community" visibleSubTabs={["groups"]} initialSubTab="groups" />
      )}
      {subTab === "invites" && <AdminCommunityInvitesTab />}
      {subTab === "users" && <AdminUsersTab />}
      {subTab === "feed" && <AdminFeedTab />}
      {subTab === "blocked" && <AdminCommunityBlockedUsersTab />}
    </div>
  );
};
