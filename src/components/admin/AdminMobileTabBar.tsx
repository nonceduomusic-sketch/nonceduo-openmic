import React from "react";
import { Bell, Calendar, Image, MessageSquare, Music, SlidersHorizontal } from "lucide-react";
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
  isOperator?: boolean;
  operatorAccess?: {
    canViewCentro: boolean;
    canViewOpenmic: boolean;
    canViewDediche: boolean;
  };
};

type Item = {
  key: AdminMainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: (b: Props["badges"]) => number;
  gatedBy?: "openmic" | "dediche" | "community";
};

/**
 * Mobile Tab Bar riorganizzata:
 * - Centro: Dashboard notifiche (sempre prima)
 * - Eventi: Gestione eventi liberi e programmati
 * - Formati: Toggle rapidi e votazioni
 * - Open Mic / Dediche: Sezioni operative
 * - Community è nel menu hamburger per semplificare mobile
 */
const ITEMS: Item[] = [
  { key: "notifications", label: "Centro", icon: Bell, badge: (b) => b.totalNotifications },
  { key: "event", label: "Eventi", icon: Calendar },
  { key: "formats", label: "Formati", icon: SlidersHorizontal },
  { key: "grafiche", label: "Grafiche", icon: Image },
  { key: "openmic", label: "Open Mic", icon: Music, badge: (b) => b.openmicActiveCount, gatedBy: "openmic" },
  { key: "dediche", label: "Dediche", icon: MessageSquare, badge: (b) => b.dedicheUnread, gatedBy: "dediche" },
];

export function AdminMobileTabBar({ value, onChange, onBlockedChange, badges, access, isOperator = false, operatorAccess }: Props) {
  // For operators, show only Centro, Open Mic, Dediche
  const visibleItems = isOperator 
    ? ITEMS.filter(item => ["notifications", "openmic", "dediche"].includes(item.key))
    : ITEMS;

  const isDisabled = (item: Item) => {
    // Operators have special restricted view
    if (isOperator && operatorAccess) {
      if (item.key === "notifications") return !operatorAccess.canViewCentro;
      if (item.key === "openmic") return !operatorAccess.canViewOpenmic;
      if (item.key === "dediche") return !operatorAccess.canViewDediche;
      return true; // Block everything else for operators
    }
    
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
      {/* iOS-style frosted glass backdrop */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl border-t border-border/40" />
      
      <div className="relative flex items-stretch h-[56px]">
        {visibleItems.map((item) => {
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
                "transition-all duration-150 active:scale-95",
                disabled && "opacity-35",
              )}
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled}
            >
              {/* Icon with highlight background when active */}
              <div className="relative">
                <div
                  className={cn(
                    "p-2 rounded-2xl transition-all duration-150",
                    active && "bg-primary/15",
                  )}
                >
                  <Icon 
                    className={cn(
                      "w-6 h-6 transition-colors duration-150",
                      active ? "text-primary" : "text-muted-foreground"
                    )} 
                  />
                </div>

                {/* Badge - positioned top-right of icon */}
                {count > 0 && (
                  <span 
                    className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5",
                      "flex items-center justify-center",
                      "text-[11px] font-bold leading-none",
                      "rounded-full bg-destructive text-destructive-foreground",
                      "shadow-sm shadow-destructive/30"
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>

              {/* Label */}
              <span 
                className={cn(
                  "text-[10px] font-medium leading-tight tracking-tight",
                  active ? "text-primary" : "text-muted-foreground/80"
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
