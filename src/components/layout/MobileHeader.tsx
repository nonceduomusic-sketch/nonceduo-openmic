import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic2, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserLoginIndicator } from '@/components/UserLoginIndicator';

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
        return 'Open Mic';
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
      default:
        return 'text-secondary';
    }
  };

  return (
    <header className="sticky top-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-3">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
                <Mic2 className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
          )}
          <div className="leading-tight">
            <h1 className="font-display text-base font-bold neon-text-pink">
              {title}
            </h1>
            <p className={`text-[10px] font-medium ${getAccentClass()} -mt-0.5`}>
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {rightContent}
          <UserLoginIndicator />
          {showAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
