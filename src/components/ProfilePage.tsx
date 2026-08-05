import CustomerProfileForm from '../features/customer/CustomerProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';

const ProfilePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <CustomerProfileForm />
        <ChangePasswordForm />
      </div>
    </div>
  );
};

export default ProfilePage;