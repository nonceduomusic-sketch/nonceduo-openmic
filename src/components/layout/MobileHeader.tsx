import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic2, ArrowLeft, Settings, Shield, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserLoginIndicator } from '@/components/UserLoginIndicator';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  variant?: 'main' | 'openmic' | 'community' | 'admin';
  showBack?: boolean;
  backPath?: string;
  showAdmin?: boolean;
  rightContent?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title = "Non C'è Duo",
  subtitle,
  variant = 'main',
  showBack = false,
  backPath,
  showAdmin = false,
  rightContent
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    switch (variant) {
      case 'openmic':
        return 'Karaoke Live';
      case 'community':
        return 'Community';
      case 'admin':
        return 'Pannello Admin';
      default:
        return 'Musica Live';
    }
  };

  const getAccentClass = () => {
    switch (variant) {
      case 'openmic':
        return 'text-secondary';
      case 'community':
        return 'text-accent';
      case 'admin':
        return 'text-accent';
      default:
        return 'text-secondary';
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

  const getIcon = () => {
    switch (variant) {
      case 'admin':
        return <Shield className="w-4 h-4 text-primary-foreground" />;
      case 'community':
        return <Music className="w-4 h-4 text-primary-foreground" />;
      default:
        return <Mic2 className="w-4 h-4 text-primary-foreground" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 md:hidden bg-card/98 backdrop-blur-xl border-b border-border/50 safe-area-top shadow-sm">
      <div className="flex items-center justify-between h-14 px-3">
        {/* Left side */}
        <div className="flex items-center gap-2.5">
          {showBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-9 w-9 rounded-xl hover:bg-muted/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Link to="/" className="flex items-center gap-2.5">
              <div className={cn(
                "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                getIconGradient()
              )}>
                {getIcon()}
              </div>
            </Link>
          )}
          <div className="leading-tight">
            <h1 className="font-display text-base font-bold neon-text-pink tracking-tight">
              {title}
            </h1>
            <p className={cn("text-[10px] font-semibold -mt-0.5 uppercase tracking-wider", getAccentClass())}>
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {rightContent}
          <UserLoginIndicator />
          {showAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
