import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

// Define a type for the vendor data you expect
interface Vendor {
  verificationStatus: 'not-submitted' | 'pending' | 'verified' | 'rejected';
  adminNotes?: string;
}

interface VerificationStatusProps {
  vendor: Vendor;
  onUploadClick: () => void; // Function to show the upload form
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({ vendor, onUploadClick }) => {
  switch (vendor.verificationStatus) {
    case 'verified':
      return (
        <div className="flex items-start p-4 mb-6 bg-green-100 text-green-800 rounded-lg border border-green-200">
          <ShieldCheck className="w-6 h-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Profile Verified</h3>
            <p>Your profile is verified and live. You can now receive bookings.</p>
          </div>
        </div>
      );

    case 'pending':
      return (
        <div className="flex items-start p-4 mb-6 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200">
          <ShieldAlert className="w-6 h-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Verification Pending</h3>
            <p>Your documents are under review. This usually takes 1-2 business days.</p>
          </div>
        </div>
      );

    case 'rejected':
      return (
        <div className="flex items-start p-4 mb-6 bg-red-100 text-red-800 rounded-lg border border-red-200">
          <ShieldX className="w-6 h-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Verification Rejected</h3>
            {vendor.adminNotes && <p className="mb-3"><strong>Admin Feedback:</strong> {vendor.adminNotes}</p>}
            <p>Please review the feedback, update any necessary information, and re-submit your documents.</p>
            <div className="flex items-center space-x-4 mt-4">
                <Link to="/vendor/profile" className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium">
                    Update Profile Info
                </Link>
                <button onClick={onUploadClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Re-upload Documents
                </button>
            </div>
          </div>
        </div>
      );

    case 'not-submitted':
    default:
      return (
        <div className="flex items-start p-4 mb-6 bg-blue-100 text-blue-800 rounded-lg border border-blue-200">
          <Shield className="w-6 h-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Complete Your Verification</h3>
            <p className="mb-3">To start accepting bookings, please complete the following steps:</p>
            <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>Ensure your <Link to="/vendor/profile" className="font-semibold underline hover:text-blue-900">Business Profile</Link> is complete and accurate.</li>
                <li>Upload a clear identity document (e.g., Aadhaar, PAN card).</li>
            </ol>
            <button onClick={onUploadClick} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Upload Documents
            </button>
          </div>
        </div>
      );
  }
};