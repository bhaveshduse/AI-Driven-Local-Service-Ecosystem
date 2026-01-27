import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Star, Clock, DollarSign, Plus } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Find Services',
      description: 'Browse local service providers',
      icon: <MapPin className="h-6 w-6" />,
      link: '/services',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'My Bookings',
      description: 'View your service bookings',
      icon: <Calendar className="h-6 w-6" />,
      link: '/my-bookings',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Browse Categories',
      description: 'Explore service categories',
      icon: <Star className="h-6 w-6" />,
      link: '/services',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  const recentActivity = [
    {
      type: 'booking',
      title: 'Plumbing Service Completed',
      description: 'Kitchen sink repair by Mike Johnson',
      time: '2 hours ago',
      status: 'completed'
    },
    {
      type: 'review',
      title: 'Review Submitted',
      description: 'Rated electrical work by Sarah Davis',
      time: '1 day ago',
      status: 'success'
    },
    {
      type: 'booking',
      title: 'Cleaning Service Scheduled',
      description: 'House cleaning on March 15th',
      time: '2 days ago',
      status: 'pending'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Find local service providers and manage your bookings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                <p className="text-3xl font-bold text-gray-800">3</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed Services</p>
                <p className="text-3xl font-bold text-gray-800">12</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Star className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-3xl font-bold text-gray-800">₹850</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                <p className="text-3xl font-bold text-gray-800">4.8</p>
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

            {/* Upcoming Bookings */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Bookings</h2>
                <Link
                  to="/my-bookings"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">House Cleaning</h3>
                    <p className="text-sm text-gray-600">Tomorrow, 2:00 PM</p>
                    <p className="text-sm text-gray-500">CleanPro Services</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                      Confirmed
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="bg-green-600 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">Electrical Work</h3>
                    <p className="text-sm text-gray-600">March 20, 10:00 AM</p>
                    <p className="text-sm text-gray-500">ElectriCare Inc.</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
                      Pending
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'success' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 text-sm">{activity.title}</h3>
                    <p className="text-gray-600 text-sm">{activity.description}</p>
                    <p className="text-gray-400 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};