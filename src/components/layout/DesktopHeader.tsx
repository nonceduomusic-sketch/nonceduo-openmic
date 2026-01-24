import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mic2, Music, Users, Settings, Home, PartyPopper, MessageCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserLoginIndicator } from '@/components/UserLoginIndicator';

interface DesktopHeaderProps {
  variant?: 'main' | 'openmic' | 'community' | 'admin';
  showAdmin?: boolean;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ 
  variant = 'main',
  showAdmin = false 
}) => {
  const location = useLocation();

  const isActive = (path: string, matchPaths?: string[]) => {
    const paths = matchPaths || [path];
    return paths.some(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p)));
  };

  const NavButton: React.FC<{
    to: string;
    matchPaths?: string[];
    icon: React.ReactNode;
    label: string;
    activeClass?: string;
  }> = ({ to, matchPaths, icon, label, activeClass = 'neon-button-pink' }) => {
    const active = isActive(to, matchPaths);
    return (
      <Link to={to}>
        <Button 
          variant={active ? 'default' : 'ghost'} 
          size="sm"
          className={cn(
            "gap-1.5 transition-all duration-200",
            active && activeClass
          )}
        >
          {icon}
          {label}
        </Button>
      </Link>
    );
  };

  const renderMainNav = () => (
    <div className="flex items-center gap-1">
      <NavButton to="/" icon={<Home className="w-4 h-4" />} label="Home" />
      <NavButton to="/partyband" icon={<PartyPopper className="w-4 h-4" />} label="Party Band" />
      <NavButton 
        to="/openmic" 
        matchPaths={['/openmic']} 
        icon={<Mic2 className="w-4 h-4" />} 
        label="Open Mic"
        activeClass="neon-button-cyan"
      />
      <NavButton 
        to="/messaggi" 
        matchPaths={['/messaggi']} 
        icon={<MessageCircle className="w-4 h-4" />} 
        label="Dediche"
      />
      <NavButton 
        to="/social" 
        matchPaths={['/social', '/social/auth', '/social/dashboard']} 
        icon={<Users className="w-4 h-4" />} 
        label="Community"
        activeClass="bg-accent text-accent-foreground hover:bg-accent/90"
      />
    </div>
  );

  const renderOpenMicNav = () => (
    <div className="flex items-center gap-1">
      <NavButton to="/" icon={<Home className="w-4 h-4" />} label="Sito" />
      <NavButton 
        to="/openmic" 
        matchPaths={['/openmic']} 
        icon={<Mic2 className="w-4 h-4" />} 
        label="Canzoni"
        activeClass="neon-button-cyan"
      />
      <NavButton 
        to="/messaggi" 
        matchPaths={['/messaggi']} 
        icon={<MessageCircle className="w-4 h-4" />} 
        label="Dediche"
      />
    </div>
  );

  const renderCommunityNav = () => (
    <div className="flex items-center gap-1">
      <NavButton to="/" icon={<Home className="w-4 h-4" />} label="Sito" />
      <NavButton 
        to="/social/dashboard" 
        matchPaths={['/social/dashboard']} 
        icon={<Users className="w-4 h-4" />} 
        label="Community"
        activeClass="bg-accent text-accent-foreground hover:bg-accent/90"
      />
      <NavButton 
        to="/openmic" 
        matchPaths={['/openmic']} 
        icon={<Mic2 className="w-4 h-4" />} 
        label="Open Mic"
        activeClass="neon-button-cyan"
      />
    </div>
  );

  const renderAdminNav = () => (
    <div className="flex items-center gap-1">
      <NavButton to="/" icon={<Home className="w-4 h-4" />} label="Sito" />
      <NavButton 
        to="/openmic" 
        matchPaths={['/openmic']} 
        icon={<Mic2 className="w-4 h-4" />} 
        label="Open Mic"
        activeClass="neon-button-cyan"
      />
      <NavButton 
        to="/social/dashboard" 
        matchPaths={['/social/dashboard']} 
        icon={<Users className="w-4 h-4" />} 
        label="Community"
        activeClass="bg-accent text-accent-foreground hover:bg-accent/90"
      />
    </div>
  );

  const renderNav = () => {
    switch (variant) {
      case 'openmic':
        return renderOpenMicNav();
      case 'community':
        return renderCommunityNav();
      case 'admin':
        return renderAdminNav();
      default:
        return renderMainNav();
    }
  };

  const getSubtitle = () => {
    switch (variant) {
      case 'openmic':
        return 'Karaoke Live';
      case 'community':
        return 'Community';
      case 'admin':
        return 'Admin Panel';
      default:
        return 'Musica Live';
    }
  };

  const getIconGradient = () => {
    switch (variant) {
      case 'openmic':
        return 'from-secondary to-primary';
      case 'community':
        return 'from-accent to-primary';
      case 'admin':
        return 'from-accent to-secondary';
      default:
        return 'from-primary to-secondary';
    }
  };

  return (
    <header className="hidden md:flex sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="container py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className={cn(
            "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-105",
            getIconGradient()
          )}>
            {variant === 'admin' ? (
              <Shield className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Mic2 className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          <div>
            <h1 className="font-display text-lg font-bold neon-text-pink leading-tight tracking-tight">
              Non C'è Duo
            </h1>
            <p className="text-xs text-secondary font-semibold -mt-0.5 uppercase tracking-wider">
              {getSubtitle()}
            </p>
          </div>
        </Link>

        {/* Navigation */}
        {renderNav()}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {(variant === 'community' || variant === 'admin') && <UserLoginIndicator />}
          {showAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-xl">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
