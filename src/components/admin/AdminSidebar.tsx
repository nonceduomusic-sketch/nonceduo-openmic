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
import { 
  Bell, 
  Bot,
  BookOpen,
  Calendar, 
  Guitar,
  Link2,
  ListMusic, 
  MessageSquare, 
  Music, 
  Newspaper, 
  Settings, 
  Shield, 
  Users, 
  Database,
  SlidersHorizontal,
  Image,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSectionKey } from "@/hooks/useAdminSectionAccess";
import { Send } from "lucide-react";

export type AdminMainTab =
  | "notifications"
  | "event"
  | "openmic"
  | "dediche"
  | "community"
  | "songs"
  | "formats"
  | "grafiche"
  | "trasmetti"
  | "songbook-live"
  | "notifiche-live"
  | "assistant"
  | "operators"
  | "staff"
  | "permissions"
  | "settings"
  | "audit"
  | "manuale"
  | "catalog-songbook";

type Item = {
  key: AdminMainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Live" | "Operativo" | "Gestione";
  description?: string;
};

/**
 * Sidebar riorganizzata con 3 gruppi logici:
 * 1. LIVE: Centro notifiche + Eventi (liberi/programmati) + Formati + Grafiche
 * 2. OPERATIVO: Gestione attiva Open Mic, Dediche, Community, Canzoni
 * 3. GESTIONE: Operatori, Staff, Permessi, Impostazioni, Audit (owner-only dove necessario)
 */
const ITEMS: Item[] = [
  // === GRUPPO LIVE ===
  { key: "notifications", label: "Centro", icon: Bell, group: "Live", description: "Dashboard in tempo reale" },
  { key: "event", label: "Eventi", icon: Calendar, group: "Live", description: "Eventi liberi e programmati" },
  { key: "formats", label: "Formati", icon: SlidersHorizontal, group: "Live", description: "Toggle e votazioni" },
  { key: "trasmetti", label: "Trasmetti", icon: Tv, group: "Live", description: "Karaoke TV broadcast" },
  { key: "songbook-live" as AdminMainTab, label: "SongBook Live", icon: Guitar, group: "Live", description: "Console ChordPro" },
  { key: "catalog-songbook" as AdminMainTab, label: "Catalogo ↔ SB", icon: Link2, group: "Live", description: "Collega Catalogo e SongBook" },
  { key: "notifiche-live", label: "Notifiche Live", icon: Send, group: "Live", description: "Email e Telegram" },
  { key: "grafiche", label: "Grafiche", icon: Image, group: "Live", description: "Locandine e storie" },
  
  // === GRUPPO OPERATIVO ===
  { key: "openmic", label: "Open Mic", icon: Music, group: "Operativo", description: "Prenotazioni canzoni" },
  { key: "songs", label: "Canzoni", icon: ListMusic, group: "Operativo", description: "Coda e catalogo brani" },
  { key: "dediche", label: "Dediche", icon: MessageSquare, group: "Operativo", description: "Messaggi e chat" },
  { key: "community", label: "Community", icon: Newspaper, group: "Operativo", description: "Gruppi e bacheca" },
  { key: "assistant", label: "Assistente", icon: Bot, group: "Operativo", description: "Chat e lead" },
  
  // === GRUPPO GESTIONE ===
  { key: "settings", label: "Impostazioni", icon: Settings, group: "Gestione", description: "Configurazione generale" },
  { key: "operators", label: "Operatori", icon: Users, group: "Gestione", description: "Account operativi" },
  { key: "staff", label: "Staff", icon: Users, group: "Gestione", description: "Gestione team" },
  { key: "permissions", label: "Permessi", icon: Shield, group: "Gestione", description: "Controllo accessi" },
  { key: "audit", label: "Audit", icon: Database, group: "Gestione", description: "Log attività" },
  { key: "manuale", label: "Manuale", icon: BookOpen, group: "Gestione", description: "Guida Admin" },
];

