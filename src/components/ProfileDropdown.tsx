import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, LogOut, LayoutDashboard, UserCog, Shield, Upload, Loader2 } from 'lucide-react';
import Avatar from './Avatar';
import { getImageUrl } from '../utils/helpers';
import apiClient from '../services/apiClient';
import { toast } from 'react-hot-toast';

const ProfileDropdown: React.FC = () => {
  const { user, logout, token, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file || !token) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading avatar...');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data: updatedUser } = await apiClient.put('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      updateUser(updatedUser); // Update context
      toast.success('Avatar updated successfully!', { id: toastId });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || 'Failed to upload avatar.', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) {
    return null;
  }

  // All roles have an account settings page now.
  const settingsLink = "/account-settings";

  const getDashboardLink = () => {
    switch (user.role) {
      case 'vendor':
        return '/vendor-dashboard';
      case 'customer':
        return '/dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/';
    }
  };

  const getRoleIcon = () => {
    switch (user.role) {
      case 'vendor':
        return <UserCog className="mr-2 h-4 w-4" />;
      case 'admin':
        return <Shield className="mr-2 h-4 w-4" />;
      default:
        return <LayoutDashboard className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="sr-only">Open user menu</span>
        <div className="relative">
          <Avatar src={getImageUrl((user as any).avatar)} name={user.name} className="h-8 w-8" />
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            </div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
            <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
              {getRoleIcon()} Dashboard
            </Link>
            <Link to={settingsLink} onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
              <UserIcon className="mr-2 h-4 w-4" /> Account Settings
            </Link>
            {/* Only show Avatar upload for roles that have a profile page */}
            {(user.role === 'customer' || user.role === 'vendor') && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                role="menuitem"
              >
                <Upload className="mr-2 h-4 w-4" /> Change Avatar
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
            <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;