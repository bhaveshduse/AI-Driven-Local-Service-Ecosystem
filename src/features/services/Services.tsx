import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Loader2, ImageOff, Star, Search, LocateFixed, SearchX } from 'lucide-react';
import { getPublicServices, PublicService, ServiceQuery } from '../../services/serviceService';
import { getImageUrl } from '../../utils/helpers';
import { useDebounce } from '../../hooks/useDebounce';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getCategories, Category } from '../../services/categoryService';
import { toast } from 'react-hot-toast';

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4 ml-auto"></div>
    </div>
  </div>
);

const ServiceCard = ({ service }: { service: PublicService }) => (
  <Link to={`/services/${service._id}`} className="bg-white rounded-lg shadow-md overflow-hidden block hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
    <div className="relative h-48 bg-gray-200">
      {service.displayImage ? (
        <img src={getImageUrl(service.displayImage)} alt={service.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <ImageOff className="w-12 h-12 text-gray-400" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent w-full p-4">
        <h3 className="text-white font-bold text-lg truncate" title={service.title}>{service.title}</h3>
      </div>
    </div>
    <div className="p-4 flex flex-col flex-grow">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-center text-sm text-gray-600 min-w-0">
          <MapPin className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">{service.vendor.city || 'N/A'}</span>
        </div>
        {service.vendor.user.ratings && service.vendor.user.ratings.count > 0 ? (
          <div className="flex items-center text-sm text-yellow-500 flex-shrink-0">
            <Star className="w-4 h-4 mr-1 fill-current" />
            <span className="font-bold">{service.vendor.user.ratings.average.toFixed(1)}</span>
          </div>
        ) : (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            New ✨
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4 flex-grow">
        by <span className="font-semibold text-gray-700">{service.vendor.businessName}</span>
      </p>
      <div className="mt-auto text-right">
        <span className="text-lg font-bold text-blue-600">
          ₹{service.pricing.amount}
        </span>
        <span className="text-sm text-gray-500"> /{service.pricing.unit}</span>
      </div>
    </div>
  </Link>
);

export const Services = () => {
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<PublicService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  // Initialize search from URL query params if available
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Debounced inputs for performance
  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedCity = useDebounce(cityFilter, 500);

  // Geolocation hook
  const { isLoading: isLocating, getLocation } = useGeolocation();

  // Fetch categories for the filter dropdown on component mount
  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const fetchServices = useCallback(async (query: ServiceQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicServices(query);
      setServices(data);
    } catch (err) {
      setError('Failed to load services. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // This effect runs whenever a filter changes, triggering a new API call
  useEffect(() => {
    const query: ServiceQuery = {
      search: debouncedSearch || undefined,
      city: debouncedCity || undefined,
      category: categoryFilter || undefined,
      minRating: ratingFilter > 0 ? ratingFilter : undefined,
      lat: coordinates?.lat,
      lng: coordinates?.lng,
      sort: sortBy,
    };

    // If we have GPS coordinates, we don't need the city text filter.
    if (query.lat && query.lng) {
      delete query.city;
    }

    fetchServices(query);
  }, [debouncedSearch, debouncedCity, categoryFilter, ratingFilter, coordinates, sortBy, fetchServices]);

  const handleLocateMe = async () => {
    const toastId = toast.loading("Getting your location...");
    try {
      const { coordinates: newCoords, city } = await getLocation();
      setCoordinates(newCoords);

      if (city) {
        setCityFilter(city);
        toast.success(`Location set to ${city}`, { id: toastId });
      } else {
        setCityFilter('Current Location');
        toast.success('Using your current coordinates.', { id: toastId });
      }
    } catch (error: any) {
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
        errorMsg = error.message;
      }
      toast.error(errorMsg, { id: toastId });
      console.error('Geolocation error:', error);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCityFilter(e.target.value);
    setCoordinates(null); // Clear coordinates when user types manually
  };

  const areFiltersActive = !!searchQuery || !!cityFilter || !!categoryFilter || ratingFilter > 0 || sortBy !== 'relevance';

  const handleClearFilters = () => {
    setSearchQuery('');
    setCityFilter('');
    setCategoryFilter('');
    setRatingFilter(0);
    setSortBy('relevance');
    setCoordinates(null);
  };

  const getEmptyStateMessage = () => {
    if (searchQuery) {
      return `No results for "${searchQuery}"`;
    }
    if (cityFilter && cityFilter !== 'Current Location') {
      return `No services in "${cityFilter}" yet`;
    }
    if (categoryFilter) {
      const categoryName = categories.find(c => c.slug === categoryFilter)?.name;
      return `No services in the "${categoryName || 'selected'}" category yet`;
    }
    return 'Try adjusting your filters to find what you need.';
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-screen-xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">Find Your Service</h1>
          <p className="mt-2 text-lg text-gray-600">Explore services offered by professionals near you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24 space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Filters</h2>
              
              {/* Search Input */}
              <div>
                <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="search-query"
                    type="text"
                    placeholder="Plumbing, cleaning..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="city-filter"
                    type="text"
                    placeholder="Enter city name..."
                    value={cityFilter}
                    onChange={handleCityChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isLocating}
                  />
                </div>
                <button onClick={handleLocateMe} disabled={isLocating} title="Use Current Location" className="w-full mt-2 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-wait">
                  {isLocating ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <LocateFixed className="h-5 w-5 mr-2" />}
                  Use Current Location
                </button>
              </div>

              {/* Sort By Select */}
              <div>
                <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Rating: High to Low</option>
                </select>
              </div>

              {/* Category Select */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => <option key={cat._id} value={cat.slug}>{cat.name}</option>)}
                </select>
              </div>

              {/* Rating Select */}
              <div>
                <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <select
                  id="rating-filter"
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="0">Any Rating</option>
                  <option value="4">4 Stars & Up</option>
                  <option value="3">3 Stars & Up</option>
                  <option value="2">2 Stars & Up</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Services Grid */}
          <main className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center p-10 bg-red-50 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {services.map(service => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center p-10 bg-white rounded-lg shadow-sm flex flex-col items-center justify-center h-full">
              <SearchX className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Services Found</h3>
              <p className="text-gray-500 mb-6">{getEmptyStateMessage()}</p>
              {areFiltersActive && (
                <button onClick={handleClearFilters} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                  Clear All Filters
                </button>
              )}
            </div>
          )}
          </main>
        </div>
      </div>
    </div>
  );
};