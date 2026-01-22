import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mic2, Music, Users, Settings, Home } from 'lucide-react';
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

  const renderMainNav = () => (
    <div className="flex items-center gap-2">
      <Link to="/">
        <Button 
          variant={isActive('/') ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/') && 'neon-button-pink')}
        >
          <Home className="w-4 h-4 mr-1.5" />
          Home
        </Button>
      </Link>
      <Link to="/partyband">
        <Button 
          variant={isActive('/partyband') ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/partyband') && 'neon-button-pink')}
        >
          <Music className="w-4 h-4 mr-1.5" />
          Party Band
        </Button>
      </Link>
      <Link to="/openmic">
        <Button 
          variant={isActive('/openmic', ['/openmic', '/messaggi']) ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/openmic', ['/openmic', '/messaggi']) && 'neon-button-cyan')}
        >
          <Mic2 className="w-4 h-4 mr-1.5" />
          Open Mic
        </Button>
      </Link>
      <Link to="/social">
        <Button 
          variant={isActive('/social', ['/social', '/social/auth', '/social/dashboard']) ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/social', ['/social', '/social/auth', '/social/dashboard']) && 'bg-accent text-accent-foreground')}
        >
          <Users className="w-4 h-4 mr-1.5" />
          Community
        </Button>
      </Link>
    </div>
  );

  const renderOpenMicNav = () => (
    <div className="flex items-center gap-2">
      <Link to="/">
        <Button variant="ghost" size="sm">
          <Home className="w-4 h-4 mr-1.5" />
          Sito
        </Button>
      </Link>
      <Link to="/openmic">
        <Button 
          variant={isActive('/openmic') ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/openmic') && 'neon-button-cyan')}
        >
          <Mic2 className="w-4 h-4 mr-1.5" />
          Canzoni
        </Button>
      </Link>
      <Link to="/messaggi">
        <Button 
          variant={isActive('/messaggi') ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/messaggi') && 'neon-button-pink')}
        >
          <Users className="w-4 h-4 mr-1.5" />
          Dediche
        </Button>
      </Link>
    </div>
  );

  const renderCommunityNav = () => (
    <div className="flex items-center gap-2">
      <Link to="/">
        <Button variant="ghost" size="sm">
          <Home className="w-4 h-4 mr-1.5" />
          Sito
        </Button>
      </Link>
      <Link to="/social/dashboard">
        <Button 
          variant={isActive('/social/dashboard') ? 'default' : 'ghost'} 
          size="sm"
          className={cn(isActive('/social/dashboard') && 'bg-accent text-accent-foreground')}
        >
          <Users className="w-4 h-4 mr-1.5" />
          Community
        </Button>
      </Link>
    </div>
  );

  const renderNav = () => {
    switch (variant) {
      case 'openmic':
        return renderOpenMicNav();
      case 'community':
        return renderCommunityNav();
      case 'admin':
        return renderMainNav();
      default:
        return renderMainNav();
    }
  };

  return (
    <header className="hidden md:flex sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
            <Mic2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold neon-text-pink leading-tight">
              Non C'è Duo
            </h1>
            <p className="text-xs text-secondary font-medium -mt-0.5">
              {variant === 'openmic' ? 'Open Mic' : variant === 'community' ? 'Community' : 'Musica Live'}
            </p>
          </div>
        </Link>

        {/* Navigation */}
        {renderNav()}

        {/* Right side */}
        <div className="flex items-center gap-2">
          <UserLoginIndicator />
          {showAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
