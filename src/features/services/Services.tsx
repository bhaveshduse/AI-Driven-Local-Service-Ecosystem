import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Loader2, ImageOff, Star, Search, LocateFixed, SearchX, X } from 'lucide-react';
import { getPublicServices, type PaginatedServicesResponse, type Service as PublicService } from '../../services/serviceService';
import { getImageUrl } from '../../utils/helpers';
import { useDebounce } from '../../hooks/useDebounce';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getCategories, Category } from '../../services/categoryService';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceQuery {
  search?: string;
  city?: string;
  category?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

interface Filters {
  search: string;
  city: string;
  category: string;
  rating: number;
  sort: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const LIMIT = 12;
const DEFAULT_SORT = 'nearest';

// ─── URL Helpers ──────────────────────────────────────────────────────────────

function filtersFromUrl(searchParams: URLSearchParams): Filters {
  return {
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || '',
    category: searchParams.get('category') || '',
    rating: Number(searchParams.get('minRating')) || 0,
    sort: searchParams.get('sort') || DEFAULT_SORT,
  };
}

function buildUrlParams(query: ServiceQuery): Record<string, string> {
  const params: Record<string, string> = {};
  const skip = new Set(['limit']);

  for (const [key, value] of Object.entries(query)) {
    if (skip.has(key)) continue;
    if (value === undefined || value === '' || value === 0) continue;
    if (key === 'page' && Number(value) === 1) continue; // hide page=1 from URL
    params[key] = String(value);
  }

  return params;
}

function buildServiceQuery(
  filters: Filters,
  coordinates: Coordinates | null,
  page: number
): ServiceQuery {
  const query: ServiceQuery = {
    search: filters.search || undefined,
    city: filters.city || undefined,
    category: filters.category || undefined,
    minRating: filters.rating > 0 ? filters.rating : undefined,
    sort: filters.sort,
    page,
    limit: LIMIT,
  };

  if (coordinates) {
    query.lat = coordinates.lat;
    query.lng = coordinates.lng;
    delete query.city; // coords take precedence over city text
  }

  return query;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-3 bg-gray-200 rounded w-1/4 ml-auto" />
    </div>
  </div>
);

const ServiceCard = React.memo(({ service }: { service: PublicService }) => {
  const priceAvailable =
    service.pricing && typeof service.pricing.amount === 'number';
  const { ratings } = service.vendor.user;
  const hasRatings = ratings && ratings.count > 0;

  return (
    <Link
      to={`/services/${service._id}`}
      className="bg-white rounded-lg shadow-md overflow-hidden block hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-48 bg-gray-200">
        {service.displayImage ? (
          <img
            src={getImageUrl(service.displayImage)}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ImageOff className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent w-full p-4">
          <h3 className="text-white font-bold text-lg truncate" title={service.title}>
            {service.title}
          </h3>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex items-center text-sm text-gray-600 min-w-0">
            <MapPin className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{service.vendor.city || 'N/A'}</span>
          </div>

          {hasRatings ? (
            <div className="flex items-center text-sm text-yellow-500 flex-shrink-0">
              <Star className="w-4 h-4 mr-1 fill-current" />
              <span className="font-bold">{ratings.average.toFixed(1)}</span>
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
          {priceAvailable ? (
            <>
              <span className="text-lg font-bold text-blue-600">
                ₹{service.pricing.amount}
              </span>
              <span className="text-sm text-gray-500"> /{service.pricing.unit}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-gray-500">Price not set</span>
          )}
        </div>
      </div>
    </Link>
  );
});

ServiceCard.displayName = 'ServiceCard';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-4 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: Filters;
  categories: Category[];
  isLocating: boolean;
  usingGps: boolean;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onCityChange: (value: string) => void; // clears GPS coords
  onLocateMe: () => void;
  onClearFilters: () => void;
  areFiltersActive: boolean;
}

const FilterSidebar = ({
  filters,
  categories,
  isLocating,
  usingGps,
  onFilterChange,
  onCityChange,
  onLocateMe,
  onClearFilters,
  areFiltersActive,
}: FilterSidebarProps) => (
  <aside className="lg:col-span-1">
    <div className="bg-white rounded-lg shadow p-6 sticky top-24 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        {areFiltersActive && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Keyword */}
      <div>
        <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
          Keyword
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="search-query"
            type="text"
            placeholder="Plumbing, cleaning..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="city-filter"
            type="text"
            placeholder="Enter city name..."
            value={filters.city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isLocating}
          />
        </div>
        {usingGps && (
          <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
            <LocateFixed className="w-3 h-3" /> Using GPS coordinates
          </p>
        )}
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          className="w-full mt-2 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-wait"
        >
          {isLocating ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <LocateFixed className="h-5 w-5 mr-2" />
          )}
          Use Current Location
        </button>
      </div>

      {/* Sort */}
      <div>
        <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
          Sort By
        </label>
        <select
          id="sort-by"
          value={filters.sort}
          onChange={(e) => onFilterChange('sort', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="nearest">
            {usingGps ? 'Distance: Nearest First' : 'Best Match'}
          </option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating-desc">Rating: High to Low</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="category-filter"
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rating */}
      <div>
        <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Rating
        </label>
        <select
          id="rating-filter"
          value={filters.rating}
          onChange={(e) => onFilterChange('rating', Number(e.target.value))}
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
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({
  filters,
  usingGps,
  categories,
  areFiltersActive,
  onClearFilters,
}: {
  filters: Filters;
  usingGps: boolean;
  categories: Category[];
  areFiltersActive: boolean;
  onClearFilters: () => void;
}) => {
  const getMessage = () => {
    if (usingGps) return 'No services found near your location.';
    if (filters.search) return `No results for "${filters.search}"`;
    if (filters.city) return `No services in "${filters.city}" yet`;
    if (filters.category) {
      const name = categories.find((c) => c.slug === filters.category)?.name;
      return `No services in the "${name || 'selected'}" category yet`;
    }
    return 'Try adjusting your filters to find what you need.';
  };

  return (
    <div className="text-center p-10 bg-white rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[300px]">
      <SearchX className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No Services Found</h3>
      <p className="text-gray-500 mb-6">{getMessage()}</p>
      {areFiltersActive && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Services = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters — initialized from URL on mount
  const [filters, setFilters] = useState<Filters>(() => filtersFromUrl(searchParams));
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [usingGps, setUsingGps] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    () => Number(searchParams.get('page')) || 1
  );

  // Data
  const [services, setServices] = useState<PublicService[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce text inputs to avoid a fetch on every keystroke
  const debouncedSearch = useDebounce(filters.search, 500);
  const debouncedCity = useDebounce(filters.city, 500);

  const { isLoading: isLocating, getLocation } = useGeolocation();

  // Track whether the current render is the first, so we don't reset the page
  // back to 1 when the component mounts with URL-derived filter values.
  const isInitialMount = useRef(true);

  // ── Load categories once ────────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  // ── Reset to page 1 when any filter changes (skip on initial mount) ─────────
  useEffect(() => {
    if (isInitialMount.current) return;
    setCurrentPage(1);
     
  }, [
    debouncedSearch,
    debouncedCity,
    filters.category,
    filters.rating,
    filters.sort,
    coordinates,
  ]);

  // ── Fetch services whenever the effective query changes ─────────────────────
  useEffect(() => {
    isInitialMount.current = false;

    const controller = new AbortController();

    const fetchServices = async () => {
      // Build a query object using the debounced text values + stable filter fields
      const effectiveFilters: Filters = {
        ...filters,
        search: debouncedSearch,
        city: debouncedCity,
      };

      const query = buildServiceQuery(effectiveFilters, coordinates, currentPage);

      // --- LOGGING: Show the exact query being sent to the backend ---
      console.log('[Services.tsx] Fetching with query:', JSON.stringify(query, null, 2));

      // Keep the URL in sync with current filter state
      setSearchParams(buildUrlParams(query), { replace: true });

      setIsLoading(true);
      setError(null);

      try {
        const response: PaginatedServicesResponse = await getPublicServices(
          query,
          controller.signal
        );

        // --- LOGGING: Show the raw response from the API ---
        console.log('[Services.tsx] Received API response:', response);

        setServices(response?.services || []);
        setTotalPages(response?.totalPages || 0);

        // If the page is now out of range (e.g. after a filter narrows results),
        // jump to the last valid page. Guard against totalPages === 0.
        if (response?.totalPages > 0 && currentPage > response.totalPages) {
          console.log(`[Services.tsx] Current page ${currentPage} is out of bounds. Jumping to last page ${response.totalPages}.`);
          setCurrentPage(response.totalPages);
        }
      } catch (err: any) {
        // Axios throws 'CanceledError', while native fetch throws 'AbortError'.
        // We check for the name property to ignore intentional cancellations.
        if (err.name !== 'CanceledError') {
          // --- LOGGING: Show details of any fetch error ---
          console.error('[Services.tsx] Error fetching services:', err.response?.data || err.message, err);
          setError('Failed to load services. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();

    return () => controller.abort();
  }, [
    currentPage,
    debouncedSearch,
    debouncedCity,
    filters.category,
    filters.rating,
    filters.sort,
    coordinates,
    // Note: `filters.search` and `filters.city` are intentionally excluded here;
    // we react to their *debounced* versions above to avoid over-fetching.
    setSearchParams,
  ]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCityChange = (value: string) => {
    // Typing in the city box overrides any GPS fix
    setFilters((prev) => ({ ...prev, city: value }));
    setCoordinates(null);
    setUsingGps(false);
  };

  const handleLocateMe = async () => {
    const toastId = toast.loading('Getting your location...');
    try {
      const { coordinates: newCoords, address } = await getLocation();
      const cityName = address?.city || address?.town || address?.village;

      setCoordinates({ lat: newCoords.lat, lng: newCoords.lon });
      setUsingGps(true);
      setFilters((prev) => ({
        ...prev,
        city: cityName || 'Current Location',
      }));

      toast.success(
        cityName ? `Location set to ${cityName}` : 'Using your current coordinates.',
        { id: toastId }
      );
    } catch (err: any) {
      const msg = getGeolocationErrorMessage(err);
      toast.error(msg, { id: toastId });
      console.error('Geolocation error:', err);
    }
  };

  const handleClearFilters = () => {
    setFilters({ search: '', city: '', category: '', rating: 0, sort: DEFAULT_SORT });
    setCoordinates(null);
    setUsingGps(false);
    setCurrentPage(1);
  };

  const areFiltersActive =
    !!filters.search ||
    !!filters.city ||
    !!filters.category ||
    filters.rating > 0 ||
    filters.sort !== DEFAULT_SORT ||
    usingGps;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-screen-xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">Find Your Service</h1>
          <p className="mt-2 text-lg text-gray-600">
            Explore services offered by professionals near you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <FilterSidebar
            filters={filters}
            categories={categories}
            isLocating={isLocating}
            usingGps={usingGps}
            onFilterChange={handleFilterChange}
            onCityChange={handleCityChange}
            onLocateMe={handleLocateMe}
            onClearFilters={handleClearFilters}
            areFiltersActive={areFiltersActive}
          />

          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: LIMIT }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center p-10 bg-red-50 text-red-700 rounded-lg">
                <p>{error}</p>
              </div>
            ) : services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services.map((service) => (
                  <ServiceCard key={service._id} service={service} />
                ))}
              </div>
            ) : (
              <EmptyState
                filters={filters}
                usingGps={usingGps}
                categories={categories}
                areFiltersActive={areFiltersActive}
                onClearFilters={handleClearFilters}
              />
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function getGeolocationErrorMessage(error: any): string {
  if (error.code === undefined) return error.message ?? 'Unknown error';

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable it in your browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information is unavailable at the moment.';
    case error.TIMEOUT:
      return 'The request to get your location timed out.';
    default:
      return 'An unknown error occurred while fetching location.';
  }
}