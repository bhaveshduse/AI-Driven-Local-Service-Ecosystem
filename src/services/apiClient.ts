import axios from 'axios';

const apiClient = axios.create({
  // Use the proxy path configured in vite.config.ts
  baseURL: '/api',
});

// Add a request interceptor to automatically include the auth token
// This is crucial for all authenticated API calls.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Or however you store your token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Upload payment proof (screenshot) for the Two-Step Escrow flow
export const uploadPaymentProof = async (bookingId: string, file: File) => {
  const formData = new FormData();
  formData.append('screenshot', file);

  const response = await apiClient.post(`/bookings/${bookingId}/payment-proof`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export default apiClient;