import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, MapPin, Star, Filter } from "lucide-react";
import debounce from "lodash.debounce";
import io from "socket.io-client";
import { Toaster, toast } from "react-hot-toast";


interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Ratings {
  average: number;
  count: number;
}

interface User {
  name: string;
  ratings?: Ratings;
}

interface Vendor {
  _id: string;
  businessName: string;
  verificationStatus: string;
  user: User;
}

interface Pricing {
  type: string;
  amount: number;
  unit: string;
}

interface Service {
  _id: string;
  title: string;
  category: string;
  description: string;
  pricing: Pricing;
  images?: string[];
  vendor?: Vendor;
}

interface Filters {
  search: string;
  category: string;
  location: string;
}

const socket = io("http://localhost:5000"); // replace with your backend URL

export const Services: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    location: searchParams.get("location") || "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // ------------------- Fetch categories -------------------
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/services/categories/list");
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // ------------------- Fetch services (debounced) -------------------
  const fetchServices = useCallback(
    debounce(async (filters: Filters) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filters.search) queryParams.set("search", filters.search);
        if (filters.category) queryParams.set("category", filters.category);
        if (filters.location) queryParams.set("city", filters.location);

        const res = await fetch(`/api/services?${queryParams}`);
        const data: Service[] = await res.json();

        setServices(data);
      } catch (err) {
        console.error("Error fetching services:", err);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    fetchServices(filters);
  

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  }, [filters, fetchServices, setSearchParams]);

  // ------------------- WebSocket for real-time updates -------------------
useEffect(() => {
  socket.on("servicesUpdated", (data: { vendorId: string; services: Service[] }) => {
    const { services: newServices } = data;

    setServices((prev) => {
      const updated = [...prev];
      newServices.forEach((svc) => {
        const index = updated.findIndex((s) => s._id === svc._id);
        if (index !== -1) {
          updated[index] = svc; // update existing
        } else {
          updated.unshift(svc); // add new
        }
      });
      return updated;
    });

    // ✅ Show visual alert for new services
    toast.success(`${newServices.length} new service(s) added!`, {
      duration: 4000,
      style: {
        background: "#1e3a8a", // deep blue
        color: "#fff",
        fontWeight: "500",
        borderRadius: "8px",
        padding: "10px 16px",
      },
      icon: "⚡",
    });

    console.log("✅ Realtime: New services received", newServices);
  });

  return () => {
    socket.off("servicesUpdated");
  };
}, []);



  // ------------------- Handle filter change -------------------
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
            Find Services
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Discover trusted local service providers
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Service Grid */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {services.length > 0 ? (
            services.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-48 sm:h-40 md:h-48 bg-gray-200">
                  {service.images?.[0] ? (
                    <img
                      src={service.images[0]}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                      🛠️
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium capitalize">
                    {service.category.replace("-", " ")}
                  </div>
                </div>
                <div className="p-3 sm:p-4 md:p-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm md:text-sm mb-3 line-clamp-2">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {service.vendor?.businessName ?? "N/A"}
                      </span>
                      {service.vendor?.verificationStatus === "verified" && (
                        <span className="text-green-600 text-xs font-medium bg-green-50 px-1 py-0.5 rounded ml-1">
                          ✅ Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-700">
                        {service.vendor?.user?.ratings?.average?.toFixed(1) ?? "0.0"}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({service.vendor?.user?.ratings?.count ?? 0})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm sm:text-base font-semibold text-gray-800">
                        ₹{service.pricing.amount}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {service.pricing.unit}
                      </span>
                    </div>
                    <Link
                      to={`/services/${service._id}`}
                      className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No services found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or browse all categories</p>
              <button
                onClick={() => setFilters({ search: "", category: "", location: "" })}
                className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Show All Services
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
