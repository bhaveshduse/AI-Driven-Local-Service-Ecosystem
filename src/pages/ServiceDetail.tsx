import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Clock, IndianRupee, User, Phone, Mail, Calendar } from 'lucide-react';

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
  duration: {
    estimated: number;
    unit: string;
  };
  images: string[];
  included: string[];
  excluded: string[];
  requirements: string[];
  vendor: {
    _id: string;
    businessName: string;
    experience: number;
    user: {
      name: string;
      email: string;
      phone: string;
      ratings: {
        average: number;
        count: number;
      };
      address: {
        city: string;
        state: string;
      };
    };
  };
}

export const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const response = await fetch(`/api/services/${id}`);
      const data = await response.json();
      setService(data);
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setIsLoading(false);
    }
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
          <Link to="/services" className="text-blue-600 hover:text-blue-700">
            Browse all services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Service Images */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="h-96 bg-gray-200">
                {service.images[0] ? (
                  <img
                    src={service.images[0]}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-6xl">🛠️</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="mb-6">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                  {service.category.replace('-', ' ')}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-800 mb-4">{service.title}</h1>
              
              <div className="flex items-center space-x-6 mb-6 text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-5 w-5" />
                  <span>{service.duration.estimated} {service.duration.unit}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <IndianRupee className="h-5 w-5" />
                  <span>₹{service.pricing.amount} {service.pricing.unit}</span>
                </div>
              </div>

              <p className="text-gray-700 text-lg leading-relaxed mb-8">
                {service.description}
              </p>

              {/* What's Included */}
              {service.included && service.included.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">What's Included</h3>
                  <ul className="space-y-2">
                    {service.included.map((item, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {service.requirements && service.requirements.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Customer Requirements</h3>
                  <ul className="space-y-2">
                    {service.requirements.map((item, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What's Not Included */}
              {service.excluded && service.excluded.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Not Included</h3>
                  <ul className="space-y-2">
                    {service.excluded.map((item, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Booking Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  ₹{service.pricing.amount}
                </div>
                <p className="text-gray-600">{service.pricing.unit}</p>
              </div>

              <Link
                to={`/book/${service._id}`}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center block mb-4"
              >
                Book Now
              </Link>

              <div className="text-center text-sm text-gray-500">
                Free cancellation up to 24 hours before service
              </div>
            </div>

            {/* Vendor Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Service Provider</h3>
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{service.vendor.businessName}</h4>
                  <p className="text-gray-600 text-sm">{service.vendor.user.name}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-medium text-gray-800">
                      {service.vendor.user.ratings.average.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    ({service.vendor.user.ratings.count} reviews)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 text-sm">
                    {service.vendor.user.address?.city}, {service.vendor.user.address?.state}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 text-sm">
                    {service.vendor.experience} years experience
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>Contact Provider</span>
                </button>
                <button className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Mail className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
              </div>
            </div>

            {/* Trust & Safety */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">Trust & Safety</h3>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};