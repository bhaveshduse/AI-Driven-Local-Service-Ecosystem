import { useForm } from 'react-hook-form';
import apiClient from '../services/apiClient';
import { toast } from 'react-hot-toast';
import { Lock, Loader2 } from 'lucide-react';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<ChangePasswordFormData>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    const toastId = toast.loading('Changing password...');

    try {
      await apiClient.put('/users/profile/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      toast.success('Password changed successfully!', { id: toastId });
      reset(); // Clear form fields
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message, { id: toastId });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Change Password</h2>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="password"
              {...register('currentPassword', { required: 'Current password is required.' })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="password"
              {...register('newPassword', {
                required: 'New password is required.',
                minLength: { value: 6, message: 'Password must be at least 6 characters long.' },
              })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your new password.',
                validate: (value) => value === watch('newPassword') || 'The passwords do not match.',
              })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center">
          {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;