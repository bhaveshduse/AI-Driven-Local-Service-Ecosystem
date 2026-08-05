import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar,
  IndianRupee, 
  Star, 
  CheckCircle, 
  Plus,
  Briefcase,
  UserCog,
  XCircle,
  MapPin,
  Crosshair,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { RecentBookingsTable } from './components/RecentBookingsTable';
import { RecentReviewsList } from './components/RecentReviewsList';
import { VerificationStatus } from './VerificationStatus';
import { DocumentUploadForm } from './DocumentUploadForm';
import apiClient from '../../services/apiClient';

interface VendorStats {
  activeBookings: number;
  completedServices: number;
  totalRevenue: number;
  avgRating: number;
}

interface RecentBooking {
  _id: string;
  customer: {
    name: string;
  };
  service: {
    title: string;
  };
  scheduledDate: string;
  status: string;
  price: {
    amount: number;
  };
}

interface RecentReview {
  _id: string;
  customer: {
    name: string;
  };
  rating: {
    score: number;
    review: string;
  };
}

interface VendorInfo {
  verificationStatus: 'not-submitted' | 'pending' | 'verified' | 'rejected';
  adminNotes?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconContainerClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconContainerClass }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${iconContainerClass}`}>{icon}</div>
  </div>
);

const quickActions = [
  {
    title: 'View Bookings',
    description: 'Manage service requests',
    icon: <Calendar className="h-6 w-6" />,
    link: '/my-bookings',
    color: 'bg-green-600 hover:bg-green-700'
  },
  {
    title: 'My Services',
    description: 'Edit your service listings',
    icon: <Briefcase className="h-6 w-6" />,
    link: '/vendor/services',
    color: 'bg-indigo-600 hover:bg-indigo-700'
  },
  {
    title: 'Add Service',
    description: 'Create a new service listing',
    icon: <Plus className="h-6 w-6" />,
    link: '/vendor/services/new',
    color: 'bg-purple-600 hover:bg-purple-700'
  },
  {
    title: 'Manage Profile',
    description: 'Update your business details',
    icon: <UserCog className="h-6 w-6" />,
    link: '/vendor/profile',
    color: 'bg-sky-600 hover:bg-sky-700'
  }
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const VendorDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [autoDetectedCoords, setAutoDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [autoCheckDone, setAutoCheckDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendorProfile = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await apiClient.get('/vendors/profile');
      setVendorProfile(data);
    } catch { /* non-critical */ }
  }, [token]);

  const fetchDashboardData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get('/vendors/dashboard-stats');
      setStats(data.stats);
      setRecentBookings(data.recentBookings || []);
      setRecentReviews(data.recentReviews || []);
      setVendorInfo(data.vendor);
    } catch {
      setError('We couldn\'t load your dashboard data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleSetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported.');
      return;
    }
    setIsSettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const formData = new FormData();
          formData.append('workingLocation', JSON.stringify({
            coordinates: [pos.coords.longitude, pos.coords.latitude]
          }));
          const { data } = await apiClient.put('/vendors/profile', formData);
          setVendorProfile(data);
          toast.success('Current location updated!');
        } catch {
          toast.error('Failed to save location.');
        } finally {
          setIsSettingLocation(false);
        }
      },
      () => {
        toast.error('Could not detect location. Make sure GPS is enabled.');
        setIsSettingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchVendorProfile();
    fetchDashboardData();
  }, [fetchVendorProfile, fetchDashboardData]);

  // Auto-detect if vendor's current GPS location differs from their registered address
  useEffect(() => {
    if (!vendorProfile || autoCheckDone) return;
    const wl = vendorProfile.workingLocation?.coordinates;
    const base = vendorProfile.user?.address?.coordinates;
    // Only auto-check when there's a base address and no workingLocation is set
    if (!wl && base && base.length === 2) {
      const tryAutoDetect = async () => {
        // Check if permission was previously granted (avoids triggering a prompt)
        let permission = 'prompt';
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          permission = status.state;
        } catch { /* permissions API not supported */ }
        if (permission !== 'granted') return;

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const dist = haversineKm(base[1], base[0], gps.lat, gps.lng);
            if (dist > 1) {
              setAutoDetectedCoords(gps);
            }
            setAutoCheckDone(true);
          },
          () => setAutoCheckDone(true),
          { timeout: 5000 }
        );
      };
      tryAutoDetect();
    } else {
      setAutoCheckDone(true);
    }
  }, [vendorProfile, autoCheckDone]);

  const handleSaveAutoDetected = () => {
    if (!autoDetectedCoords) return;
    setIsSettingLocation(true);
    (async () => {
      try {
        const formData = new FormData();
        formData.append('workingLocation', JSON.stringify({
          coordinates: [autoDetectedCoords.lng, autoDetectedCoords.lat]
        }));
        const { data } = await apiClient.put('/vendors/profile', formData);
        setVendorProfile(data);
        setAutoDetectedCoords(null);
        toast.success('Current location updated!');
      } catch {
        toast.error('Failed to save location.');
      } finally {
        setIsSettingLocation(false);
      }
    })();
  };

  // Determine location banner state
  const locationBanner = (() => {
    if (!vendorProfile || dismissedBanner) return null;

    // Auto-detected GPS differs from base
    if (autoDetectedCoords) {
      const base = vendorProfile.user?.address?.coordinates;
      if (base && base.length === 2) {
        const dist = haversineKm(base[1], base[0], autoDetectedCoords.lat, autoDetectedCoords.lng);
        return { type: 'warning' as const, message: `You appear to be ${dist.toFixed(1)} km from your registered address. Update your working location?`, isAuto: true };
      }
    }

    const wl = vendorProfile.workingLocation?.coordinates;
    const base = vendorProfile.user?.address?.coordinates;
    if (!wl) {
      return { type: 'info' as const, message: 'Set your current working location so customers get accurate travel estimates.' };
    }
    if (base && base.length === 2 && wl.length === 2) {
      const dist = haversineKm(base[1], base[0], wl[1], wl[0]);
      if (dist > 1) {
        return { type: 'warning' as const, message: `Your current location is ${dist.toFixed(1)} km from your registered address. Update it?` };
      }
    }
    return null;
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!vendorInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <UserCog className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Complete Your Profile
          </h2>
          <p className="text-gray-600 mb-6">
            It looks like your vendor profile isn't fully set up. Please
            complete your business information to access the dashboard.
          </p>
          <Link
            to="/vendor/profile"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (vendorInfo.verificationStatus !== 'verified') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome, {user?.name}!
            </h1>
            <p className="text-gray-600">
              Your account is almost ready. Please complete your verification to access the full dashboard.
            </p>
          </div>
          <VerificationStatus vendor={vendorInfo} onUploadClick={() => setIsUploadModalOpen(true)} />
          {isUploadModalOpen && (
            <DocumentUploadForm onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { setIsUploadModalOpen(false); fetchDashboardData(); }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Manage your services and track your business performance
          </p>
        </div>

        {/* Location Banner */}
        {locationBanner && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${
            locationBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              {locationBanner.message}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={isSettingLocation}
                onClick={locationBanner.isAuto ? handleSaveAutoDetected : handleSetCurrentLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white border shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {isSettingLocation ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crosshair className="h-3.5 w-3.5" />
                )}
                {isSettingLocation ? 'Saving...' : locationBanner.isAuto ? 'Use Current Location' : 'Update Location'}
              </button>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="p-1 rounded hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Active Bookings" value={stats?.activeBookings?.toString() ?? '0'} icon={<Calendar className="h-6 w-6 text-blue-600" />} iconContainerClass="bg-blue-100" />
          <StatCard title="Total Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`} icon={<IndianRupee className="h-6 w-6 text-green-600" />} iconContainerClass="bg-green-100" />
          <StatCard title="Completed Services" value={stats?.completedServices?.toString() ?? '0'} icon={<CheckCircle className="h-6 w-6 text-purple-600" />} iconContainerClass="bg-purple-100" />
          <StatCard title="Average Rating" value={stats?.avgRating?.toFixed(1) ?? 'N/A'} icon={<Star className="h-6 w-6 text-yellow-600" />} iconContainerClass="bg-yellow-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <QuickActionsGrid actions={quickActions} />
            <RecentBookingsTable bookings={recentBookings} />
          </div>
          <RecentReviewsList reviews={recentReviews} />
        </div>
      </div>
    </div>
  );
};