import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, User, LogOut, Menu, X, Wrench } from 'lucide-react';
import clsx from 'clsx';
import ProfileDropdown from './ProfileDropdown';
import Avatar from './Avatar';
import { getImageUrl } from '../utils/helpers';

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  isMobile?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, children, icon, onClick, isMobile }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const baseClasses = 'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1';
  const mobileClasses = 'text-base space-x-2';

  const activeClasses = 'text-blue-600 bg-blue-50';
  const inactiveClasses = 'text-gray-600 hover:text-blue-600 hover:bg-blue-50';

  return (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        baseClasses,
        isMobile ? mobileClasses : 'space-x-1',
        isActive ? activeClasses : inactiveClasses
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
};

interface UserMenuProps {
  user: { name: string; role: string; avatar?: string; };
  onLogout: () => void;
}

const MobileUserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2 px-3 py-2">
        <Avatar src={getImageUrl(user.avatar)} name={user.name} className="h-8 w-8" />
        <div>
          <p className="text-base font-medium text-gray-800">{user.name}</p>
          <p className="text-sm text-gray-500 capitalize">{user.role}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </button>
    </div>
  );
};


interface GuestMenuProps {
  onLinkClick?: () => void;
}

const GuestMenu: React.FC<GuestMenuProps> = ({ onLinkClick }) => (
  <div className="flex items-center space-x-4">
    <Link to="/login" onClick={onLinkClick} className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
      Login
    </Link>
    <Link to="/register" onClick={onLinkClick} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
      Sign Up
    </Link>
  </div>
);

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const dashboardPath = useMemo(() => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'vendor':
        return '/vendor-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/dashboard';
    }
  }, [user]);

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home className="h-4 w-4" />, auth: 'any' },
    { to: '/services', label: 'Services', auth: 'any' },
    { to: dashboardPath, label: 'Dashboard', auth: true },
    { to: '/my-bookings', label: 'My Bookings', auth: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16" >
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Swayam</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map(link => {
              if (link.auth === 'any' || (link.auth === true && user)) {
                return (
                  <NavItem key={link.to} to={link.to} icon={link.icon}>
                    {link.label}
                  </NavItem>
                );
              }
              return null;
            })}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <ProfileDropdown />
            ) : (
              <GuestMenu />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
              {navLinks.map(link => {
                if (link.auth === 'any' || (link.auth === true && user)) {
                  return (
                    <NavItem key={`mobile-${link.to}`} to={link.to} icon={link.icon} onClick={() => setIsMenuOpen(false)} isMobile>
                      {link.label}
                    </NavItem>
                  );
                }
                return null;
              })}

              <div className="border-t border-gray-200 pt-3 mt-3">
                {user ? (
                  <MobileUserMenu user={user} onLogout={handleLogout} />
                ) : (
                  // The mobile GuestMenu needs different styling and behavior, so we can't reuse the desktop one directly.
                  // A more advanced GuestMenu could handle this, but for now, this is clear.
                  <GuestMenu onLinkClick={() => setIsMenuOpen(false)} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};