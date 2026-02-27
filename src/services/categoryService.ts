import apiClient from './apiClient';

// This interface defines the shape of a Category object based on the Mongoose model.
// It provides strong typing for the data we receive from the API.
export interface Category {
  _id: string;
  slug: string;
  name: string;
  image: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt:string;
}

/**
 * Fetches all service categories from the API.
 * @returns A promise that resolves to an array of categories.
 */
export const getCategories = async (): Promise<Category[]> => {
  // We use our new apiClient to make the request.
  const response = await apiClient.get<Category[]>('/api/categories');
  // We return the data from the response.
  return response.data;
};