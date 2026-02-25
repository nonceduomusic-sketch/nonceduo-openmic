import React from "react";
import {
  Bell,
  Book,
  Bot,
  Calendar,
  Database,
  Gamepad2,
  Guitar,
  Image,
  Link2,
  ListMusic,
  LogOut,
  Menu,
  MessageSquare,
  Music,
  Newspaper,
  RotateCcw,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Tv,
  Users,
  Zap,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdminMainTab } from "@/components/admin/AdminSidebar";
import type { AdminSectionKey } from "@/hooks/useAdminSectionAccess";

type MenuItem = {
  key: AdminMainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Live" | "Operativo" | "Gestione";
  gatedBy?: AdminSectionKey;
  ownerOnly?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  // === GRUPPO LIVE ===
  { key: "notifications", label: "Centro", icon: Bell, group: "Live" },
  { key: "event", label: "Eventi", icon: Calendar, group: "Live" },
  { key: "formats", label: "Formati", icon: SlidersHorizontal, group: "Live" },
  { key: "trasmetti", label: "Trasmetti", icon: Tv, group: "Live" },
  { key: "songbook-live" as AdminMainTab, label: "SongBook", icon: Guitar, group: "Live" },
  { key: "catalog-songbook" as AdminMainTab, label: "Cat↔SB", icon: Link2, group: "Live" },
  { key: "notifiche-live", label: "Notifiche", icon: Send, group: "Live" },
  { key: "grafiche", label: "Grafiche", icon: Image, group: "Live" },

  // === GRUPPO OPERATIVO (ordine: Open Mic, Canzoni, Furore, Dediche, Giochi, Community, Assistente) ===
  { key: "openmic", label: "Open Mic", icon: Music, group: "Operativo", gatedBy: "openmic" },
  { key: "songs", label: "Canzoni", icon: ListMusic, group: "Operativo", gatedBy: "openmic" },
  { key: "furore" as AdminMainTab, label: "Furore", icon: Zap, group: "Operativo" },
  { key: "dediche", label: "Dediche", icon: MessageSquare, group: "Operativo", gatedBy: "dediche" },
  { key: "games" as AdminMainTab, label: "Giochi", icon: Gamepad2, group: "Operativo" },
  { key: "community", label: "Community", icon: Newspaper, group: "Operativo", gatedBy: "community" },
  { key: "assistant", label: "Assistente", icon: Bot, group: "Operativo", ownerOnly: true },

  // === GRUPPO GESTIONE ===
  { key: "settings", label: "Impostazioni", icon: Settings, group: "Gestione" },
  { key: "operators", label: "Operatori", icon: Users, group: "Gestione", ownerOnly: true },
  { key: "staff", label: "Staff", icon: Users, group: "Gestione", ownerOnly: true },
  { key: "permissions", label: "Permessi", icon: Shield, group: "Gestione", ownerOnly: true },
  { key: "audit", label: "Audit", icon: Database, group: "Gestione", ownerOnly: true },
  { key: "manuale", label: "Manuale", icon: Book, group: "Gestione" },
];

interface AdminMobileDrawerProps {
  activeTab: AdminMainTab;
  onSelectTab: (tab: AdminMainTab) => void;
  onBlockedSelect?: (tab: AdminMainTab) => void;
  access: Record<AdminSectionKey, boolean>;
  isOwner: boolean;
  isOperator?: boolean;
  operatorAccess?: {
    canViewCentro: boolean;
    canViewOpenmic: boolean;
    canViewDediche: boolean;
  };
  badges?: {
    totalNotifications?: number;
    openmicActiveCount?: number;
    dedicheUnread?: number;
    communityUnread?: number;
  };
  onResetOpenMic?: () => void;
  onResetDediche?: () => void;
  onResetAll?: () => void;
  onLogout?: () => void;
}

