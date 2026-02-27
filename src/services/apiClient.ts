import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// We can add interceptors here in the future to automatically
// attach authentication tokens to every request.

export default apiClient;