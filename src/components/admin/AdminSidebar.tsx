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
import { Bell, Database, ListMusic, MessageSquare, Music, Newspaper, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminMainTab =
  | "notifications"
  | "openmic"
  | "dediche"
  | "community"
  | "songs"
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
  { key: "dediche", label: "Dediche", icon: MessageSquare, group: "Operativo" },
  { key: "community", label: "Community", icon: Newspaper, group: "Operativo" },
  { key: "songs", label: "Canzoni", icon: ListMusic, group: "Operativo" },
  { key: "permissions", label: "Permessi", icon: Shield, group: "Gestione" },
  { key: "settings", label: "Impostazioni", icon: Settings, group: "Gestione" },
  { key: "audit", label: "Audit", icon: Database, group: "Gestione" },
];

export function AdminSidebar({
  active,
  onSelect,
}: {
  active: AdminMainTab;
  onSelect: (tab: AdminMainTab) => void;
}) {
  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operativo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.filter((i) => i.group === "Operativo").map((item) => {
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Gestione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.filter((i) => i.group === "Gestione").map((item) => {
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
