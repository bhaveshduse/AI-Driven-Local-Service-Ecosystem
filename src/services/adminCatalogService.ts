import apiClient from './apiClient';
import { Category } from './categoryService'; // Re-use the public Category type

// Define the Service interface, as it was in the old file.
export interface Service {
  _id: string;
  title: string;
  category: string;
  isActive: boolean;
  pricing: {
    amount: number;
    unit: string;
  };
  vendor: {
    businessName: string;
    user: {
      name: string;
      email: string;
      city?: string;
    }
  };
}

// Re-export Category to be available alongside Service from this module
export type { Category };

const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const getAuthJsonHeaders = (token: string) => ({
  ...getAuthHeaders(token),
  'Content-Type': 'application/json',
});

const ADMIN_API_URL = '/api/admin/catalog';

// --- CATEGORY FUNCTIONS ---

export const fetchCategoriesAPI = async (token: string, signal: AbortSignal): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>(`${ADMIN_API_URL}/categories`, {
    headers: getAuthHeaders(token),
    signal,
  });
  return response.data;
};

export const saveCategoryAPI = async (token:string, formData: FormData, categoryId?: string): Promise<Category> => {
    const url = categoryId ? `${ADMIN_API_URL}/categories/${categoryId}` : `${ADMIN_API_URL}/categories`;
    const method = categoryId ? 'put' : 'post';

    const response = await apiClient[method]<Category>(url, formData, {
        headers: getAuthHeaders(token),
    });
    return response.data;
};

export const deleteCategoryAPI = async (token: string, categoryId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`${ADMIN_API_URL}/categories/${categoryId}`, {
    headers: getAuthHeaders(token),
  });
  return response.data;
};

// --- SERVICE FUNCTIONS ---

export const fetchServicesAPI = async (token: string, signal: AbortSignal): Promise<Service[]> => {
  const response = await apiClient.get<Service[]>(`${ADMIN_API_URL}/services`, {
    headers: getAuthHeaders(token),
    signal,
  });
  return response.data;
};

export const toggleServiceStatusAPI = async (token: string, serviceId: string, isActive: boolean): Promise<Service> => {
  const response = await apiClient.patch<Service>(`${ADMIN_API_URL}/services/${serviceId}/toggle`, { isActive }, {
    headers: getAuthJsonHeaders(token),
  });
  return response.data;
};

export const deleteServiceAPI = async (token: string, serviceId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`${ADMIN_API_URL}/services/${serviceId}`, {
    headers: getAuthHeaders(token),
  });
  return response.data;
};