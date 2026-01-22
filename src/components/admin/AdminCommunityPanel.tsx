import React, { useState } from "react";
import { Users, Link2, Newspaper, Shield, Ban } from "lucide-react";
import { AdminMessagesTab } from "@/components/AdminMessagesTab";
import { AdminUsersTab } from "@/components/AdminUsersTab";
import { AdminFeedTab } from "@/components/AdminFeedTab";
import { AdminCommunityInvitesTab } from "@/components/admin/AdminCommunityInvitesTab";
import { AdminCommunityBlockedUsersTab } from "@/components/admin/AdminCommunityBlockedUsersTab";

export const AdminCommunityPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<"groups" | "invites" | "users" | "feed" | "blocked">("groups");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSubTab("groups")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            subTab === "groups" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Gruppi
        </button>
        <button
          onClick={() => setSubTab("invites")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            subTab === "invites" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Link2 className="w-4 h-4 inline-block mr-2" />
          Inviti
        </button>
        <button
          onClick={() => setSubTab("users")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            subTab === "users" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Shield className="w-4 h-4 inline-block mr-2" />
          Utenti
        </button>
        <button
          onClick={() => setSubTab("feed")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            subTab === "feed" ? "bg-gradient-to-r from-accent to-secondary text-accent-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Newspaper className="w-4 h-4 inline-block mr-2" />
          Bacheca
        </button>
        <button
          onClick={() => setSubTab("blocked")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
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
