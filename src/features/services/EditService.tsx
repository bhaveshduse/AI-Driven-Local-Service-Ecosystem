import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2, Upload, X, Plus, Trash2 } from 'lucide-react';
import { getServiceById, saveService } from '../../services/serviceService';
import { getCategories } from '../../services/categoryService';
import type { Category } from '../../services/categoryService';

interface ServiceData {
  title: string;
  description: string;
  category: string;
  pricing: {
    amount: number | '';
    unit: string;
  };
  duration: {
    estimated: number | '';
    unit: string;
  };
  included: string[];
  excluded: string[];
  requirements: string[];
  images: (File | string)[];
  [key: string]: any;
}

const initialServiceData: ServiceData = {
  title: '',
  description: '',
  category: '',
  pricing: { amount: '', unit: 'per job' },
  duration: { estimated: 45, unit: 'minute' },
  included: [],
  excluded: [],
  requirements: [],
  images: [],
};

export const EditService: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [service, setService] = useState<ServiceData>(initialServiceData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const totalImages = existingImageUrls.length + newImagePreviews.length;
  const maxImages = 5;

  const getFullImageUrl = (path: string) => {
    if (!path || path.startsWith('http') || path.startsWith('blob:')) return path;
    return `/${path.replace(/\\/g, '/')}`;
  };

  const fetchService = useCallback(async () => {
    if (!id || !token) return;
    try {
      const data = await getServiceById(id);
      // --- FIX: Merge fetched data with initial data to prevent uncontrolled inputs ---
      // This ensures all form fields have a defined value (e.g., '' or []) even if the API response omits them.
      setService({
        ...initialServiceData,
        ...data,
        // Deep merge nested objects
        pricing: { ...initialServiceData.pricing, ...(data.pricing || {}) },
        duration: { ...initialServiceData.duration, ...(data.duration || {}) },
        // Ensure arrays are defined
        included: data.included || [],
        excluded: data.excluded || [],
        requirements: data.requirements || [],
        images: [], // This is for new image uploads, handled separately
      });
      setExistingImageUrls(data.images || []);
    } catch (error: any) {
      toast.error(error.message);
      navigate('/vendor/services');
    } finally {
      setIsLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err: any) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
    if (id) {
      fetchService();
    }
  }, [id, fetchService]);

  // Effect to create and cleanup object URLs for new image previews
  useEffect(() => {
    const newFiles = service.images.filter(img => img instanceof File) as File[];
    if (newFiles.length === 0) {
      setNewImagePreviews([]);
      return;
    }
    const objectUrls = newFiles.map(file => URL.createObjectURL(file));
    setNewImagePreviews(objectUrls);

    return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
  }, [service.images]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setService(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setService(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleListChange = (listName: 'included' | 'excluded' | 'requirements', index: number, value: string) => {
    const newList = [...service[listName]];
    newList[index] = value;
    setService(prev => ({ ...prev, [listName]: newList }));
  };

  const addListItem = (listName: 'included' | 'excluded' | 'requirements') => {
    setService(prev => ({ ...prev, [listName]: [...prev[listName], ''] }));
  };

  const removeListItem = (listName: 'included' | 'excluded' | 'requirements', index: number) => {
    setService(prev => ({ ...prev, [listName]: prev[listName].filter((_, i) => i !== index) }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setService(prev => ({ ...prev, images: [...prev.images, ...files] }));
    }
  };

  const removeImage = (index: number) => {
    setService(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImageUrls(prev => prev.filter(url => url !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);

    const formData = new FormData();
    // --- FIX: Explicitly build the submission object ---
    // This prevents sending back read-only fields like _id, vendor, etc., which can cause backend errors.
    const { title, description, category, pricing, duration } = service;
    const serviceToSubmit = {
      title,
      description,
      category,
      pricing: {
        ...pricing,
        amount: Number(pricing.amount),
      },
      duration: {
        ...duration,
        estimated: Number(duration.estimated),
      },
      included: service.included.filter(item => item.trim() !== ''),
      excluded: service.excluded.filter(item => item.trim() !== ''),
      requirements: service.requirements.filter(item => item.trim() !== ''),
    };

    Object.entries(serviceToSubmit).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    
    // Append new image files
    service.images.forEach(image => {
      if (image instanceof File) {
        formData.append('images', image);
      }
    });
    
    // Append remaining existing images
    formData.append('existingImages', JSON.stringify(existingImageUrls));

    try {
      await saveService(formData, id);

      toast.success(`Service ${id ? 'updated' : 'created'} successfully!`);
      navigate('/vendor/services');
    } catch (error: any) {
      // Use the more specific error from axios if available
      toast.error(error.response?.data?.error || error.message || 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }

  const renderListInputs = (listName: 'included' | 'excluded' | 'requirements', label: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <p className="text-xs text-gray-500 mb-2 -mt-1">Clearly list items to manage customer expectations. (Optional)</p>
      <div className="space-y-2">
        {service[listName].map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              value={item}
              onChange={(e) => handleListChange(listName, index, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder={placeholder}
            />
            <button type="button" onClick={() => removeListItem(listName, index)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => addListItem(listName)} className="flex items-center space-x-1 text-sm text-blue-600 hover:underline">
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-8 border-b">
            <h1 className="text-2xl font-bold text-gray-800">{id ? 'Edit Service' : 'Create New Service'}</h1>
            <p className="text-gray-500 mt-1">Fill out the details below to list your service.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">
                ① Basic Information
              </h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Service Title</label>
                  <input type="text" id="title" name="title" value={service.title} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg" maxLength={80} placeholder="e.g. Professional Pipe Repair & Leak Fixing" />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {service.title.length} / 80
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={service.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    maxLength={500}
                    placeholder="Describe the service you offer in detail. What makes it unique? What can customers expect?"
                  />
                  <div className={`text-right text-xs mt-1 ${service.description.length > 450 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {service.description.length} / 500
                  </div>
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select id="category" name="category" value={service.category} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                    <option value="" disabled>Select a category</option>
                    {categories.map(c => <option key={c._id} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">
                ② Pricing & Duration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">₹</span>
                    <input type="number" name="pricing.amount" value={service.pricing.amount} onChange={handleInputChange} required className="w-full p-3 border border-gray-300" min="1" placeholder="e.g. 500" />
                    <select name="pricing.unit" value={service.pricing.unit} onChange={handleInputChange} className="rounded-r-lg border border-l-0 border-gray-300 bg-white">
                      <option value="per job">per job</option>
                      <option value="per hour">per hour</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration</label>
                  <div className="flex">
                    <input type="number" name="duration.estimated" value={service.duration.estimated} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-l-lg" min="1" />
                    <select name="duration.unit" value={service.duration.unit} onChange={handleInputChange} className="rounded-r-lg border border-l-0 border-gray-300 bg-white">
                      <option value="minute">minute(s)</option>
                      <option value="hour">hour(s)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">
                ③ Service Details
              </h2>
              <div className="space-y-6">
                {renderListInputs('included', "What's Included", "e.g. Labour & tools, 30-day warranty")}
                {renderListInputs('excluded', "What's Not Included", "e.g. Spare parts cost, Travel charges")}
                {renderListInputs('requirements', "Customer Requirements", "e.g. Running water supply, Clear access")}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">
                ④ Service Images
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Images ({totalImages}/{maxImages})</label>
                {totalImages >= maxImages ? (
                  <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    You have reached the maximum limit of {maxImages} images.
                  </div>
                ) : (
                  <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                          <span>Upload files</span>
                          <input id="file-upload" name="images" type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" disabled={totalImages >= maxImages} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {existingImageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={getFullImageUrl(url)} alt="Existing service" className="h-24 w-full object-cover rounded-lg" />
                      <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {newImagePreviews.map((previewUrl, index) => (
                    <div key={index} className="relative group">
                      <img src={previewUrl} alt="New service preview" className="h-24 w-full object-cover rounded-lg" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="pt-6 border-t">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center w-full px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                {isSubmitting ? 'Saving...' : (id ? 'Save Changes →' : 'List My Service →')}
              </button>
              {!id && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  Your service will be live within 24 hours after review.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};