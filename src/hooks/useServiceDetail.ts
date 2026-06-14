import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getServiceById, Service } from '../services/serviceService';

/**
 * Custom hook to fetch and manage the state for a single service detail.
 * It handles loading, error states, and authentication-related side effects.
 *
 * @param serviceId The ID of the service to fetch.
 * @returns An object containing the service data, loading state, and any error.
 */
export const useServiceDetail = (serviceId: string | undefined) => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) {
        setError("Service ID is missing from the URL.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getServiceById(serviceId);
        setService(data);
      } catch (err: any) {
        console.error('Error fetching service:', err);
        const errorMessage = err.response?.data?.error || err.message || 'Could not load service.';
        
        if (err.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          logout();
          navigate('/login', { state: { from: { pathname: `/services/${serviceId}` } } });
        } else if (err.response?.status === 404) {
          toast.error("Service not found.");
          setService(null); // Explicitly set to null to show the 'not found' view
          setError("Service not found.");
        } else {
          toast.error(errorMessage);
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchService();
    } else {
      setIsLoading(false);
    }
  }, [serviceId, token, logout, navigate]);

  return { service, isLoading, error };
};

export type { Service };
