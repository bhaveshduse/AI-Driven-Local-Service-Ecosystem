import ChangePasswordForm from '../../components/ChangePasswordForm';

const AdminSettingsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Account Settings</h1>
        <ChangePasswordForm />
        
      </div>
    </div>
  );
};

export default AdminSettingsPage;