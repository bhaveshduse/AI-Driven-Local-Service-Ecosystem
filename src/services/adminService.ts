import apiClient from './apiClient';

export interface Customer {
  _id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Fetches a list of all users for an admin.
 * @param token - The admin's authentication token.
 * @returns A promise that resolves to an array of customer users.
 */
export const getCustomers = async (token: string): Promise<Customer[]> => {
  const response = await apiClient.get<{ users: Customer[] }>('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  // Filter for customers within the service function
  return response.data.users.filter(user => user.role === 'customer');
};