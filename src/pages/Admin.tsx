import React from 'react';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';

const AdminContent: React.FC = () => {
  const { isLoggedIn } = useAdmin();

  if (!isLoggedIn) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
};

const Admin: React.FC = () => {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
};

export default Admin;
