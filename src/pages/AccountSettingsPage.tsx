import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ProfilePage from '../components/ProfilePage'; // This is the customer's settings page
import { VendorProfile } from '../features/vendor/VendorProfile';
import AdminSettingsPage from '../features/admin/AdminSettingsPage';

const AccountSettingsPage = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'customer':
      return <ProfilePage />;
    case 'vendor':
      return <VendorProfile />;
    case 'admin':
      return <AdminSettingsPage />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default AccountSettingsPage;