import React, { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient'; // Assuming you have an API client

interface DocumentUploadFormProps {
  onClose: () => void;
  onSuccess: () => void; // To trigger a re-fetch of vendor data
}

export const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({ onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('identityProof', selectedFile);

    try {
      await apiClient.put('/vendors/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully! It is now pending review.');
      onSuccess(); // Trigger re-fetch
      onClose();   // Close the modal
    } catch (error) {
      console.error('Document upload failed:', error);
      toast.error('Document upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Upload Identity Document</h2>
        <p className="text-gray-600 mb-4">Please upload a clear image of your government-issued ID (e.g., Aadhaar Card, PAN Card).</p>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept="image/png, image/jpeg, application/pdf"
            onChange={handleFileChange}
            className="w-full p-2 border rounded mb-4"
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={isLoading || !selectedFile} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">
              {isLoading ? 'Uploading...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};