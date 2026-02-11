import React from "react";
import {
  Bell,
  Book,
  Bot,
  Calendar,
  Crown,
  Database,
  Image,
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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  { key: "notifiche-live", label: "Notifiche Live", icon: Send, group: "Live" },
  { key: "grafiche", label: "Grafiche", icon: Image, group: "Live" },

  // === GRUPPO OPERATIVO ===
  { key: "openmic", label: "Open Mic", icon: Music, group: "Operativo", gatedBy: "openmic" },
  { key: "songs", label: "Canzoni", icon: ListMusic, group: "Operativo", gatedBy: "openmic" },
  { key: "dediche", label: "Dediche", icon: MessageSquare, group: "Operativo", gatedBy: "dediche" },
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

  const isBlocked = (item: MenuItem) => {
    // Operators have special restricted view
    if (isOperator && operatorAccess) {
      if (item.key === "notifications") return !operatorAccess.canViewCentro;
      if (item.key === "openmic") return !operatorAccess.canViewOpenmic;
      if (item.key === "dediche") return !operatorAccess.canViewDediche;
      return true; // Block everything else for operators
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
    // Operators only see Centro, Open Mic, Dediche
    if (isOperator) {
      return ["notifications", "openmic", "dediche"].includes(item.key);
    }
    // Hide owner-only items from non-owners
    if (item.ownerOnly && !isOwner) return false;
    return true;
  });

  const renderGroup = (groupName: "Live" | "Operativo" | "Gestione", groupLabel: string, emoji: string) => {
    const items = visibleItems.filter((i) => i.group === groupName);
    if (items.length === 0) return null;

    return (
      <div key={groupName} className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium mb-2 px-2">
          {emoji} {groupLabel}
        </p>
        <div className="space-y-1">
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
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                  active && "bg-primary/10 text-primary font-medium",
                  !active && !blocked && "hover:bg-muted/50 text-foreground",
                  blocked && "opacity-40 cursor-not-allowed"
                )}
                disabled={blocked}
              >
                <Icon className={cn("w-5 h-5 shrink-0", active && "text-primary")} />
                <span className="flex-1 text-sm">{item.label}</span>
                {badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold"
                  >
                    {badge > 99 ? "99+" : badge}
                  </Badge>
                )}
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
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-left font-display text-lg">Menu Admin</SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3">
          {!isOperator && renderGroup("Live", "Live", "🔴")}
          {!isOperator && <Separator className="my-3" />}
          {renderGroup("Operativo", "Operativo", "📋")}
          {!isOperator && <Separator className="my-3" />}
          {!isOperator && renderGroup("Gestione", "Gestione", "⚙️")}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-3 space-y-1">

          {/* Reset Options */}
          {onResetOpenMic && (
            <button
              onClick={() => {
                onResetOpenMic();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Open Mic</span>
            </button>
          )}
          {onResetDediche && (
            <button
              onClick={() => {
                onResetDediche();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Dediche</span>
            </button>
          )}
          {onResetAll && (
            <button
              onClick={() => {
                onResetAll();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all"
            >
              <Database className="w-4 h-4" />
              <span>Reset Totale</span>
            </button>
          )}

          <Separator className="my-2" />

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Esci</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