export function AdminSidebar({
  active,
  onSelect,
  access,
  onBlockedSelect,
  isOwner = false,
  isOperator = false,
  operatorAccess,
}: {
  active: AdminMainTab;
  onSelect: (tab: AdminMainTab) => void;
  access: Record<AdminSectionKey, boolean>;
  onBlockedSelect?: (tab: AdminMainTab) => void;
  isOwner?: boolean;
  isOperator?: boolean;
  operatorAccess?: {
    canViewCentro: boolean;
    canViewOpenmic: boolean;
    canViewDediche: boolean;
    canViewAssistente: boolean;
    canViewTrasmetti: boolean;
  };
}) {
  const isBlocked = (key: AdminMainTab) => {
    // Operators have special restricted view
    if (isOperator && operatorAccess) {
      if (key === "notifications") return !operatorAccess.canViewCentro;
      if (key === "openmic") return !operatorAccess.canViewOpenmic;
      if (key === "dediche") return !operatorAccess.canViewDediche;
      if (key === "assistant") return !operatorAccess.canViewAssistente;
      if (key === "trasmetti") return !operatorAccess.canViewTrasmetti;
      // Operators never see these sections
      if (["event", "formats", "grafiche", "songs", "community", "settings", "staff", "permissions", "audit", "notifiche-live", "operators"].includes(key)) {
        return true;
      }
      return false;
    }
    
    if (key === "openmic") return !access.openmic;
    if (key === "songs") return !access.openmic;
    if (key === "dediche") return !access.dediche;
    if (key === "community") return !access.community;
    // Staff, permissions, and audit tabs are owner-only
    if (key === "staff") return !isOwner;
    if (key === "operators") return !isOwner;
    if (key === "permissions") return !isOwner;
    if (key === "audit") return !isOwner;
    // Assistant is owner/admin only
    if (key === "assistant") return !isOwner && !access.openmic;
    // Trasmetti available to all staff
    if (key === "trasmetti") return false;
    return false;
  };

  // Filter items based on visibility
  const visibleItems = ITEMS.filter((item) => {
    // Operators see sections based on their permissions
    if (isOperator && operatorAccess) {
      if (item.key === "notifications") return operatorAccess.canViewCentro;
      if (item.key === "openmic") return operatorAccess.canViewOpenmic;
      if (item.key === "dediche") return operatorAccess.canViewDediche;
      if (item.key === "assistant") return operatorAccess.canViewAssistente;
      if (item.key === "trasmetti") return operatorAccess.canViewTrasmetti;
      // Hide everything else for operators
      return false;
    }
    // Owner-only tabs hidden from non-owners
    if (item.key === "staff" && !isOwner) return false;
    if (item.key === "operators" && !isOwner) return false;
    if (item.key === "permissions" && !isOwner) return false;
    if (item.key === "audit" && !isOwner) return false;
    // Assistant visible for owner and admins
    if (item.key === "assistant" && !isOwner) return false;
    return true;
  });

  const renderGroup = (groupName: "Live" | "Operativo" | "Gestione", groupLabel: string) => {
    const groupItems = visibleItems.filter((i) => i.group === groupName);
    if (groupItems.length === 0) return null;

    return (
      <SidebarGroup key={groupName}>
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
          {groupLabel}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {groupItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              const blocked = isBlocked(item.key);
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={blocked ? `${item.label} (non autorizzato)` : item.description || item.label}
                    onClick={() => {
                      if (blocked) {
                        onBlockedSelect?.(item.key);
                        return;
                      }
                      onSelect(item.key);
                    }}
                    className={cn(
                      "justify-start gap-3 h-10",
                      isActive && "font-medium bg-primary/10 text-primary",
                      blocked && "opacity-40 cursor-not-allowed",
                    )}
                    aria-disabled={blocked}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      isActive && "text-primary",
                      blocked && "text-muted-foreground"
                    )} />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="py-2">
        {renderGroup("Live", "🔴 Live")}
        <SidebarSeparator className="my-2" />
        {renderGroup("Operativo", "📋 Operativo")}
        <SidebarSeparator className="my-2" />
        {renderGroup("Gestione", "⚙️ Gestione")}
      </SidebarContent>
    </Sidebar>
  );
}
