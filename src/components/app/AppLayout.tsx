import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Layout wrapper for all /app/* routes.
 * Navigation is handled by PageLayout (DesktopHeader + MobileBottomNav)
 * inside each page — no extra nav bar needed here.
 */
export const AppLayout: React.FC = () => {
  return <Outlet />;
};
