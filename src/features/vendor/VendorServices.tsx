import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Briefcase } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface Service {
  _id: string;
  title: string;
  category: string;
  isActive: boolean;
  pricing?: {
    amount?: number;
    unit?: string;
  };
}

/* ----------------------------- Helper Functions ----------------------------- */

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const formatCategory = (category?: string) => {
  if (!category) return '—';
  return category.replace(/-/g, ' ');
};

const formatPrice = (pricing?: Service['pricing']) => {
  if (!pricing || typeof pricing.amount !== 'number' || pricing.amount <= 0) {
    return 'Price not set';
  }
  const unit = pricing.unit?.trim() || '';
  return `₹${pricing.amount}${unit ? ` ${unit}` : ''}`;
};

/* ----------------------------- Skeleton Row ----------------------------- */

const ServiceTableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/5"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-2/5"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/4"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 rounded-full"></div></td>
    <td className="px-6 py-4">
      <div className="flex justify-end space-x-2">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>
    </td>
  </tr>
);

/* ----------------------------- Main Component ----------------------------- */

export const VendorServices: React.FC = () => {
  const { token, user, socket, isConnected } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  /* ----------------------------- Fetch Services ----------------------------- */

  const fetchServices = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await apiClient.get<Service[]>('/vendors/services');

      if (isMountedRef.current) {
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Could not load your services.'));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchServices();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchServices]);

  /* ----------------------------- WebSocket Listeners ----------------------------- */

  useEffect(() => {
    if (!socket || !isConnected || !user?.id) return;

    const handleServiceUpdate = (data: { userId?: string; services?: Service[] }) => {
      if (data?.userId === user.id && Array.isArray(data.services)) {
        toast.success('Service list updated!');
        setServices(data.services);
      }
    };

    const handleServiceDelete = (data: { serviceId?: string; userId?: string }) => {
      if (data?.userId === user.id && data.serviceId) {
        toast('A service was removed.', { icon: '🗑️' });
        setServices(prev =>
          prev.filter(service => service._id !== data.serviceId)
        );
      }
    };

    socket.on('serviceUpdated', handleServiceUpdate);
    socket.on('serviceDeleted', handleServiceDelete);

    return () => {
      socket.off('serviceUpdated', handleServiceUpdate);
      socket.off('serviceDeleted', handleServiceDelete);
    };
  }, [socket, isConnected, user?.id]);

  /* ----------------------------- Actions ----------------------------- */

  const toggleServiceStatus = async (serviceId: string) => {
    if (!serviceId) return;

    setProcessingId(serviceId);

    try {
      await apiClient.patch(`/services/${serviceId}/toggle-active`);
      // WebSocket will update state
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update service status.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteClick = (serviceId: string) => {
    if (!serviceId) return;
    setServiceToDelete(serviceId);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    const id = serviceToDelete;
    setProcessingId(id);

    try {
      await apiClient.delete(`/services/${id}`);
      // WebSocket will remove it
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete service.'));
      setProcessingId(null);
    } finally {
      setIsModalOpen(false);
      setServiceToDelete(null);
    }
  };

  /* ----------------------------- Loading UI ----------------------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div className="h-9 w-48 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-10 w-40 bg-gray-300 rounded-lg animate-pulse"></div>
          </div>
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                <ServiceTableRowSkeleton />
                <ServiceTableRowSkeleton />
                <ServiceTableRowSkeleton />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- Main UI ----------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Services</h1>
          <Link
            to="/vendor/services/new"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Service</span>
          </Link>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {services.length > 0 ? services.map(service => (
                  <tr key={service._id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {service.title || 'Untitled'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 capitalize">
                      {formatCategory(service.category)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatPrice(service.pricing)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          service.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {processingId === service._id ? (
                        <div className="flex justify-end items-center px-2">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleServiceStatus(service._id)}
                            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                            title={service.isActive ? 'Deactivate' : 'Activate'}
                            disabled={!!processingId}
                          >
                            {service.isActive ? (
                              <EyeOff className="h-5 w-5 text-gray-500" />
                            ) : (
                              <Eye className="h-5 w-5 text-green-500" />
                            )}
                          </button>

                          <Link
                            to={`/vendor/services/edit/${service._id}`}
                            className={`p-2 rounded-full text-blue-600 hover:bg-blue-50 ${
                              processingId ? 'pointer-events-none opacity-50' : ''
                            }`}
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>

                          <button
                            onClick={() => handleDeleteClick(service._id)}
                            className="p-2 rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Delete"
                            disabled={!!processingId}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating a new service.</p>
                      <div className="mt-6">
                        <Link
                          to="/vendor/services/new"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="-ml-1 mr-2 h-5 w-5" />
                          New Service
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Service"
          message="Are you sure you want to delete this service? This action cannot be undone."
          confirmText="Delete"
          isConfirming={processingId === serviceToDelete}
        />
      </div>
    </div>
  );
};