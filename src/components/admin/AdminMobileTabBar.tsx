import React from "react";
import { Bell, ListMusic, MessageSquare, Music, Newspaper } from "lucide-react";
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

const ITEMS: Item[] = [
  { key: "notifications", label: "Centro", icon: Bell, badge: (b) => b.totalNotifications },
  { key: "openmic", label: "Open Mic", icon: Music, badge: (b) => b.openmicActiveCount, gatedBy: "openmic" },
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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* iOS-style blur backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-border/50" />
      
      <div className="relative flex items-stretch h-[52px]">
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
                "relative flex-1 flex flex-col items-center justify-center gap-0.5",
                "transition-all duration-200 active:scale-95",
                disabled && "opacity-40",
              )}
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled}
            >
              {/* Active indicator - iOS style pill */}
              {active && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary" />
              )}

              {/* Icon container */}
              <div className="relative">
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon 
                    className={cn(
                      "w-[22px] h-[22px] transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )} 
                  />
                </div>

                {/* Badge */}
                {count > 0 && (
                  <span 
                    className={cn(
                      "absolute -top-0.5 -right-1 min-w-[16px] h-[16px] px-1",
                      "flex items-center justify-center",
                      "text-[10px] font-semibold leading-none",
                      "rounded-full bg-destructive text-destructive-foreground",
                      "shadow-sm"
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>

              {/* Label */}
              <span 
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
