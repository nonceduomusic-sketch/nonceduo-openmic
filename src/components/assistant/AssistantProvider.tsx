import React from 'react';
import { useLocation } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';

// Map routes to sections
const getSectionFromPath = (pathname: string): 'site' | 'openmic' | 'dediche' | 'community' => {
  if (pathname.includes('/app/openmic') || pathname.includes('/openmic/live')) {
    return 'openmic';
  }
  if (pathname.includes('/app/dediche') || pathname.includes('/messaggi')) {
    return 'dediche';
  }
  if (pathname.includes('/social')) {
    return 'community';
  }
  // Admin pages - don't show widget
  if (pathname.includes('/admin')) {
    return 'site'; // Will be handled by not rendering
  }
  return 'site';
};

// Pages where we should NOT show the assistant
const excludedPaths = ['/admin', '/privacy', '/installa'];

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
