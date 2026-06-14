import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, Loader2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getServiceById, type Service } from '../../services/serviceService';
import { useGeolocation } from '../../hooks/useGeolocation';
import { createBooking, type BookingPayload } from '../../services/bookingService';
import { getCustomers, type Customer } from '../../services/adminService';
import apiClient from '../../services/apiClient';
import qrCode from '../../assets/qr-code.png';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  city?: string;
  address?: {
    street?: string;
    zipCode?: string;
  }
}

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
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: string; lon: string } | null>(null);
  const [notes, setNotes] = useState('');

  // Admin-specific state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Geolocation hook
  const { isLoading: isLocating, getLocation } = useGeolocation();

  // A predefined list of professional time slots for a flexible, request-based booking system.
  // The `label` is for the user, and the `value` is the 24-hour format for the backend.
  const PREDEFINED_TIME_SLOTS = [
    { label: '09:00 AM', value: '09:00' },
    { label: '10:00 AM', value: '10:00' },
    { label: '11:00 AM', value: '11:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '01:00 PM', value: '13:00' },
    { label: '02:00 PM', value: '14:00' },
    { label: '03:00 PM', value: '15:00' },
    { label: '04:00 PM', value: '16:00' },
    { label: '05:00 PM', value: '17:00' },
    { label: '06:00 PM', value: '18:00' },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!token) return;
      if (!serviceId) return;
      setIsLoading(true);
      try {
        const serviceData = await getServiceById(serviceId);
        setService(serviceData);

        // If the user is a customer, fetch their profile to pre-fill address
        if (user?.role === 'customer') {
          const userProfileResponse = await apiClient.get('/auth/me');
          const profile: UserProfile = userProfileResponse.data;
          setUserProfile(profile);

          // Pre-fill address if it exists on their profile
          if (profile.address?.street || profile.city) {
            if (profile.address?.street) setStreet(profile.address.street);
            if (profile.city) setCity(profile.city);
            if (profile.address?.zipCode) setZipCode(profile.address.zipCode);
            toast.success('Address pre-filled from your profile.');
          }
        }
      } catch (err) {
        setError('Failed to load service details');
      } finally {
        setIsLoading(false);
      }
    };

    if (serviceId) fetchInitialData();
  }, [serviceId, token, user?.role]);

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

  // Fix date string logic to use local time instead of UTC to prevent timezone bugs
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = getLocalDateString(new Date());
  const maxDate = (() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3); // Set booking limit to 3 months from now
    return getLocalDateString(date);
  })();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    
    // If changing to today, check if selected time is already in the past (with 2-hour buffer)
    if (newDate === today && time) {
      const currentHour = new Date().getHours();
      const slotHour = parseInt(time.split(':')[0], 10);
      if (slotHour <= currentHour + 2) {
        setTime('');
      }
    }
  };

  // Filter/disable time slots for today to prevent past time booking
  const availableTimeSlots = PREDEFINED_TIME_SLOTS.map(slot => {
    const isToday = date === today;
    const currentHour = new Date().getHours();
    const slotHour = parseInt(slot.value.split(':')[0], 10);
    // Require a minimum of 2 hours advance notice for same-day bookings
    const isPast = isToday && slotHour <= (currentHour + 2);
    return { ...slot, disabled: isPast };
  });

  const hasAvailableSlots = availableTimeSlots.some(slot => !slot.disabled);

  const handleLocateMe = async () => {
    const toastId = toast.loading("Getting your location...");
    try {
      const { coordinates: coords, address } = await getLocation();

      if (address) {
        setStreet(address.road || address.suburb || '');
        setCity(address.city || address.town || address.village || address.county || '');
        setZipCode(address.postcode || '');
        
        // Save exact GPS coordinates so we don't need to geocode later
        setCoordinates({ lat: coords.lat.toString(), lon: coords.lon.toString() });
        
        toast.success(address.city ? `Location set to ${address.city}` : 'Address and coordinates filled!', { id: toastId });
      } else {
        throw new Error('Could not determine address from your location.');
      }
    } catch (error: any) {
      // Adopt the more detailed error handling from Services.tsx
      let errorMsg = "An unknown error occurred while fetching location.";
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Location access denied. Please enable it in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable at the moment.";
            break;
          case error.TIMEOUT:
            errorMsg = "The request to get your location timed out.";
            break;
        }
      } else {
        errorMsg = error.message || 'Failed to get location.';
      }
      toast.error(errorMsg, { id: toastId });
      console.error('Geolocation error:', error);
    }
  };

  const handleAddressChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setCoordinates(null); // Clear coordinates if user manually edits text, forcing a fresh geocode
  };

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
      // Construct the date using local time parts to ensure correct timezone handling
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const scheduledDate = new Date(year, month - 1, day, hour, minute);
      const now = new Date();
      const maxAllowedDate = new Date();
      maxAllowedDate.setMonth(now.getMonth() + 3);

      // Frontend validation for the date.
      if (isNaN(scheduledDate.getTime())) {
        throw new Error('Invalid date or time selected.');
      }
      if (scheduledDate > maxAllowedDate) {
        throw new Error('You can only book up to 3 months in advance.');
      }
      if (scheduledDate < now) {
        throw new Error('Booking date and time must be a valid, future date.');
      }

      if (!street || !city || !zipCode) {
        throw new Error('Street, City, and ZIP Code are required fields.');
      }

      let finalLat = coordinates?.lat;
      let finalLon = coordinates?.lon;

      // If we don't have GPS coordinates, geocode the address in the background
      if (!finalLat || !finalLon) {
        const geocodeToastId = toast.loading("Verifying address location...");
        try {
          let suggestions: any[] = [];
          // Cascading fallback: Try extremely specific -> somewhat specific -> broad city match
          const queries = [
            `${houseNo ? houseNo + ', ' : ''}${street}, ${city}, ${zipCode}`,
            `${street}, ${city}`,
            `${city}, ${zipCode}`,
            `${city}`
          ];

          for (const q of queries) {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, { headers: { 'User-Agent': 'Swayam-App/1.0' } });
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                suggestions = data;
                break; // Stop at the first successful match!
              }
            }
          }

          if (suggestions.length > 0) {
            finalLat = suggestions[0].lat;
            finalLon = suggestions[0].lon;
          } else {
            throw new Error("Could not map this location. Please check your City and ZIP Code.");
          }
        } finally {
          toast.dismiss(geocodeToastId);
        }
      }

      const fullStreet = houseNo ? `${houseNo}, ${street}` : street;
      const bookingPayload: BookingPayload = {
        service: service._id,
        vendor: service.vendor._id,
        scheduledDate: scheduledDate.toISOString(), // Send as ISO string
        price: {
          amount: service.pricing.amount,
        },
        address: {
          street: fullStreet,
          city: city,
          zipCode: zipCode,
          coordinates: { lat: parseFloat(finalLat!), lon: parseFloat(finalLon!) },
        },
        notes: {
          customerNotes: notes
        }
      };

      // Add customer ID if admin is booking
      if (user?.role === 'admin') {
        bookingPayload.customer = selectedCustomer;
      }

      // Specify manual payment for Two-Step Escrow
      bookingPayload.paymentMethod = 'manual';
      
      await createBooking(bookingPayload);
      
      setIsSuccess(true);
      toast.success("Booking requested! Waiting for the provider to accept.");
      setTimeout(() => {
        navigate(user?.role === 'admin' ? '/admin/dashboard' : '/my-bookings');
      }, 2000);
    } catch (error: any) {
      // On error
      const errorMessage = error.response?.data?.error || error.message || 'Booking failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
    </div>
  );
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
                <input type="date" required value={date} onChange={handleDateChange} className="w-full p-3 border rounded-lg" min={today} max={maxDate} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time Slot</label>
                <select
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                  disabled={!date || !hasAvailableSlots}
                >
                  <option value="" disabled>
                    {!date ? 'Select a date first' : !hasAvailableSlots ? 'No slots available for today' : 'Select a time slot'}
                  </option>
                  {availableTimeSlots.map(slot => (
                    <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                      {slot.label} {slot.disabled ? '(Passed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="address-input" className="font-medium text-gray-900">
                  Service Address
                </label>
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-1" />
                  )}
                  Use my location
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">House / Flat No.</label>
                  <input type="text" value={houseNo} onChange={handleAddressChange(setHouseNo)} placeholder="e.g. Flat 302" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Street / Area *</label>
                  <input type="text" required value={street} onChange={handleAddressChange(setStreet)} placeholder="e.g. Sharma Layout" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">City *</label>
                  <input type="text" required value={city} onChange={handleAddressChange(setCity)} placeholder="e.g. Mumbai" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">ZIP / Pincode *</label>
                  <input type="text" required value={zipCode} onChange={handleAddressChange(setZipCode)} placeholder="e.g. 400001" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {coordinates && (
                <div className="mt-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center border border-green-200">
                  <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Precise GPS coordinates acquired. The provider will be able to navigate directly to you!
                </div>
              )}
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
              {isSubmitting ? 'Processing...' : 'Request Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};