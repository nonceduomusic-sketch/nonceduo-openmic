import React from "react";
import { Bell, Database, ListMusic, MessageSquare, Music, Newspaper, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminMainTab } from "@/components/admin/AdminSidebar";

type Props = {
  value: AdminMainTab;
  onChange: (tab: AdminMainTab) => void;
  onBlockedChange?: (tab: AdminMainTab) => void;
  badges: {
    totalNotifications: number;
    openmicActiveCount: number;
    dedicheUnread: number;
    communityUnread: number;
  };
  access: {
    openmic: boolean;
    dediche: boolean;
    community: boolean;
  };
};

type Item = {
  key: AdminMainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: (b: Props["badges"]) => number;
  gatedBy?: "openmic" | "dediche" | "community";
};

// Keep this minimal: the “Gestione” tabs stay reachable from the header menu.
const ITEMS: Item[] = [
  { key: "notifications", label: "Centro", icon: Bell, badge: (b) => b.totalNotifications },
  { key: "openmic", label: "Open Mic", icon: Music, badge: (b) => b.openmicActiveCount, gatedBy: "openmic" },
  // Keep Open Mic + Canzoni adjacent (same format)
  { key: "songs", label: "Canzoni", icon: ListMusic, gatedBy: "openmic" },
  { key: "dediche", label: "Dediche", icon: MessageSquare, badge: (b) => b.dedicheUnread, gatedBy: "dediche" },
  { key: "community", label: "Community", icon: Newspaper, badge: (b) => b.communityUnread, gatedBy: "community" },
];

export function AdminMobileTabBar({ value, onChange, onBlockedChange, badges, access }: Props) {
  const isDisabled = (item: Item) => {
    if (!item.gatedBy) return false;
    return !access[item.gatedBy];
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/98 backdrop-blur-xl border-t border-border/80 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = value === item.key;
          const disabled = isDisabled(item);
          const count = item.badge ? item.badge(badges) : 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (disabled) {
                  onBlockedChange?.(item.key);
                  return;
                }
                onChange(item.key);
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all duration-200 relative",
                disabled && "opacity-45 cursor-not-allowed",
                active ? "text-foreground" : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled}
            >
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />}

              <div
                className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  active ? "bg-primary/12 scale-110" : "hover:bg-muted/50",
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-1">
                <span className={cn("text-[10px] font-medium mt-0.5", active && "font-semibold")}>{item.label}</span>
                {count > 0 ? (
                  <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                    {count}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Spacer so iOS home-indicator doesn't cover content */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
