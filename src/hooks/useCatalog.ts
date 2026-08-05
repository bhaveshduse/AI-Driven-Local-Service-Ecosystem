import { useState, useEffect, useCallback } from 'react';
import {
  fetchCategoriesAPI,
  fetchServicesAPI,
  saveCategoryAPI,
  deleteCategoryAPI,
  Category,
  Service,
} from '../services/adminCatalogService';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

interface UseCatalogResult {
  categories: Category[];
  services: Service[];
  isLoadingCategories: boolean;
  isLoadingServices: boolean;
  categoryError: Error | null;
  serviceError: Error | null;
  saveCategory: (formData: FormData, id?: string) => Promise<void>;
  deleteCategory: (category: Category) => Promise<void>;
  toggleServiceStatus: (serviceId: string, isActive: boolean) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
}

export const useCatalog = (activeTab: 'categories' | 'services'): UseCatalogResult => {
  const { token } = useAuth(); // Get token from auth context

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [categoryError, setCategoryError] = useState<Error | null>(null);
  const [serviceError, setServiceError] = useState<Error | null>(null);

  // --- Fetch Categories ---
  // console.log("[useCatalog] Current token:", token ? "present" : "missing", " (length:", token?.length, ")"); // Debug log for token
  const getCategories = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    setIsLoadingCategories(true);
    setCategoryError(null);
    try {
      const fetchedCategories = await fetchCategoriesAPI(token, signal);
      setCategories(fetchedCategories);
      console.log("[useCatalog] Fetched categories:", fetchedCategories); // Debug log
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        setCategoryError(err);
        console.error("[useCatalog] Error fetching categories:", err);
      }
    } finally {
      setIsLoadingCategories(false);
    }
  }, [token]);

  // --- Fetch Services ---
  const getServices = useCallback(async (signal: AbortSignal) => {
    if (!token) return;
    setIsLoadingServices(true);
    setServiceError(null);
    try {
      const fetchedServices = await fetchServicesAPI(token, signal);
      setServices(fetchedServices);
      console.log("[useCatalog] Fetched services:", fetchedServices); // Debug log
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        setServiceError(err);
        console.error("[useCatalog] Error fetching services:", err);
      }
    } finally {
      setIsLoadingServices(false);
    }
  }, [token]);

  // --- Effects for fetching data based on activeTab ---
  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === 'categories') {
      getCategories(controller.signal);
    } else if (activeTab === 'services') {
      getServices(controller.signal);
    }
    return () => controller.abort();
  }, [activeTab, getCategories, getServices]);

  // --- Category Actions ---
  const saveCategory = useCallback(async (formData: FormData, id?: string) => {
    if (!token) throw new Error("Authentication token not found.");
    await saveCategoryAPI(token, formData, id);
    await getCategories(new AbortController().signal); // Re-fetch categories
  }, [token, getCategories]);

  const deleteCategory = useCallback(async (category: Category) => {
    if (!token) throw new Error("Authentication token not found.");
    await deleteCategoryAPI(token, category._id);
    await getCategories(new AbortController().signal); // Re-fetch categories
  }, [token, getCategories]);

  // --- Service Actions (similar structure, omitted for brevity but should be in your actual hook) ---
  const toggleServiceStatus = useCallback(async () => { /* ... */ }, []);
  const deleteService = useCallback(async () => { /* ... */ }, []);

  return {
    categories,
    services,
    isLoadingCategories,
    isLoadingServices,
    categoryError,
    serviceError,
    saveCategory,
    deleteCategory,
    toggleServiceStatus,
    deleteService,
  };
};