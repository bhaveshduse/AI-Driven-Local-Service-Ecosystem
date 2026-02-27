import apiClient from './apiClient';

// Define a comprehensive Service type for detail pages.
export interface Service {
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
  displayImage: string;
  included: string[];
  excluded: string[];
  requirements: string[];
  vendor: {
    _id: string;
    businessName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    experience: number;
    user: {
      name: string;
      avatar?: string;
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

// Define a public-facing Service type.
export interface PublicService {
  _id: string;
  title: string;
  description: string;
  displayImage: string;
  pricing: {
    amount: number;
    unit: string;
  };
  category: string;
  vendor: {
    _id: string;
    businessName: string;
    city: string;
    user: {
      _id: string;
      name: string;
      ratings?: {
        average: number;
        count: number;
      };
    }
  };
}

export interface ServiceQuery {
  search?: string;
  city?: string;
  category?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetches public services from the API, with optional filtering.
 * @param query - An object containing filter parameters.
 * @returns A promise that resolves to an array of public services.
 */
export const getPublicServices = async (query: ServiceQuery): Promise<PublicService[]> => {
  const response = await apiClient.get<PublicService[]>('/api/services', { params: query });
  return response.data;
};

/**
 * Fetches a single service by its ID. Requires authentication.
 * @param id - The ID of the service to fetch.
 * @param token - The user's authentication token.
 * @returns A promise that resolves to the detailed service object.
 */
export const getServiceById = async (id: string, token: string): Promise<Service> => {
  const response = await apiClient.get<Service>(`/api/services/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return response.data;
};

/**
 * Creates or updates a service using FormData.
 * @param formData - The service data as FormData, including images.
 * @param token - The vendor's authentication token.
 * @param serviceId - The ID of the service to update. If undefined, a new service is created.
 * @returns A promise that resolves to the saved service object.
 */
export const saveService = async (formData: FormData, token: string, serviceId?: string) => {
  const url = serviceId ? `/api/services/${serviceId}` : '/api/services';
  const method = serviceId ? 'PUT' : 'POST';

  const response = await apiClient({
    method,
    url,
    data: formData,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};