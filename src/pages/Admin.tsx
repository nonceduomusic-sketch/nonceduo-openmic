import React, { forwardRef } from 'react';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';
import { RefreshCw } from 'lucide-react';

const AdminContent = forwardRef<HTMLDivElement>((_, ref) => {
  const { isLoggedIn, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div ref={ref} className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLogin ref={ref} />;
  }

  return <AdminDashboard />;
});

AdminContent.displayName = 'AdminContent';

const Admin: React.FC = () => {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
};

export default Admin;
