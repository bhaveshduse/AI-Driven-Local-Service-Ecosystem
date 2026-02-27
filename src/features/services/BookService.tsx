import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { getServiceById, type Service } from '../../services/serviceService';
import { createBooking, type BookingPayload } from '../../services/bookingService';
import { getCustomers, type Customer } from '../../services/adminService';

export const BookService = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    zipCode: ''
  });
  const [notes, setNotes] = useState('');

  // Admin-specific state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  useEffect(() => {
    const fetchService = async () => {
      if (!token) return;
      if (!serviceId) return;
      try {
        const data = await getServiceById(serviceId, token);
        setService(data);
      } catch (err) {
        setError('Failed to load service details');
      } finally {
        setIsLoading(false);
      }
    };

    if (serviceId) fetchService();
  }, [serviceId, token]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (user?.role === 'admin' && token) {
        try {
          const customerUsers = await getCustomers(token);
          setCustomers(customerUsers);
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to load customer list for admin.');
        }
      }
    };
    fetchCustomers();
  }, [user, token]);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !token) return;

    // Reset states for new submission and start loading
    setError('');
    setIsSuccess(false);
    setIsSubmitting(true);
    
    try {
      if (user?.role === 'admin' && !selectedCustomer) {
        throw new Error('As an admin, you must select a customer to book for.');
      }
      const scheduledDate = new Date(`${date}T${time}`);
      if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
        throw new Error('Booking date and time must be a valid, future date.');
      }

      const bookingPayload: BookingPayload = {
        service: service._id,
        vendor: service.vendor._id,
        scheduledDate: scheduledDate.toISOString(),
        price: {
          amount: service.pricing.amount,
          currency: 'INR'
        },
        address,
        notes: {
          customerNotes: notes
        }
      };

      // Add customer ID if admin is booking
      if (user?.role === 'admin') {
        bookingPayload.customer = selectedCustomer;
      }

      await createBooking(bookingPayload, token);

      // On success
      setIsSuccess(true);
      setTimeout(() => {
        if (user?.role === 'admin') {
          // TODO: This should probably navigate to an admin bookings page
          // For now, let's assume a general dashboard exists.
          navigate('/admin/dashboard'); 
        } else {
          navigate('/my-bookings');
        }
      }, 2000);
    } catch (err: any) {
      // On error
      setError(err.response?.data?.error || err.message || 'Booking failed. Please try again.');
    } finally {
      // On success or error, stop submitting
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8">Loading...</div>;
  if (!service) return <div className="text-center p-8">Service not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Book Service</h1>
            <p className="text-blue-100 mt-1">{service.title} by {service.vendor.businessName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            {isSuccess && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Booking successful! You will be redirected shortly.
              </div>
            )}

            {user?.role === 'admin' && (
              <div>
                <label htmlFor="customer-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Book for Customer
                </label>
                <select
                  id="customer-select"
                  required
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-gray-50"
                >
                  <option value="" disabled>-- Select a Customer --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                {customers.length === 0 && <p className="text-sm text-gray-500 mt-1">Loading customers...</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-lg" min={today} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full p-3 border rounded-lg" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Service Address</h3>
              <input type="text" placeholder="Street Address" required value={address.street} onChange={e => setAddress({...address, street: e.target.value})} className="w-full p-3 border rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="City" required value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full p-3 border rounded-lg" />
                <input type="text" placeholder="ZIP Code" required value={address.zipCode} onChange={e => setAddress({...address, zipCode: e.target.value})} className="w-full p-3 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-lg" rows={3} />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
              <span className="font-medium text-gray-700">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">₹{service.pricing.amount}</span>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Confirming Booking...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};