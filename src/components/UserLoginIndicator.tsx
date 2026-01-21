import React from 'react';
import { Link } from 'react-router-dom';
import { useSocialAuth } from '@/contexts/SocialAuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, LayoutDashboard, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserLoginIndicatorProps {
  showOnlyWhenLoggedIn?: boolean;
  compact?: boolean;
}

export const UserLoginIndicator: React.FC<UserLoginIndicatorProps> = ({ 
  showOnlyWhenLoggedIn = false,
  compact = false 
}) => {
  const { isLoggedIn, profile, logout, isLoading } = useSocialAuth();

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    if (showOnlyWhenLoggedIn) return null;
    
    return (
      <Link to="/social/auth">
        <Button variant="outline" size="sm" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Accedi</span>
        </Button>
      </Link>
    );
  }

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (compact) {
    return (
      <Link to="/social/dashboard">
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors">
          <div className="relative">
            <Avatar className="w-6 h-6 border border-primary/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {getInitials(profile?.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <span className="text-xs font-medium text-primary hidden sm:inline max-w-[80px] truncate">
            {profile?.display_name?.split(' ')[0] || 'Utente'}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors outline-none">
          <div className="relative">
            <Avatar className="w-7 h-7 border border-primary/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {getInitials(profile?.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
              {profile?.display_name || 'Utente'}
            </span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-500/50 text-green-500">
              Online
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 border-b border-border mb-1">
          <p className="text-sm font-medium truncate">{profile?.display_name}</p>
          <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
        </div>
        <DropdownMenuItem asChild>
          <Link to="/social/dashboard" className="cursor-pointer">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/social/dashboard" className="cursor-pointer" onClick={() => {
            // This will navigate and the dashboard will handle showing profile tab
          }}>
            <User className="w-4 h-4 mr-2" />
            Il mio profilo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={logout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
