import { useReducer, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as adminCatalogService from '../services/adminCatalogService';
import { toast } from 'react-hot-toast';
import { Category, Service } from '../services/adminCatalogService';
// Types

type CatalogState = {
  categories: Category[];
  services: Service[];
  isLoadingCategories: boolean;
  isLoadingServices: boolean;
  categoryError: string | null;
  serviceError: string | null;
};

type CatalogAction =
  | { type: 'FETCH_CATEGORIES_START' }
  | { type: 'FETCH_CATEGORIES_SUCCESS'; payload: Category[] }
  | { type: 'FETCH_CATEGORIES_ERROR'; payload: string }
  | { type: 'FETCH_SERVICES_START' }
  | { type: 'FETCH_SERVICES_SUCCESS'; payload: Service[] }
  | { type: 'FETCH_SERVICES_ERROR'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_SERVICES'; payload: Service[] };

const initialState: CatalogState = {
  categories: [],
  services: [],
  isLoadingCategories: false,
  isLoadingServices: false,
  categoryError: null,
  serviceError: null,
};

const catalogReducer = (state: CatalogState, action: CatalogAction): CatalogState => {
  switch (action.type) {
    case 'FETCH_CATEGORIES_START':
      return { ...state, isLoadingCategories: true, categoryError: null };
    case 'FETCH_CATEGORIES_SUCCESS':
      return { ...state, isLoadingCategories: false, categories: action.payload };
    case 'FETCH_CATEGORIES_ERROR':
      return { ...state, isLoadingCategories: false, categoryError: action.payload };
    case 'FETCH_SERVICES_START':
      return { ...state, isLoadingServices: true, serviceError: null };
    case 'FETCH_SERVICES_SUCCESS':
      return { ...state, isLoadingServices: false, services: action.payload };
    case 'FETCH_SERVICES_ERROR':
      return { ...state, isLoadingServices: false, serviceError: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_SERVICES':
      return { ...state, services: action.payload };
    default:
      return state;
  }
};

export const useCatalog = (activeTab: 'categories' | 'services') => {
  const [state, dispatch] = useReducer(catalogReducer, initialState);
  const { token } = useAuth();

  const fetchCategories = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    dispatch({ type: 'FETCH_CATEGORIES_START' });
    try {
      const data = await adminCatalogService.fetchCategoriesAPI(token, signal);
      dispatch({ type: 'FETCH_CATEGORIES_SUCCESS', payload: data });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        dispatch({ type: 'FETCH_CATEGORIES_ERROR', payload: error.message });
      }
    }
  }, [token]);

  const fetchServices = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    dispatch({ type: 'FETCH_SERVICES_START' });
    try {
      const data = await adminCatalogService.fetchServicesAPI(token, signal);
      dispatch({ type: 'FETCH_SERVICES_SUCCESS', payload: data });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        dispatch({ type: 'FETCH_SERVICES_ERROR', payload: error.message });
      }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (activeTab === 'categories') {
      fetchCategories(signal);
    } else {
      fetchServices(signal);
    }

    return () => controller.abort();
  }, [activeTab, fetchCategories, fetchServices]);

  const saveCategory = async (formData: FormData, categoryId?: string) => {
    if (!token) throw new Error("Authentication token not found.");
    // Let the caller handle success/error, but perform the API call here.
    await adminCatalogService.saveCategoryAPI(token, formData, categoryId);
    // Re-fetch after saving.
    await fetchCategories(new AbortController().signal);
  };

  const deleteCategory = async (category: Category) => {
    if (!token) return;
    const originalCategories = state.categories;
    dispatch({ type: 'SET_CATEGORIES', payload: state.categories.filter(c => c._id !== category._id) });
    try {
      await adminCatalogService.deleteCategoryAPI(token, category._id);
      toast.success('Category deleted successfully!');
    } catch (error: any) {
      toast.error(error.message);
      dispatch({ type: 'SET_CATEGORIES', payload: originalCategories }); // Revert on failure
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    if (!token) return;
    const originalServices = state.services;
    dispatch({ type: 'SET_SERVICES', payload: state.services.map(s => s._id === service._id ? { ...s, isActive: !s.isActive } : s) });
    try {
      await adminCatalogService.toggleServiceStatusAPI(token, service._id, !service.isActive);
      toast.success(`Service has been ${service.isActive ? 'disabled' : 'enabled'}.`);
    } catch (error: any) {
      toast.error(error.message);
      dispatch({ type: 'SET_SERVICES', payload: originalServices }); // Revert on failure
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!token) return;
    const originalServices = state.services;
    dispatch({ type: 'SET_SERVICES', payload: state.services.filter(s => s._id !== serviceId) });
    try {
      await adminCatalogService.deleteServiceAPI(token, serviceId);
      toast.success('Service deleted successfully.');
    } catch (error: any) {
      toast.error(error.message);
      dispatch({ type: 'SET_SERVICES', payload: originalServices }); // Revert on failure
    }
  };

  return { ...state, saveCategory, deleteCategory, toggleServiceStatus, deleteService };
};