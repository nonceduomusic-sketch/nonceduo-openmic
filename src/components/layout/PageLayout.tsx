import React from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { DesktopHeader } from './DesktopHeader';
import { cn } from '@/lib/utils';
import { useStaffRole } from '@/hooks/useStaffRole';

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
  hideDesktopHeader?: boolean;
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
  hideDesktopHeader = false,
  className
}) => {
  const { isStaff } = useStaffRole();
  const effectiveShowAdmin = showAdmin && isStaff;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Header */}
      {!hideDesktopHeader && <DesktopHeader variant={variant} showAdmin={effectiveShowAdmin} />}
      
      {/* Mobile Header - also shown on desktop when DesktopHeader is hidden */}
      <div className={cn(!hideDesktopHeader && "md:hidden")}>
        <MobileHeader 
          title={title}
          subtitle={subtitle}
          variant={variant}
          showBack={showBack}
          backPath={backPath}
          showAdmin={effectiveShowAdmin}
          rightContent={rightContent}
        />
      </div>
      
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
