import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { User, Building, MapPin, FileText, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/Avatar";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { toast } from 'react-hot-toast';
import { getImageUrl } from "../../utils/helpers";

interface Category {
  id: string;
  name: string;
}

interface ProfileFormData {
  businessName: string;
  experience: number;
  serviceCategories: string[];
  description: string;
  cities: string;
  city: string;
  radius: number;
  street: string;
  state: string;
  zipCode: string;
  identityProof: FileList | null;
}

export const VendorProfile = () => {
  const { token, user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("business");
  const [categories, setCategories] = useState<Category[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    defaultValues: {
      businessName: '',
      experience: 1,
      serviceCategories: [],
      description: '',
      cities: '',
      city: '',
      radius: 10,
      street: '',
      state: '',
      zipCode: '',
      identityProof: null,
    },
  });

  const identityProofFile = watch('identityProof');

  // Fetch vendor profile when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/services/categories/list");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        // Silently fail on categories; the form is still usable.
      }
    };

    const fetchVendor = async () => {
      if (!token) return;
      try {
        const res = await fetch("/api/vendors/profile", {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        reset({
          businessName: data.businessName || '',
          experience: Number(data.experience) || 1,
          serviceCategories: data.serviceCategories || [],
          description: data.description || '',
          cities: (data.serviceArea?.cities || []).join(', '),
          city: data.user?.city || '',
          radius: Number(data.serviceArea?.radius) || 10,
          street: data.user?.address?.street || '',
          state: data.user?.address?.state || '',
          zipCode: data.user?.address?.zipCode || '',
        });
      } catch (error) {
        toast.error("Could not load your profile data. Please try refreshing.");
      }
    };
    fetchVendor();
    fetchCategories();
  }, [token, reset]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file || !token) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const res = await fetch('/api/users/profile/avatar', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to upload avatar.');
        }

        const updatedUser = await res.json();
        updateUser(updatedUser); // Update context
        toast.success('Avatar updated successfully!');

    } catch (error: any) {
        toast.error(error.message || 'Failed to upload avatar.');
    } finally {
        setIsUploading(false);
    }
};

  // Save profile
  const onSubmit = async (data: ProfileFormData) => {
    if (!token) return;

    try {
      const formData = new FormData();
      formData.append("businessName", data.businessName);
      formData.append("experience", data.experience.toString());
      formData.append("serviceCategories", JSON.stringify(data.serviceCategories));
      formData.append("description", data.description);
      formData.append("cities", JSON.stringify(data.cities.split(",").map((c) => c.trim())));
      formData.append("city", data.city);
      formData.append("radius", data.radius.toString());
      formData.append("street", data.street);
      formData.append("state", data.state);
      formData.append("zipCode", data.zipCode);
      if (data.identityProof && data.identityProof.length > 0) {
        formData.append("identityProof", data.identityProof[0]);
      }

      const res = await fetch("/api/vendors/profile", {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("business")}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === "business"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Business Profile
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === "security" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Security
                </button>
              </nav>
            </div>
          </div>

          {/* Profile Tab */}
          <div className="lg:col-span-3">
            {activeTab === "business" && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  Business Profile
                </h2>

                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                  {/* Profile Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <Avatar src={getImageUrl(user?.avatar)} name={user?.name || ''} className="w-24 h-24" />
                        {isUploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        ref={fileInputRef}
                        disabled={isUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        {...register("businessName", { required: "Business name is required." })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {errors.businessName && (
                      <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
                    )}
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level
                    </label>
                    <select
                      {...register("experience", { valueAsNumber: true })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Beginner (0–1 year)</option>
                      <option value={3}>Intermediate (2–4 years)</option>
                      <option value={5}>Moderate (5–9 years)</option>
                      <option value={10}>Experienced (10+ years)</option>
                    </select>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Categories
                    </label>
                    <Controller
                      name="serviceCategories"
                      control={control}
                      rules={{ validate: value => value.length > 0 || 'Please select at least one category.' }}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {categories.map((category) => (
                            <label key={category.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.value.includes(category.id)}
                                onChange={() => {
                                  const newCategories = field.value.includes(category.id)
                                    ? field.value.filter((c) => c !== category.id)
                                    : [...field.value, category.id];
                                  field.onChange(newCategories);
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm capitalize text-gray-700">
                                {category.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    />
                    {errors.serviceCategories && <p className="text-red-500 text-sm mt-1">{errors.serviceCategories.message}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Description
                    </label>
                    <textarea
                      rows={4}
                      {...register("description")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Business Address */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Business Address</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Business City</label>
                        <input type="text" {...register("city", { required: "Primary business city is required." })} placeholder="e.g., Nashik" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                        <input type="text" {...register("street")} placeholder="e.g., 123 Main St" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                          <input type="text" {...register("state")} placeholder="e.g., Maharashtra" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                          <input type="text" {...register("zipCode")} placeholder="e.g., 400001" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Area */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Service Area</h3>
                    <p className="text-sm text-gray-500 mb-4">Define where you offer your services.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          {...register("cities")}
                          placeholder="Cities (comma separated)"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <select
                          {...register("radius", { valueAsNumber: true })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={5}>Up to 5 km</option>
                          <option value={10}>Up to 10 km</option>
              
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Identity Proof Upload */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-6">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Identity Proof (Aadhaar / PAN / License)
                    </label>
                    <p className="text-xs text-blue-700 mb-3">
                      Upload a clear image or PDF to get the "Verified" badge.
                    </p>
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-blue-500" />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        {...register("identityProof")}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                      />
                    </div>
                    {identityProofFile && identityProofFile.length > 0 && <p className="text-xs text-green-600 mt-2">Selected: {identityProofFile[0].name}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {isSubmitting ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </div>
            )}
            {activeTab === "security" && (
              <ChangePasswordForm />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
