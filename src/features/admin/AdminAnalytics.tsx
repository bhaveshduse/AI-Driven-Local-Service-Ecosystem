import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Download, Users, UserCheck, Calendar, IndianRupee, 
  Star, MessageSquare, Loader2, TrendingUp 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { CSVLink } from 'react-csv';
import { RecentReviewsList } from '../vendor/components/RecentReviewsList';

// --- Types ---
interface RevenueData {
  category: string;
  totalRevenue: number;
  bookingCount: number;
}

interface RecentReview {
  _id: string;
  customer: { name: string };
  rating: { score: number; review: string };
}

interface AnalyticsData {
  totalUsers: number;
  totalVendors: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyBookings: { _id: { year: number, month: number }, count: number }[];
  revenueByCategory: RevenueData[];
  recentReviews: RecentReview[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- Helpers ---
const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-blue-600">{`Revenue: ${formatCurrency(payload[0].value)}`}</p>
        {payload[0].payload.bookingCount && (
          <p className="text-gray-600 text-xs">{`Bookings: ${payload[0].payload.bookingCount}`}</p>
        )}
      </div>
    );
  }
  return null;
};

export const AdminAnalytics: React.FC = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      toast.error('Could not load analytics data.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAnalyticsData(); }, [fetchAnalyticsData]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-500 font-medium">Generating platform insights...</p>
    </div>
  );

  if (!analytics) return <div className="p-8 text-center text-red-500">Error loading data.</div>;

  // Format data for Recharts
  const bookingTrends = analytics.monthlyBookings.map(item => ({
    name: `${monthNames[item._id.month - 1]}`,
    count: item.count
  }));

  const revenueData = analytics.revenueByCategory.map(item => ({
    ...item,
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1).replace('-', ' ')
  }));

  const csvHeaders = [
    { label: "Category", key: "name" },
    { label: "Total Revenue (INR)", key: "totalRevenue" },
    { label: "Booking Count", key: "bookingCount" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Insights</h1>
            <p className="text-gray-500">Monitor platform growth and service performance</p>
          </div>
          <CSVLink
            data={revenueData}
            headers={csvHeaders}
            filename={"swayam_revenue_by_category.csv"}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md"
            target="_blank"
          >
            <Download size={18} /> Export CSV
          </CSVLink>
        </div>

        {/* 1. Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Customers" value={analytics.totalUsers} icon={<Users />} color="bg-blue-100 text-blue-600" />
          <StatCard title="Active Vendors" value={analytics.totalVendors} icon={<UserCheck />} color="bg-green-100 text-green-600" />
          <StatCard title="Total Bookings" value={analytics.totalBookings} icon={<Calendar />} color="bg-purple-100 text-purple-600" />
          <StatCard title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} icon={<IndianRupee />} color="bg-orange-100 text-orange-600" />
        </div>

        {/* 2. Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Revenue by Category - Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue by Category</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${v/1000}k`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Booking Trends - Line Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-500" /> Monthly Bookings
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3. Bottom Row: Distribution & Recent Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pie Chart: Distribution */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Booking Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueData} dataKey="bookingCount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {revenueData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Reviews List */}
          <div className="lg:col-span-2">
            {/* Use the existing RecentReviewsList component for a consistent look and feel */}
            <RecentReviewsList reviews={analytics.recentReviews || []} />
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---
const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`${color} p-4 rounded-xl`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  </div>
);