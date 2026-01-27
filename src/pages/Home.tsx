import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Shield, Clock, Users } from 'lucide-react';

export const Home = () => {
  const categories = [
    { id: 'plumbing', name: 'Plumbing', icon: '🔧', color: 'bg-blue-100 text-blue-600' },
    { id: 'electrical', name: 'Electrical', icon: '⚡', color: 'bg-yellow-100 text-yellow-600' },
    { id: 'carpentry', name: 'Carpentry', icon: '🔨', color: 'bg-orange-100 text-orange-600' },
    { id: 'cleaning', name: 'Cleaning', icon: '🧽', color: 'bg-green-100 text-green-600' },
    { id: 'painting', name: 'Painting', icon: '🎨', color: 'bg-purple-100 text-purple-600' },
    { id: 'appliance-repair', name: 'Appliance Repair', icon: '🔌', color: 'bg-red-100 text-red-600' },
  ];

  const features = [
    {
      icon: <Search className="h-8 w-8" />,
      title: 'Easy Search',
      description: 'Find the perfect service provider in your area with our smart search feature.'
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Verified Providers',
      description: 'All our service providers are thoroughly verified for your safety and peace of mind.'
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: 'Quick Booking',
      description: 'Book services instantly with our streamlined booking process and flexible scheduling.'
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: 'Quality Assured',
      description: 'Read reviews and ratings from real customers to make informed decisions.'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Happy Customers' },
    { number: '2,500+', label: 'Verified Providers' },
    { number: '50+', label: 'Cities Covered' },
    { number: '4.8/5', label: 'Average Rating' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Find Local Home
              <span className="text-blue-200"> Service Providers</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Connect with trusted professionals in your area for all your home service needs. 
              From plumbing to cleaning, we've got you covered.
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-4 max-w-4xl mx-auto shadow-2xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="What service do you need?"
                    className="w-full pl-12 pr-4 py-3 text-gray-800 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter your location"
                    className="w-full pl-12 pr-4 py-3 text-gray-800 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <Link
                  to="/services"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Popular Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse our most requested home services and find the right professional for your needs.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/services?category=${category.id}`}
                className="group bg-white p-6 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 text-center transform hover:-translate-y-2"
              >
                <div className={`w-16 h-16 ${category.color} rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Why Choose Swayam?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We make it easy to connect with trusted local service providers who deliver quality work at fair prices.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow group">
                <div className="text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              Join our growing community of satisfied customers and reliable service providers.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-blue-100 text-lg">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of customers who trust Swayam for their home service needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/services"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Find Services
              </Link>
              <Link
                to="/register?role=vendor"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Become a Provider
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};