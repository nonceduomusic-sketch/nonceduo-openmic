import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Bell, Database, ListMusic, MessageSquare, Music, Newspaper, Settings, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSectionKey } from "@/hooks/useAdminSectionAccess";

export type AdminMainTab =
  | "notifications"
  | "openmic"
  | "dediche"
  | "community"
  | "songs"
  | "staff"
  | "permissions"
  | "settings"
  | "audit";

type Item = {
  key: AdminMainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Operativo" | "Gestione";
};

const ITEMS: Item[] = [
  { key: "notifications", label: "Centro", icon: Bell, group: "Operativo" },
  { key: "openmic", label: "Open Mic", icon: Music, group: "Operativo" },
  { key: "songs", label: "Canzoni", icon: ListMusic, group: "Operativo" },
  { key: "dediche", label: "Dediche", icon: MessageSquare, group: "Operativo" },
  { key: "community", label: "Community", icon: Newspaper, group: "Operativo" },
  { key: "staff", label: "Staff", icon: Users, group: "Gestione" },
  { key: "permissions", label: "Permessi", icon: Shield, group: "Gestione" },
  { key: "settings", label: "Impostazioni", icon: Settings, group: "Gestione" },
  { key: "audit", label: "Audit", icon: Database, group: "Gestione" },
];

export function AdminSidebar({
  active,
  onSelect,
  access,
  onBlockedSelect,
  isOwner = false,
}: {
  active: AdminMainTab;
  onSelect: (tab: AdminMainTab) => void;
  access: Record<AdminSectionKey, boolean>;
  onBlockedSelect?: (tab: AdminMainTab) => void;
  isOwner?: boolean;
}) {
  const isBlocked = (key: AdminMainTab) => {
    if (key === "openmic") return !access.openmic;
    if (key === "songs") return !access.openmic;
    if (key === "dediche") return !access.dediche;
    if (key === "community") return !access.community;
    // Staff, permissions, and audit tabs are owner-only
    if (key === "staff") return !isOwner;
    if (key === "permissions") return !isOwner;
    if (key === "audit") return !isOwner;
    return false;
  };

  // Filter items based on visibility - owner-only tabs hidden from non-owners
  const visibleItems = ITEMS.filter((item) => {
    if (item.key === "staff" && !isOwner) return false;
    if (item.key === "permissions" && !isOwner) return false;
    if (item.key === "audit" && !isOwner) return false;
    return true;
  });

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operativo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.filter((i) => i.group === "Operativo").map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                const blocked = isBlocked(item.key);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={blocked ? `${item.label} (non autorizzato)` : item.label}
                      onClick={() => {
                        if (blocked) {
                          onBlockedSelect?.(item.key);
                          return;
                        }
                        onSelect(item.key);
                      }}
                      className={cn(
                        "justify-start",
                        isActive && "font-medium",
                        blocked && "opacity-50 cursor-not-allowed",
                      )}
                      aria-disabled={blocked}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Gestione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.filter((i) => i.group === "Gestione").map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => onSelect(item.key)}
                      className={cn("justify-start", isActive && "font-medium")}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
