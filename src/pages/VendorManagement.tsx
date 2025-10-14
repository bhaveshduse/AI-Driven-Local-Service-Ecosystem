import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Eye, RefreshCw } from 'lucide-react';

// ===============================================
// 1. TYPE DEFINITIONS
// ===============================================

interface User {
    _id: string;
    name: string;
    email: string;
    phone: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
}

interface Vendor {
    _id: string;
    user: User | null;
    businessName: string;
    services: string[];
    serviceCategories: string[];
    experience: number;
    portfolio: any[];
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verifiedBy?: string;
    verificationDate?: string;
    [key: string]: any;
}

interface VendorApiResponse {
    vendors: Vendor[];
    totalPages: number;
    currentPage: number;
}

// ===============================================
// 2. API CONFIGURATION & COMPONENT
// ===============================================

const getAdminToken = (): string | null => localStorage.getItem('admin_token');
const API_BASE_URL = 'http://localhost:5000/api/admin';

const VendorManagement: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [filterStatus, setFilterStatus] = useState<'all' | Vendor['verificationStatus']>('all');

    // --- Data Fetching ---
    const fetchVendors = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const adminToken = getAdminToken();
        if (!adminToken) {
            setError("Authentication token missing. Please log in.");
            setIsLoading(false);
            return;
        }

        try {
            const query = new URLSearchParams({
                status: filterStatus,
                page: String(currentPage),
                limit: '10'
            });
            const url = `${API_BASE_URL}/vendors?${query.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch vendors: ${response.status}`);
            }

            const data: VendorApiResponse = await response.json();
            setVendors(data.vendors);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);

        } catch (err: any) {
            console.error("Error fetching vendor list:", err.message);
            setError("Could not load vendor data. Check network or server logs.");
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, filterStatus]);

    // --- Verification/Action Handler ---
    const handleVerificationAction = async (vendorId: string, isVerified: boolean) => {
        const adminToken = getAdminToken();
        if (!adminToken) {
            alert("Admin token missing. Cannot perform action.");
            return;
        }

        const verificationStatus = isVerified ? 'verified' : 'rejected';
        const url = `${API_BASE_URL}/vendors/${vendorId}/verify`;

        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ isVerified })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update status.`);
            }

            alert(`Vendor ${vendorId} status updated to ${verificationStatus}`);
            fetchVendors();
        } catch (err: any) {
            alert(`Error updating vendor status: ${err.message}`);
        }
    };

    // --- Initial Load ---
    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    // --- Render ---
    if (isLoading) return <div className="p-8 text-center text-gray-600">Loading vendor list...</div>;
    if (error) return <div className="p-8 text-center bg-red-100 text-red-700">{error}</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Vendor Management</h1>
                <button
                    onClick={fetchVendors}
                    className="flex items-center space-x-1 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh List</span>
                </button>
            </div>

            <div className="mb-6 flex space-x-4 bg-white p-4 rounded-lg shadow-sm">
                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value as 'all' | Vendor['verificationStatus']);
                        setCurrentPage(1);
                    }}
                    className="border border-gray-300 p-2 rounded-md"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {vendors.length > 0 ? (
                            vendors.map((vendor) => (
                                <tr key={vendor._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.businessName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.user?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.user?.email || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.serviceCategories.join(', ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            vendor.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                            vendor.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {vendor.verificationStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.user?.isActive ? 'Yes' : 'No'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">


                                        {/* Pending → Verify */}
                                        {vendor.verificationStatus === 'pending' && (
                                        <div className="flex space-x-2">
                                            {/* Verify / Tick */}
                                            <button 
                                            title="Verify Vendor"
                                            onClick={() => handleVerificationAction(vendor._id, true)} 
                                            className="text-green-600 hover:text-green-900"
                                            >
                                            <Check className="h-5 w-5" />
                                            </button>

                                            {/* Reject / Cross */}
                                            <button 
                                            title="Reject Vendor"
                                            onClick={() => handleVerificationAction(vendor._id, false)} 
                                            className="text-red-600 hover:text-red-900"
                                            >
                                            <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                        )}


                                        {/* Verified → Revoke */}
                                        {vendor.verificationStatus === 'verified' && (
                                            <button 
                                                title="Revoke Verification"
                                                onClick={() => handleVerificationAction(vendor._id, false)} 
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}

                                        {/* Rejected → Optional Re-verify */}
                                        {vendor.verificationStatus === 'rejected' && (
                                            <button 
                                                title="Re-verify Vendor"
                                                onClick={() => handleVerificationAction(vendor._id, true)} 
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                    No vendors found with the current filter settings.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default VendorManagement;
