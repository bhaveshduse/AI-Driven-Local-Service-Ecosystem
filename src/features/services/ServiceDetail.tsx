import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Clock, IndianRupee, Calendar, Flag, Lock, ShieldCheck, ImageOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/Avatar';
import { getImageUrl } from '../../utils/helpers';
import { useServiceDetail, type Service } from '../../hooks/useServiceDetail';
import { experienceLevels } from '../vendor/VendorProfile';

// --- Helper Functions (moved outside component for performance and clarity) ---

/**
 * Filters out empty or invalid items from a list of strings.
 */
const cleanList = (list: string[] | undefined): string[] => {
  return (list ?? []).filter((item): item is string => 
    typeof item === 'string' && item.trim().length > 0
  );
};

/**
 * Returns a user-friendly string for vendor experience level.
 * Uses a shared constant to ensure consistency with the profile editor.
 */
const getExperienceText = (exp: number | undefined): string => {
  if (exp === undefined || exp === null) return "New Provider";
  // Find the corresponding display text from the shared constant
  const level = experienceLevels.find(l => l.value === exp);
  return level ? level.displayText : "New Provider";
};

/**
 * Formats the service duration into a display string.
 * Handles pluralization and invalid/zero values.
 */
const formatDuration = (duration: { value?: number; estimated?: number; unit?: string } | undefined): string => {
  const est = duration?.value ?? duration?.estimated;
  const unit = duration?.unit?.toLowerCase();

  if (typeof est === 'number' && est > 0 && unit) {
    const isPlural = est > 1 && !unit.endsWith('s');
    return `${est} ${unit}${isPlural ? 's' : ''}`;
  }
  return 'Not specified';
};

/**
 * Centralizes all price formatting logic for consistency.
 * Ensures amounts <= 0 are handled gracefully.
 */
const getPriceInfo = (pricing: Service['pricing'] | undefined) => {
  const isPriceValid = pricing && typeof pricing.amount === 'number' && pricing.amount > 0;

  const unit = pricing?.unit;
  const displayAmount = isPriceValid ? `₹${pricing.amount}` : 'N/A';
  const fullString = isPriceValid
    ? unit ? `₹${pricing.amount} / ${unit}` : `₹${pricing.amount}`
    : 'Price not set';

  return {
    amount: displayAmount,
    fullString,
    sidebarUnit: unit ?? 'per job',
    mobileUnit: unit,
  };
};

