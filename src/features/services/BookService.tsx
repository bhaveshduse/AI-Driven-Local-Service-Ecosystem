import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, Loader2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getServiceById, type Service } from '../../services/serviceService';
import { useGeolocation } from '../../hooks/useGeolocation';
import { createBooking, type BookingPayload } from '../../services/bookingService';
import { getCustomers, type Customer } from '../../services/adminService';
import apiClient from '../../services/apiClient';

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
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [geocodeLevel, setGeocodeLevel] = useState<'street' | 'city' | null>(null);
  const [notes, setNotes] = useState('');

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'razorpay'>('razorpay');

  // Admin-specific state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  // Geolocation hook
  const { isLoading: isLocating, getLocation } = useGeolocation();
  const [locationModal, setLocationModal] = useState<{ show: boolean; canRetry: boolean; message: string }>({ show: false, canRetry: false, message: '' });

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Computes the minimum advance notice (in minutes) required before a time slot.
   * Uses the larger of two buffers:
   *   1. Static radius buffer: vendor's declared service radius
   *   2. Actual distance buffer: GPS distance from vendor base to user location
   * Each buffer = max(30 min, distance × 2 min/km), capped at 90 min.
   * Falls back to 60 minutes if neither is available.
   */
  const getMinBufferMinutes = (): number => {
    const radius = service?.vendor?.serviceArea?.radius;
    const radiusBuffer = radius && radius > 0
      ? Math.max(30, Math.min(radius * 2, 90))
      : 60;

    const vendorCoords = service?.vendor?.workingLocation?.coordinates ?? service?.vendor?.user?.address?.coordinates;
    const userCoords = coordinates;
    let distanceBuffer = 0;
    if (vendorCoords && vendorCoords.length === 2 && userCoords?.lat && userCoords?.lon) {
      const distKm = haversineDistance(
        parseFloat(userCoords.lat), parseFloat(userCoords.lon),
        vendorCoords[1], vendorCoords[0]
      );
      distanceBuffer = Math.max(30, Math.min(distKm * 2, 90));
    }

    return Math.max(radiusBuffer, distanceBuffer);
  };

  // Compute estimated distance when GPS or street-level geocode is available
  const showDistance = coordinates && (
    geocodeLevel === 'street' || geocodeLevel === null // null = GPS, 'street' = street-level geocode
  );
  const estimatedDistance = (() => {
    if (!showDistance) return null;
    const vendorCoords = service?.vendor?.workingLocation?.coordinates ?? service?.vendor?.user?.address?.coordinates;
    if (vendorCoords && vendorCoords.length === 2 && coordinates?.lat && coordinates?.lon) {
      return haversineDistance(
        parseFloat(coordinates.lat), parseFloat(coordinates.lon),
        vendorCoords[1], vendorCoords[0]
      );
    }
    return null;
  })();

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

          // Pre-fill address if it exists on their profile
          if (profile.address?.street || profile.city) {
            if (profile.address?.street) setStreet(profile.address.street);
            if (profile.city) setCity(profile.city);
            if (profile.address?.zipCode) setZipCode(profile.address.zipCode);
            toast.success('Address pre-filled from your profile.');
          }
        }
      } catch {
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

    // If switching to today, verify the previously selected time still satisfies the notice buffer
    if (newDate === today && time) {
      const now = new Date();
      const [hour, minute] = time.split(':').map(Number);
      const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
      const diffMin = (slotDate.getTime() - now.getTime()) / (1000 * 60);
      if (diffMin < getMinBufferMinutes()) {
        setTime('');
      }
    }
  };

  // Filter/disable time slots for today based on actual minutes remaining, not just hour boundaries
  const availableTimeSlots = PREDEFINED_TIME_SLOTS.map(slot => {
    const isToday = date === today;
    if (!isToday) return { ...slot, disabled: false };

    const now = new Date();
    const [hour, minute] = slot.value.split(':').map(Number);
    const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    const diffMin = (slotDate.getTime() - now.getTime()) / (1000 * 60);
    const isDisabled = diffMin < getMinBufferMinutes();

    return { ...slot, disabled: isDisabled };
  });

  const hasAvailableSlots = availableTimeSlots.some(slot => !slot.disabled);

  const handleLocateMe = async () => {
    const toastId = toast.loading("Getting your location...");
    try {
      const { coordinates: coords, address } = await getLocation();

      if (address) {
        let filled = false;
        if (!street) { setStreet(address.road || address.suburb || ''); filled = true; }
        if (!city) { setCity(address.city || address.town || address.village || address.county || ''); filled = true; }
        if (!zipCode) { setZipCode(address.postcode || ''); filled = true; }
        if (!coordinates) {
          setCoordinates({ lat: coords.lat.toString(), lon: coords.lon.toString() });
          setGeocodeLevel(null);
          setGeocodeFailed(false);
          console.log(`[GPS handleLocateMe] Stored coordinates → (${coords.lat}, ${coords.lon})`);
          filled = true;
        }
        toast.success(filled ? 'Location set!' : 'GPS location refreshed.', { id: toastId });
      } else {
        throw new Error('Could not determine address from your location.');
      }
    } catch (error: any) {
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.dismiss(toastId);
            setLocationModal({ show: true, canRetry: true, message: "Location access is blocked. Enable location in your browser settings, then tap retry." });
            return;
          case error.POSITION_UNAVAILABLE:
            toast.dismiss(toastId);
            setLocationModal({ show: true, canRetry: true, message: "Could not detect your location. Make sure GPS/Wi-Fi is on, then tap retry." });
            return;
          case error.TIMEOUT:
            toast.error("The request timed out. Please try again.", { id: toastId });
            return;
        }
      }
      if (error.message?.includes("not supported")) {
        toast.dismiss(toastId);
        setLocationModal({ show: true, canRetry: false, message: "Geolocation is not supported by your browser. Please use a modern browser or enter your address manually." });
        return;
      }
      toast.error(error.message || 'Failed to get location.', { id: toastId });
      console.error('Geolocation error:', error);
    }
  };

  // Debounced: geocode zip to get coordinates + auto-fill city
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setGeocodeFailed(false);
    setGeocodeLevel(null);
    if (coordinates) return;
    if (!zipCode) return;
    const cleanCity = city && !['not specified', 'none', 'n/a'].includes(city.trim().toLowerCase()) ? city : '';
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      const q = cleanCity ? `${cleanCity}, ${zipCode}` : zipCode;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
          headers: { 'User-Agent': 'Swayam-App/1.0' }
        });
        if (!res.ok) { setGeocodeFailed(true); return; }
        const data = await res.json();
        if (!data?.[0]?.lat || !data?.[0]?.lon) { setGeocodeFailed(true); return; }
        const lat = data[0].lat, lon = data[0].lon;
        console.log(`[Manual Geocode] Query "${q}" → forward: (${lat}, ${lon})`);
        setCoordinates({ lat, lon });
        setGeocodeLevel('city');
        setGeocodeFailed(false);
        if (!cleanCity) {
          const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: { 'User-Agent': 'Swayam-App/1.0' }
          });
          if (rev.ok) {
            const revData = await rev.json();
            console.log(`[Manual Geocode] Reverse → lat=${lat}, lon=${lon}, city=${revData.address?.city || revData.address?.town || 'N/A'}`);
            const detectedCity = revData.address?.city || revData.address?.town || revData.address?.village || revData.address?.county;
            if (detectedCity) setCity(detectedCity);
          }
        }
      } catch { setGeocodeFailed(true); }
    }, 1000);
    return () => { if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current); };
  }, [city, zipCode, coordinates]);

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
      const maxAllowedDate = new Date(now);
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

      // Set payment method
      bookingPayload.paymentMethod = paymentMethod;
      
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

              {geocodeFailed && !coordinates && (
                <div className="mt-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm flex items-center border border-amber-200">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Could not verify your address. Please check and correct your location details.
                </div>
              )}
              {coordinates && geocodeLevel === null && (
                <div className="mt-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center border border-green-200">
                  <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Precise GPS coordinates acquired. The provider will be able to navigate directly to you!
                </div>
              )}
              {estimatedDistance !== null && service?.vendor && (service?.vendor?.workingLocation?.coordinates ?? service?.vendor?.user?.address?.coordinates) && (
                <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                  📍 Provider is {estimatedDistance < 1 ? 'less than 1' : `~${estimatedDistance.toFixed(1)}`} km from your location
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'razorpay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="sr-only"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Razorpay</p>
                    <p className="text-xs text-gray-500">Pay via UPI, Card, NetBanking</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="manual"
                    checked={paymentMethod === 'manual'}
                    onChange={() => setPaymentMethod('manual')}
                    className="sr-only"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Manual Escrow</p>
                    <p className="text-xs text-gray-500">Pay via QR code + admin verification</p>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Processing...' : 'Request Booking'}
            </button>
          </form>

          {locationModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setLocationModal({ show: false, canRetry: false, message: '' })}>
              <div className="bg-white rounded-xl shadow-2xl p-6 m-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <MapPin className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg leading-6 font-bold text-gray-900">Enable Location</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{locationModal.message}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex gap-3 justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => setLocationModal({ show: false, canRetry: false, message: '' })}
                  >
                    Cancel
                  </button>
                  {locationModal.canRetry && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                      onClick={() => {
                        setLocationModal({ show: false, canRetry: false, message: '' });
                        setTimeout(() => handleLocateMe(), 50);
                      }}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};