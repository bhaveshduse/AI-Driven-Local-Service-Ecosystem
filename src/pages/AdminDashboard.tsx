import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';

export const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    monthlyBookings: []
  });

  const quickStats = [
    {
      title: 'Total Customers',
      value: analytics.totalUsers.toLocaleString(),
      icon: <Users className="h-8 w-8" />,
      color: 'bg-blue-600',
      change: '+12%'
    },
    {
      title: 'Active Vendors',
      value: analytics.totalVendors.toLocaleString(),
      icon: <UserCheck className="h-8 w-8" />,
      color: 'bg-green-600',
      change: '+8%'
    },
    {
      title: 'Total Bookings',
      value: analytics.totalBookings.toLocaleString(),
      icon: <Calendar className="h-8 w-8" />,
      color: 'bg-purple-600',
      change: '+25%'
    },
    {
      title: 'Platform Revenue',
      value: `$${(analytics.totalRevenue / 1000).toFixed(1)}k`,
      icon: <DollarSign className="h-8 w-8" />,
      color: 'bg-orange-600',
      change: '+18%'
    }
  ];

  const recentActivities = [
    {
      type: 'user',
      message: 'New customer registered: John Smith',
      time: '5 minutes ago',
      status: 'success'
    },
    {
      type: 'vendor',
      message: 'Vendor verification pending: Clean Pro Services',
      time: '15 minutes ago',
      status: 'warning'
    },
    {
      type: 'booking',
      message: 'Booking completed: Plumbing service in Downtown',
      time: '1 hour ago',
      status: 'success'
    },
    {
      type: 'dispute',
      message: 'Dispute reported for booking #1234',
      time: '2 hours ago',
      status: 'error'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="h-5 w-5" />;
      case 'vendor':
        return <UserCheck className="h-5 w-5" />;
      case 'booking':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor platform performance and manage users</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-sm text-green-600 font-medium mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full text-white`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Platform Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Platform Overview</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {((analytics.completedBookings / analytics.totalBookings) * 100 || 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">4.8</div>
                  <p className="text-sm text-gray-600">Avg Platform Rating</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
                  <p className="text-sm text-gray-600">Vendor Verification</p>
                </div>
              </div>
            </div>

            {/* Management Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Management</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <button className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">Manage Users</p>
                      <p className="text-sm text-gray-500">View all customers</p>
                    </div>
                  </div>
                  <span className="text-blue-600">→</span>
                </button>

                <button className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">Manage Vendors</p>
                      <p className="text-sm text-gray-500">Verify providers</p>
                    </div>
                  </div>
                  <span className="text-green-600">→</span>
                </button>

                <button className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">View Bookings</p>
                      <p className="text-sm text-gray-500">Monitor services</p>
                    </div>
                  </div>
                  <span className="text-purple-600">→</span>
                </button>

                <button className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">Analytics</p>
                      <p className="text-sm text-gray-500">Detailed reports</p>
                    </div>
                  </div>
                  <span className="text-orange-600">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${getStatusColor(activity.status)}`}>
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Activities
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};