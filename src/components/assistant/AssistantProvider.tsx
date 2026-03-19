import React from 'react';
import { useLocation } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';

// Map routes to sections
const getSectionFromPath = (pathname: string): 'site' | 'app' | 'openmic' | 'dediche' | 'community' | 'giochi' | 'furore' => {
  // App launcher
  if (pathname === '/app') return 'app';
  // Furore
  if (pathname.startsWith('/app/furore')) return 'furore';
  // Giochi
  if (pathname.startsWith('/app/giochi')) return 'giochi';
  // Open Mic: app + legacy live
  if (pathname.includes('/app/openmic') || pathname.includes('/openmic/live')) return 'openmic';
  // Dediche: app + legacy live
  if (pathname.includes('/app/dediche') || pathname.includes('/messaggi/live')) return 'dediche';
  // Open Mic pages (info + participation)
  if (pathname.startsWith('/openmic')) return 'openmic';
  // Dediche pages (info + participation)
  if (pathname.startsWith('/messaggi')) return 'dediche';
  // Community
  if (pathname.includes('/social')) return 'community';
  // Admin pages - don't show widget
  if (pathname.includes('/admin')) return 'site';
  return 'site';
};

// Pages where we should NOT show the assistant
const excludedPaths = ['/admin', '/privacy', '/installa', '/trasmetti', '/tv', '/lyrics', '/telecomando', '/furore-remote', '/songbook-live', '/partiture', '/promo'];

export const AssistantProvider: React.FC = () => {
  const location = useLocation();
  
  // Check if we should show the assistant on this page
  const shouldShow = !excludedPaths.some(path => location.pathname.startsWith(path));
  
  if (!shouldShow) {
    return null;
  }
  
  const section = getSectionFromPath(location.pathname);
  
  return <AssistantWidget section={section} />;
};

export default AssistantProvider;
