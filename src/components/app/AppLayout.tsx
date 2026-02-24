import React from "react";
import { Outlet } from "react-router-dom";
import { AppFormatNav } from "@/components/app/AppFormatNav";

/**
 * Layout wrapper for all /app/* routes.
 * Provides consistent format navigation bar.
 */
export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppFormatNav />
      <Outlet />
    </div>
  );
};