export function AdminMobileDrawer({
  activeTab,
  onSelectTab,
  onBlockedSelect,
  access,
  isOwner,
  isOperator = false,
  operatorAccess,
  badges = {},
  onResetOpenMic,
  onResetDediche,
  onResetAll,
  onLogout,
}: AdminMobileDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [expandedGroup, setExpandedGroup] = React.useState<string | null>(null);

  const isBlocked = (item: MenuItem) => {
    if (isOperator && operatorAccess) {
      if (item.key === "notifications") return !operatorAccess.canViewCentro;
      if (item.key === "openmic") return !operatorAccess.canViewOpenmic;
      if (item.key === "dediche") return !operatorAccess.canViewDediche;
      return true;
    }
    if (item.ownerOnly && !isOwner) return true;
    if (item.gatedBy && !access[item.gatedBy]) return true;
    return false;
  };

  const getBadge = (key: AdminMainTab) => {
    if (key === "notifications") return badges.totalNotifications || 0;
    if (key === "openmic") return badges.openmicActiveCount || 0;
    if (key === "dediche") return badges.dedicheUnread || 0;
    if (key === "community") return badges.communityUnread || 0;
    return 0;
  };

  const handleSelect = (item: MenuItem) => {
    if (isBlocked(item)) {
      onBlockedSelect?.(item.key);
      return;
    }
    onSelectTab(item.key);
    setOpen(false);
  };

  const visibleItems = MENU_ITEMS.filter((item) => {
    if (isOperator) {
      return ["notifications", "openmic", "dediche"].includes(item.key);
    }
    if (item.ownerOnly && !isOwner) return false;
    return true;
  });

  // Find the group of the active tab to auto-expand it
  const activeGroup = MENU_ITEMS.find(i => i.key === activeTab)?.group || null;

  const toggleGroup = (group: string) => {
    setExpandedGroup(prev => prev === group ? null : group);
  };

  /**
   * Compact icon grid for a group — shows items in a 4-column grid
   * with icons and short labels. Active item is highlighted.
   */
  const renderIconGrid = (groupName: "Live" | "Operativo" | "Gestione", groupLabel: string, emoji: string) => {
    const items = visibleItems.filter((i) => i.group === groupName);
    if (items.length === 0) return null;

    const isExpanded = expandedGroup === groupName || activeGroup === groupName;
    const hasActiveItem = items.some(i => activeTab === i.key);

    return (
      <div key={groupName}>
        {/* Group header - clickable to toggle */}
        <button
          onClick={() => toggleGroup(groupName)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold hover:text-muted-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            {emoji} {groupLabel}
            {hasActiveItem && !isExpanded && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </span>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </button>

        {/* Grid of items */}
        <div className={cn(
          "grid grid-cols-4 gap-1 px-2 overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[500px] opacity-100 pb-2" : "max-h-0 opacity-0"
        )}>
          {items.map((item) => {
            const Icon = item.icon;
            const blocked = isBlocked(item);
            const active = activeTab === item.key;
            const badge = getBadge(item.key);

            return (
              <button
                key={item.key}
                onClick={() => handleSelect(item)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition-all",
                  "active:scale-95",
                  active && "bg-primary/15 text-primary ring-1 ring-primary/30",
                  !active && !blocked && "hover:bg-muted/50 text-foreground",
                  blocked && "opacity-30 cursor-not-allowed"
                )}
                disabled={blocked}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5", active && "text-primary")} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] leading-tight text-center font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
          <SheetTitle className="text-left font-display text-base">Menu Admin</SheetTitle>
        </SheetHeader>

        {/* Navigation - compact grid layout */}
        <div className="flex-1 overflow-y-auto py-2">
          {!isOperator && renderIconGrid("Live", "Live", "🔴")}
          {renderIconGrid("Operativo", "Operativo", "📋")}
          {!isOperator && renderIconGrid("Gestione", "Gestione", "⚙️")}
        </div>

        {/* Footer - compact */}
        <div className="border-t border-border/50 p-2 space-y-0.5">
          {onResetOpenMic && (
            <button
              onClick={() => { onResetOpenMic(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Open Mic</span>
            </button>
          )}
          {onResetDediche && (
            <button
              onClick={() => { onResetDediche(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dediche</span>
            </button>
          )}
          {onResetAll && (
            <button
              onClick={() => { onResetAll(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-all"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Reset Totale</span>
            </button>
          )}

          {onLogout && (
            <>
              <div className="border-t border-border/30 my-1" />
              <button
                onClick={() => { onLogout(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Esci</span>
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