export const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user, isLoading: authLoading } = useAuth();
  const { service, isLoading } = useServiceDetail(id);

  // --- FIX: Hooks and data processing must be called unconditionally at the top level. ---
  // All data derived from `service` is memoized to prevent re-computation on every render
  // and to respect the Rules of Hooks by being declared before any conditional returns.
  const experienceText = useMemo(
    () => getExperienceText(Number(service?.vendor?.experience)),
    [service?.vendor?.experience],
  );

  const durationText = useMemo(
    () => formatDuration(service?.duration),
    [service?.duration],
  );

  const priceInfo = useMemo(() => getPriceInfo(service?.pricing), [service?.pricing]);

  const includedItems = useMemo(() => cleanList(service?.included), [service?.included]);
  const excludedItems = useMemo(() => cleanList(service?.excluded), [service?.excluded]);
  const requirementsItems = useMemo(() => cleanList(service?.requirements), [service?.requirements]);

  const isOwnService = useMemo(
    () => user?.id === service?.vendor?.user?._id,
    [user?.id, service?.vendor?.user?._id],
  );

  const formattedRating = useMemo(() => {
    const avg = service?.vendor?.user?.ratings?.average;
    return typeof avg === 'number' ? avg.toFixed(1) : '0.0';
  }, [service?.vendor?.user?.ratings?.average]);

  const mailtoLink = useMemo(() => {
    if (!service) return '';
    const reportSubject = encodeURIComponent(`Report Vendor: ${service.vendor?.businessName}`);
    const reportBody = encodeURIComponent(
      `I would like to report an issue with vendor ${service.vendor?.businessName} (ID: ${service.vendor?._id}) regarding service "${service.title}".\n\nPlease describe the issue below:\n`
    );
    return `mailto:bapvesupp@gmail.com?subject=${reportSubject}&body=${reportBody}`;
  }, [service]);

  // This can be a simple constant as it only depends on `service._id`
  const bookingUrl = service?._id ? `/book/${service._id}` : '#';

  // 1. Check if Auth is loading first
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  // 2. If auth is done, but no token, show Lock Screen
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Login Required</h2>
          <p className="text-gray-600 mb-8">
            Please sign in to view full service details, pricing, and provider information.
          </p>
          <div className="space-y-3">
            <Link to="/login" state={{ from: { pathname: `/services/${id}` } }} className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }
  // 3. If logged in but service loading
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
          <Link to="/services" className="text-blue-600 hover:text-blue-700">
            Browse all services
          </Link>
        </div>
      </div>
    );
  }
  // Destructure for cleaner access and default values
  // This is safe now because we've already returned if service is null.
  const { vendor } = service;
  const vendorUser = vendor.user;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Service Images */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="h-96 bg-gray-100">
                {service.displayImage ? (
                  <img
                    src={getImageUrl(service.displayImage)}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-16 h-16 text-gray-400" /></div>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="mb-6">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                  {service.category?.replace('-', ' ') || 'Service'}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-800 mb-4">{service.title}</h1>
              
              <div className="flex items-center space-x-6 mb-6 text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-5 w-5" />
                  <span className="capitalize">
                    {durationText}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <IndianRupee className="h-5 w-5" />
                  <span className="capitalize">
                    {priceInfo.fullString}
                  </span>
                </div>
              </div>

              <p className="text-gray-700 text-lg leading-relaxed mb-8">
                {service.description}
              </p>

              {/* Call to Action Button - Hide if it's the vendor's own service */}
              {!isOwnService && (
                <div className="my-8 text-center lg:text-left">
                <Link
                  to={bookingUrl}
                  className="inline-flex items-center justify-center bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Book This Service
                </Link>
                </div>
              )}

              {/* What's Included */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">What's Included</h3>
                {includedItems.length > 0 ? (
                  <ul className="space-y-2">
                    {includedItems.map((item: string, index: number) => (
                      <li key={`included-${index}`} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">Details not provided.</p>
                )}
              </div>

              {/* Requirements */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Customer Requirements</h3>
                {requirementsItems.length > 0 ? (
                  <ul className="space-y-2">
                    {requirementsItems.map((item: string, index: number) => (
                      <li key={`req-${index}`} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No specific requirements listed.</p>
                )}
              </div>

              {/* What's Not Included */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Not Included</h3>
                {excludedItems.length > 0 ? (
                  <ul className="space-y-2">
                    {excludedItems.map((item: string, index: number) => (
                      <li key={`excluded-${index}`} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No specific exclusions listed.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Booking Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {priceInfo.amount}
                </div>
                <p className="text-gray-600">{priceInfo.sidebarUnit}</p>
              </div>

              {!isOwnService && (
                <>
                  <Link
                    to={bookingUrl}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center block mb-4"
                  >
                    Book Now
                  </Link>
                  <div className="text-center text-sm text-gray-500">
                    Free cancellation up to 24 hours before service
                  </div>
                </>
              )}
            </div>

            {/* Vendor Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Service Provider</h3>

              <div className="flex items-center space-x-4 mb-4">
                <Avatar 
                  src={vendorUser?.avatar ? getImageUrl(vendorUser.avatar) : ''} 
                  name={vendorUser?.name || 'Vendor'} 
                  className="h-16 w-16" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-800">
                      {vendor?.businessName || 'Unnamed Vendor'}
                    </h4>
                    {vendor?.verificationStatus === 'verified' && (
                      <span title="Verified Provider" className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck size={12} />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{vendorUser?.name || 'Contact for details'}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-medium text-gray-800">
                      {formattedRating}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    ({vendorUser?.ratings?.count ?? 0} reviews)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 text-sm">
                    {vendorUser?.city || vendorUser?.address?.city || 'Contact for location'}{vendorUser?.address?.state ? `, ${vendorUser.address.state}` : ''}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 text-sm">
                    {experienceText}
                  </span>
                </div>
              </div>
            </div>

            {/* Trust & Safety */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Trust &amp; Safety</h3>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Background checked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Licensed & insured</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Customer satisfaction guaranteed</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-green-200">
                <a
                  href={mailtoLink}
                  className="flex items-center justify-center w-full space-x-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <Flag className="h-4 w-4" />
                  <span>Report Vendor</span>
                </a>
                <p className="text-xs text-center text-green-700 mt-3">
                  Need help? Contact <a href="mailto:bapvesupp@gmail.com" className="underline font-medium">bapvesupp@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating booking bar for mobile */}
      {!isOwnService && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
              <div>
                  <p className="text-lg font-bold text-gray-800">{priceInfo.amount}</p>
                  <p className="text-xs text-gray-500">{priceInfo.mobileUnit}</p>
              </div>
              <Link
                  to={bookingUrl}
                  className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
              >
                  Book Now
              </Link>
          </div>
        </div>
      )}
    </div>
  );
};