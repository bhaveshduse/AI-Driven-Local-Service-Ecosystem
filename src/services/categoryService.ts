import apiClient from './apiClient';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

export const getCategories = async (): Promise<Category[]> => {
  // The path was incorrect, causing a 404 error with a duplicated /api path.
  // The correct endpoint is /services/categories/list.
  const { data } = await apiClient.get<Category[]>('/services/categories/list');
  return data;
};