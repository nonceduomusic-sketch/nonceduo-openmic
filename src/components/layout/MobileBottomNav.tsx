import React, { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Mic2, MessageCircle, Users, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  matchPaths?: string[];
  activeClass?: string;
}

interface MobileBottomNavProps {
  variant?: 'main' | 'openmic' | 'community' | 'admin';
}

export const MobileBottomNav = forwardRef<HTMLElement, MobileBottomNavProps>(({ variant = 'main' }, ref) => {
  const location = useLocation();

  const mainNavItems: NavItem[] = [
    { 
      path: '/', 
      icon: <Home className="w-5 h-5" />, 
      label: 'Home', 
      matchPaths: ['/', '/partyband'],
      activeClass: 'text-primary'
    },
    { 
      path: '/openmic', 
      icon: <Mic2 className="w-5 h-5" />, 
      label: 'Open Mic', 
      matchPaths: ['/openmic'],
      activeClass: 'text-secondary'
    },
    { 
      path: '/messaggi', 
      icon: <MessageCircle className="w-5 h-5" />, 
      label: 'Dediche', 
      matchPaths: ['/messaggi'],
      activeClass: 'text-primary'
    },
    { 
      path: '/social', 
      icon: <Users className="w-5 h-5" />, 
      label: 'Community', 
      matchPaths: ['/social', '/social/auth', '/social/dashboard'],
      activeClass: 'text-accent'
    },
  ];

  const openmicNavItems: NavItem[] = [
    { 
      path: '/', 
      icon: <Home className="w-5 h-5" />, 
      label: 'Sito',
      activeClass: 'text-primary'
    },
    { 
      path: '/openmic', 
      icon: <Mic2 className="w-5 h-5" />, 
      label: 'Canzoni', 
      matchPaths: ['/openmic'],
      activeClass: 'text-secondary'
    },
    { 
      path: '/messaggi', 
      icon: <MessageCircle className="w-5 h-5" />, 
      label: 'Dediche', 
      matchPaths: ['/messaggi'],
      activeClass: 'text-primary'
    },
    { 
      path: '/admin', 
      icon: <Settings className="w-5 h-5" />, 
      label: 'Admin', 
      matchPaths: ['/admin'],
      activeClass: 'text-accent'
    },
  ];

  const communityNavItems: NavItem[] = [
    { 
      path: '/', 
      icon: <Home className="w-5 h-5" />, 
      label: 'Sito',
      activeClass: 'text-primary'
    },
    { 
      path: '/social/dashboard', 
      icon: <Users className="w-5 h-5" />, 
      label: 'Community', 
      matchPaths: ['/social/dashboard'],
      activeClass: 'text-accent'
    },
    { 
      path: '/openmic', 
      icon: <Mic2 className="w-5 h-5" />, 
      label: 'Open Mic', 
      matchPaths: ['/openmic'],
      activeClass: 'text-secondary'
    },
  ];

  const adminNavItems: NavItem[] = [
    { 
      path: '/', 
      icon: <Home className="w-5 h-5" />, 
      label: 'Sito',
      activeClass: 'text-primary'
    },
    { 
      path: '/openmic', 
      icon: <Mic2 className="w-5 h-5" />, 
      label: 'Open Mic',
      activeClass: 'text-secondary'
    },
    { 
      path: '/admin', 
      icon: <Shield className="w-5 h-5" />, 
      label: 'Admin', 
      matchPaths: ['/admin'],
      activeClass: 'text-accent'
    },
    { 
      path: '/social/dashboard', 
      icon: <Users className="w-5 h-5" />, 
      label: 'Community',
      activeClass: 'text-accent'
    },
  ];

  const getNavItems = () => {
    switch (variant) {
      case 'openmic':
        return openmicNavItems;
      case 'community':
        return communityNavItems;
      case 'admin':
        return adminNavItems;
      default:
        return mainNavItems;
    }
  };

  const navItems = getNavItems();

  const isActive = (item: NavItem) => {
    const paths = item.matchPaths || [item.path];
    return paths.some(path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));
  };

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/98 backdrop-blur-xl border-t border-border/80 safe-area-bottom shadow-lg shadow-background/50">
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all duration-200 relative group",
                active 
                  ? item.activeClass || "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <div className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full",
                  item.activeClass === 'text-secondary' ? 'bg-secondary' :
                  item.activeClass === 'text-accent' ? 'bg-accent' : 'bg-primary'
                )} />
              )}
              
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                active && cn(
                  "scale-110",
                  item.activeClass === 'text-secondary' ? 'bg-secondary/15' :
                  item.activeClass === 'text-accent' ? 'bg-accent/15' : 'bg-primary/15'
                ),
                !active && "group-hover:bg-muted/50"
              )}>
                {item.icon}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-all",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
