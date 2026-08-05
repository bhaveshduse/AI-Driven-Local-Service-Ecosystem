import apiClient from './apiClient';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: number[];
}

export interface ServiceQuery {
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

export interface PaginatedServicesResponse {
  services: Service[];
  totalPages: number;
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

interface VendorUser {
  _id: string;
  name: string;
  avatar?: string;
  city?: string;
  address?: Address;
  ratings: {
    average: number;
    count: number;
  };
}

interface Vendor {
  _id: string;
  businessName: string;
  city?: string;
  experience: number;
  verificationStatus: string;
  user: VendorUser;
  serviceArea?: {
    radius: number;
  };
  workingLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  pricing: {
    type: string;
    amount: number;
    unit: string;
  };
  displayImage: string;
  included: string[];
  excluded: string[];
  requirements: string[];
  vendor: Vendor;
  distance?: number;
}

export interface ServiceDetail extends Service {
  images: string[];
  duration: {
    value: number;
    unit: string;
  };
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const getPublicServices = async (
  query: ServiceQuery,
  signal: AbortSignal
): Promise<PaginatedServicesResponse> => {
  const { data } = await apiClient.get<PaginatedServicesResponse>('/services', {
    params: query,
    signal,
  });
  return data;
};

export const getServiceById = async (id: string): Promise<ServiceDetail> => {
  const { data } = await apiClient.get<ServiceDetail>(`/services/${id}`);
  return data;
};

export const saveService = async (
  formData: FormData,
  serviceId?: string
): Promise<ServiceDetail> => {
  const url = serviceId ? `/services/${serviceId}` : '/services';
  const method = serviceId ? 'put' : 'post';

  const { data } = await apiClient[method]<ServiceDetail>(url, formData);
  return data;
};