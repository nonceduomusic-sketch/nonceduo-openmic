import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Mic2, MessageCircle, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  matchPaths?: string[];
}

interface MobileBottomNavProps {
  variant?: 'main' | 'openmic' | 'community' | 'admin';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ variant = 'main' }) => {
  const location = useLocation();

  const mainNavItems: NavItem[] = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Home', matchPaths: ['/', '/partyband'] },
    { path: '/openmic', icon: <Mic2 className="w-5 h-5" />, label: 'Open Mic', matchPaths: ['/openmic', '/messaggi'] },
    { path: '/social', icon: <Users className="w-5 h-5" />, label: 'Community', matchPaths: ['/social', '/social/auth', '/social/dashboard'] },
  ];

  const openmicNavItems: NavItem[] = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Sito' },
    { path: '/openmic', icon: <Mic2 className="w-5 h-5" />, label: 'Canzoni', matchPaths: ['/openmic'] },
    { path: '/messaggi', icon: <MessageCircle className="w-5 h-5" />, label: 'Dediche', matchPaths: ['/messaggi'] },
  ];

  const communityNavItems: NavItem[] = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Sito' },
    { path: '/social/dashboard', icon: <Users className="w-5 h-5" />, label: 'Community', matchPaths: ['/social/dashboard'] },
  ];

  const adminNavItems: NavItem[] = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Sito' },
    { path: '/admin', icon: <Settings className="w-5 h-5" />, label: 'Admin', matchPaths: ['/admin'] },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                active && "bg-primary/20 neon-glow-pink"
              )}>
                {item.icon}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5",
                active && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
