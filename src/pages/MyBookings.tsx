import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, MapPin, Star, MessageSquare, Phone, CheckCircle } from 'lucide-react';

interface Booking {
  _id: string;
  service: {
    title: string;
    category: string;
  };
  vendor: {
    businessName: string;
    user: {
      name: string;
      phone: string;
    };
  };
  customer: {
    name: string;
    phone: string;
  };
  scheduledDate: string;
  timeSlot: {
    startTime: string;
    endTime: string;
  };
  location: {
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  status: string;
  pricing: {
    totalAmount: number;
  };
  rating?: {
    score: number;
    review: string;
  };
  createdAt: string;
}

export const MyBookings = () => {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Bookings</h1>
          <p className="text-gray-600">Track and manage your service appointments</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Bookings' },
              { key: 'pending', label: 'Pending' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'in-progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-6">
            {filteredBookings.map(booking => (
              <div key={booking._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-1">
                        {booking.service.title}
                      </h3>
                      <p className="text-gray-600">
                        {user?.role === 'customer' 
                          ? `by ${booking.vendor.businessName}`
                          : `for ${booking.customer.name}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('-', ' ')}
                      </span>
                      <div className="text-lg font-semibold text-gray-800 mt-2">
                        ${booking.pricing.totalAmount}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="h-5 w-5" />
                      <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="h-5 w-5" />
                      <span>{booking.timeSlot.startTime} - {booking.timeSlot.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-5 w-5" />
                      <span>{booking.location.address.city}, {booking.location.address.state}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {booking.status === 'completed' && !booking.rating && user?.role === 'customer' && (
                        <button className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                          <Star className="h-4 w-4" />
                          <span>Rate Service</span>
                        </button>
                      )}
                      
                      {booking.rating && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < booking.rating!.score
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">Your Rating</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {['confirmed', 'in-progress'].includes(booking.status) && (
                        <>
                          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span>Message</span>
                          </button>
                          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <Phone className="h-4 w-4" />
                            <span>Call</span>
                          </button>
                        </>
                      )}
                      
                      {booking.status === 'pending' && user?.role === 'vendor' && (
                        <div className="flex space-x-2">
                          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            Accept
                          </button>
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Decline
                          </button>
                        </div>
                      )}
                      
                      {booking.status === 'in-progress' && user?.role === 'vendor' && (
                        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {booking.rating?.review && (
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 italic">"{booking.rating.review}"</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </h3>
            <p className="text-gray-600 mb-6">
              {user?.role === 'customer' 
                ? 'Start by browsing our services and booking your first appointment.'
                : 'Customers will start booking your services soon.'
              }
            </p>
            {user?.role === 'customer' && (
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Browse Services
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};