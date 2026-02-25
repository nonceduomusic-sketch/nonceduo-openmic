import React from "react";
import { NavLink } from "@/components/NavLink";
import { Mic2, MessageCircle, Gamepad2, LayoutGrid, Zap, Users } from "lucide-react";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";

/**
 * Barra di navigazione compatta per le pagine /app/*
 * Mostra i format attivi e permette di tornare all'hub /app
 */
export const AppFormatNav: React.FC = () => {
  const { isOpenmicVisible, isDedicheVisible } = useLiveEvent();
  const { isActive: isGiochiSite } = useFormatActiveCheck('giochi', 'site');
  const { isActive: isGiochiApp } = useFormatActiveCheck('giochi', 'app');
  const { isActive: isFuroreSite } = useFormatActiveCheck('furore', 'site');
  const { isActive: isFuroreApp } = useFormatActiveCheck('furore', 'app');
  const { isActive: isOpenmicSite } = useFormatActiveCheck('openmic', 'site');
  const { isActive: isOpenmicApp } = useFormatActiveCheck('openmic', 'app');
  const { isActive: isDedicheSite } = useFormatActiveCheck('dediche', 'site');
  const { isActive: isDedicheApp } = useFormatActiveCheck('dediche', 'app');
  const { isActive: isCommunitySite } = useFormatActiveCheck('community', 'site');
  const { isActive: isCommunityApp } = useFormatActiveCheck('community', 'app');

  const items = [
    { to: "/app", icon: LayoutGrid, label: "Hub", end: true },
    (isOpenmicSite && isOpenmicApp) && { to: "/app/openmic", icon: Mic2, label: "Open Mic" },
    (isDedicheSite && isDedicheApp) && { to: "/app/dediche", icon: MessageCircle, label: "Dediche" },
    (isFuroreSite && isFuroreApp) && { to: "/app/furore", icon: Zap, label: "Furore" },
    (isGiochiSite && isGiochiApp) && { to: "/app/giochi", icon: Gamepad2, label: "Giochi" },
    (isCommunitySite && isCommunityApp) && { to: "/social", icon: Users, label: "Community" },
  ].filter(Boolean) as { to: string; icon: React.ElementType; label: string; end?: boolean }[];

  // Don't show if only hub would be visible
  if (items.length <= 1) return null;

  return (
    <nav className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/40">
      <div className="container">
        <div className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-hide">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground whitespace-nowrap transition-all shrink-0"
              activeClassName="bg-primary/10 text-primary"
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
