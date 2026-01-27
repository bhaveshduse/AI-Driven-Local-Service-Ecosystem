import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  DollarSign, 
  Star, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Settings,
  TrendingUp
} from 'lucide-react';

export const VendorDashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Manage Profile',
      description: 'Update your business info',
      icon: <Settings className="h-6 w-6" />,
      link: '/vendor-profile',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'View Bookings',
      description: 'Manage service requests',
      icon: <Calendar className="h-6 w-6" />,
      link: '/my-bookings',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Add Service',
      description: 'List new services',
      icon: <Plus className="h-6 w-6" />,
      link: '/vendor-profile',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  const recentBookings = [
    {
      id: 1,
      customer: 'John Smith',
      service: 'Plumbing Repair',
      date: 'Today, 2:00 PM',
      status: 'confirmed',
      amount: 120
    },
    {
      id: 2,
      customer: 'Sarah Wilson',
      service: 'Kitchen Installation',
      date: 'Tomorrow, 10:00 AM',
      status: 'pending',
      amount: 450
    },
    {
      id: 3,
      customer: 'Mike Johnson',
      service: 'Bathroom Renovation',
      date: 'Mar 20, 9:00 AM',
      status: 'completed',
      amount: 890
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                <p className="text-3xl font-bold text-gray-800">8</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">This Month Earnings</p>
                <p className="text-3xl font-bold text-gray-800">$2,450</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed Jobs</p>
                <p className="text-3xl font-bold text-gray-800">34</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-3xl font-bold text-gray-800">4.9</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.link}
                    className={`${action.color} text-white p-6 rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-1 group`}
                  >
                    <div className="flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {action.icon}
                    </div>
                    <h3 className="font-semibold text-center mb-2">{action.title}</h3>
                    <p className="text-sm opacity-90 text-center">{action.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Recent Bookings</h2>
                <Link
                  to="/my-bookings"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Service</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-800">{booking.customer}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{booking.service}</td>
                        <td className="py-4 px-4 text-gray-600">{booking.date}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-800">${booking.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="space-y-6">
            {/* Monthly Performance */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Monthly Performance</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jobs Completed</span>
                  <span className="font-semibold text-gray-800">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold text-green-600">$2,450</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New Customers</span>
                  <span className="font-semibold text-blue-600">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-semibold text-gray-800">4.9</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Reviews</h2>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">by John Smith</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    "Excellent plumbing work. Very professional and clean."
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">by Sarah Wilson</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    "Great service and fair pricing. Highly recommended!"
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">This Week</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="opacity-90">Bookings</span>
                  <span className="font-bold">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-90">Revenue</span>
                  <span className="font-bold">$670</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-90">Growth</span>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-bold">+15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};