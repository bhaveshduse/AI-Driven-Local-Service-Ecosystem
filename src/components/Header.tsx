import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfileDropdown from './ProfileDropdown';

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              Bolt
            </Link>
            <div className="hidden md:flex items-center space-x-4">
                <Link to="/services" className="text-gray-600 hover:text-blue-600 font-medium">
                Services
                </Link>
                {/* You can add other navigation links here */}
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <ProfileDropdown />
            ) : (
              <div className="space-x-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600">
                  Log In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};