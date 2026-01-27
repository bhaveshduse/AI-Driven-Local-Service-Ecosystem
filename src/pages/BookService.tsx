import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, MapPin, CreditCard, AlertCircle } from 'lucide-react';

interface Service {
  _id: string;
  title: string;
  category: string;
  description: string;
  pricing: {
    type: string;
    amount: number;
    unit: string;
  };
  vendor: {
    _id: string;
    businessName: string;
    user: {
      name: string;
    };
  };
}

export const BookService = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [bookingData, setBookingData] = useState({
    scheduledDate: '',
    timeSlot: {
      startTime: '',
      endTime: ''
    },
    location: {
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      instructions: ''
    },
    notes: {
      customerNotes: ''
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const fetchService = async () => {
    if (!serviceId) return;
    try {
      const response = await fetch(`/api/services/${serviceId}`);
      const data = await response.json();
      setService(data);
    } catch (error) {
      console.error('Error fetching service:', error);
      setError('Failed to load service details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const keys = name.split('.');
      setBookingData(prev => {
        const newState = { ...prev } as any;
        let current = newState;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          current[key] = { ...current[key] };
          current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        return newState;
      });
    } else {
      setBookingData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsBooking(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...bookingData,
          service: serviceId,
          vendor: service?.vendor._id,
          pricing: {
            baseAmount: service?.pricing.amount,
            totalAmount: service?.pricing.amount
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Booking failed');
      }

      await response.json();
      navigate('/my-bookings', { 
        state: { message: 'Booking created successfully!' }
      });
    } catch (error: any) {
      setError(error.message || 'Booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  const timeSlots = [
    { start: '09:00', end: '12:00', label: '9:00 AM - 12:00 PM' },
    { start: '12:00', end: '15:00', label: '12:00 PM - 3:00 PM' },
    { start: '15:00', end: '18:00', label: '3:00 PM - 6:00 PM' },
    { start: '18:00', end: '21:00', label: '6:00 PM - 9:00 PM' }
  ];

  const handleTimeSlotSelect = (slot: { start: string; end: string }) => {
    setBookingData(prev => ({
      ...prev,
      timeSlot: {
        startTime: slot.start,
        endTime: slot.end
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Service not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Book Service</h1>
          <p className="text-gray-600">Schedule your appointment with {service.vendor.businessName}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-8">
              {/* Service Summary */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Service Details</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800">{service.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">by {service.vendor.businessName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500 capitalize">{service.category.replace('-', ' ')}</span>
                    <span className="font-semibold text-gray-800">₹{service.pricing.amount} {service.pricing.unit}</span>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold text-gray-800 mb-4">
                  <Calendar className="h-5 w-5" />
                  <span>Select Date</span>
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingData.scheduledDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold text-gray-800 mb-4">
                  <Clock className="h-5 w-5" />
                  <span>Select Time Slot</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {timeSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTimeSlotSelect(slot)}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        bookingData.timeSlot.startTime === slot.start
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold text-gray-800 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span>Service Location</span>
                </label>
                <div className="space-y-4">
                  <input
                    type="text"
                    name="location.address.street"
                    placeholder="Street Address"
                    required
                    value={bookingData.location.address.street}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="location.address.city"
                      placeholder="City"
                      required
                      value={bookingData.location.address.city}
                      onChange={handleInputChange}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      name="location.address.state"
                      placeholder="State"
                      required
                      value={bookingData.location.address.state}
                      onChange={handleInputChange}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    name="location.address.zipCode"
                    placeholder="ZIP Code"
                    required
                    value={bookingData.location.address.zipCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <textarea
                    name="location.instructions"
                    placeholder="Additional location instructions or access details..."
                    rows={3}
                    value={bookingData.location.instructions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4">
                  Special Requests or Notes
                </label>
                <textarea
                  name="notes.customerNotes"
                  placeholder="Any specific requirements or additional details..."
                  rows={4}
                  value={bookingData.notes.customerNotes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isBooking || !bookingData.scheduledDate || !bookingData.timeSlot.startTime}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBooking ? 'Creating Booking...' : 'Book Service'}
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-24">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Booking Summary</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.vendor.businessName}</p>
              </div>

              {bookingData.scheduledDate && (
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(bookingData.scheduledDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {bookingData.timeSlot.startTime && (
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-800">
                    {bookingData.timeSlot.startTime} - {bookingData.timeSlot.endTime}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-gray-600">Service Fee:</span>
                <span className="font-medium text-gray-800">₹{service.pricing.amount}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-200 font-semibold">
                <span className="text-gray-800">Total:</span>
                <span className="text-xl text-blue-600">₹{service.pricing.amount}</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Payment on Completion</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You'll be charged after the service is completed to your satisfaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};