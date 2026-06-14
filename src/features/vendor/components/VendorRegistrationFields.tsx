import React from 'react';
import { UseFormRegister, Control, Controller, FieldErrors } from 'react-hook-form';
import { Building } from 'lucide-react';

// This should match the form data shape in your main RegisterPage.tsx
interface RegisterFormData {
  businessName: string;
  primaryCategory: string;
  serviceCategories: string[];
  suggestedCategory: string;
  // ... other registration fields
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface VendorRegistrationFieldsProps {
  register: UseFormRegister<RegisterFormData>;
  control: Control<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
  categories: Category[];
}

export const VendorRegistrationFields: React.FC<VendorRegistrationFieldsProps> = ({ register, control, errors, categories }) => {
  return (
    <div className="space-y-6 mt-6 border-t pt-6">
      <h3 className="text-lg font-medium text-gray-800">Tell us about your business</h3>
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
            placeholder="e.g., Acme Plumbing Co."
          />
        </div>
        {errors.businessName && (
          <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
        )}
      </div>

      {/* Primary Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Service Category
        </label>
        <select
          {...register("primaryCategory", { required: "Please select your main category." })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Primary Category --</option>
          {categories.map((category) => (
            <option key={category._id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.primaryCategory && <p className="text-red-500 text-sm mt-1">{errors.primaryCategory.message}</p>}
      </div>

      {/* Additional Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Service Categories (Optional)
        </label>
        <Controller
          name="serviceCategories"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <label key={category._id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={field.value.includes(category.slug)}
                    onChange={() => {
                      const newCategories = field.value.includes(category.slug)
                        ? field.value.filter((c) => c !== category.slug)
                        : [...field.value, category.slug];
                      field.onChange(newCategories);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm capitalize text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
          )}
        />
      </div>

      {/* Custom Category Suggestion */}
      <div>
        <label htmlFor="suggestedCategory" className="block text-sm font-medium text-gray-700 mb-2">
          Don't see your category? Suggest one.
        </label>
        <input
          type="text"
          id="suggestedCategory"
          {...register("suggestedCategory")}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Antique Clock Repair"
        />
      </div>
    </div>
  );
};