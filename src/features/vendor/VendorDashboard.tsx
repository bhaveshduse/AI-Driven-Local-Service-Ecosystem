import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar,
  IndianRupee, 
  Star, 
  CheckCircle, 
  Plus, 
  AlertCircle,
  Briefcase,
  UserCog,
  XCircle
} from 'lucide-react';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { RecentBookingsTable } from './components/RecentBookingsTable';
import { RecentReviewsList } from './components/RecentReviewsList';

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

export const VendorDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/vendors/dashboard-stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setStats(data.stats);
        setRecentBookings(data.recentBookings || []);
        setRecentReviews(data.recentReviews || []); // Safely set to empty array if undefined
      } catch (err: any) {
        setError('We couldn\'t load your dashboard data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [token]);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Verification Status Banner */}
        {user?.role === 'vendor' && !user.isVerified && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Your account is <span className="font-bold">pending verification</span>. 
                  You will not be able to create services and your profile will not be visible to customers until an admin approves your account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Manage your services and track your business performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Active Bookings" value={stats?.activeBookings?.toString() ?? '0'} icon={<Calendar className="h-6 w-6 text-blue-600" />} iconContainerClass="bg-blue-100" />
          <StatCard title="Total Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`} icon={<IndianRupee className="h-6 w-6 text-green-600" />} iconContainerClass="bg-green-100" />
          <StatCard title="Completed Services" value={stats?.completedServices?.toString() ?? '0'} icon={<CheckCircle className="h-6 w-6 text-purple-600" />} iconContainerClass="bg-purple-100" />
          <StatCard title="Average Rating" value={stats?.avgRating?.toFixed(1) ?? 'N/A'} icon={<Star className="h-6 w-6 text-yellow-600" />} iconContainerClass="bg-yellow-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions & Recent Bookings */}
          <div className="lg:col-span-2">
            <QuickActionsGrid actions={quickActions} />
            {/* Recent Bookings */}
            <RecentBookingsTable bookings={recentBookings} />
          </div>

          {/* Recent Reviews */}
          <RecentReviewsList reviews={recentReviews} />
        </div>
      </div>
    </div>
  );
};