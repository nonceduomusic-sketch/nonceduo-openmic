import React from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { DesktopHeader } from './DesktopHeader';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  variant?: 'main' | 'openmic' | 'community' | 'admin';
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backPath?: string;
  showAdmin?: boolean;
  rightContent?: React.ReactNode;
  hideBottomNav?: boolean;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  variant = 'main',
  title,
  subtitle,
  showBack = false,
  backPath,
  showAdmin = false,
  rightContent,
  hideBottomNav = false,
  className
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Header */}
      <DesktopHeader variant={variant} showAdmin={showAdmin} />
      
      {/* Mobile Header */}
      <MobileHeader 
        title={title}
        subtitle={subtitle}
        variant={variant}
        showBack={showBack}
        backPath={backPath}
        showAdmin={showAdmin}
        rightContent={rightContent}
      />
      
      {/* Main Content - with padding for bottom nav on mobile */}
      <main className={cn(
        "flex-1",
        !hideBottomNav && "pb-20 md:pb-0",
        className
      )}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {!hideBottomNav && <MobileBottomNav variant={variant} />}
    </div>
  );
};
