import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import { Loader2, AlertCircle, MapPin, Mail, Phone, Briefcase, User, Calendar, ShieldCheck, XCircle, FileText, ArrowLeft } from 'lucide-react';

// Re-using/extending interfaces from VendorManagement.tsx and other files
interface UserDetails {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address?: {
        street?: string;
        city?: string;
        zipCode?: string;
        coordinates?: number[]; // [lon, lat]
    };
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    avatar?: string;
}

interface ServiceDetails {
    _id: string;
    title: string;
    description: string;
    category: string;
    pricing: { type: string; amount: number; unit: string; };
    isActive: boolean;
    images: string[];
    createdAt: string;
}

interface AdminDetails {
    _id: string;
    name: string;
    email: string;
}

interface VendorFullDetails {
    _id: string;
    user: UserDetails;
    businessName: string;
    services: ServiceDetails[]; // Populated services
    primaryCategory: string;
    serviceCategories: string[];
    serviceArea: {
        radius: number;
        cities: string[];
    };
    experience: number;
    description: string;
    portfolio: string[]; // Image URLs
    documents: {
        businessLicense?: string;
        insurance?: string;
        certifications?: string[];
        identityProof?: string;
    };
    verificationStatus: 'not-submitted' | 'pending' | 'verified' | 'rejected';
    adminNotes?: string;
    verifiedBy?: AdminDetails; // Populated admin
    verificationDate?: string;
    createdAt: string;
    updatedAt: string;
}

export const VendorDetailAdminView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [vendorDetails, setVendorDetails] = useState<VendorFullDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVendorDetails = useCallback(async () => {
        if (!token || !id) {
            setError("Authentication token or vendor ID missing.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.get<VendorFullDetails>(`/admin/vendors/${id}/details`);
            setVendorDetails(response.data);
        } catch (err: any) {
            console.error("Error fetching vendor details:", err);
            setError(err.response?.data?.error || "Failed to load vendor details.");
            toast.error(err.response?.data?.error || "Failed to load vendor details.");
        } finally {
            setIsLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        fetchVendorDetails();
    }, [fetchVendorDetails]);

    const handleViewDocument = (path: string) => {
        const url = `/${path.replace(/\\/g, '/')}`;
        window.open(url, '_blank');
        toast.success('Document opened in new tab.');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Details</h2>
                    <p className="text-gray-600">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!vendorDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Vendor Not Found</h2>
                    <p className="text-gray-600">The vendor you are looking for does not exist or has been removed.</p>
                    <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const { user: vendorUser, services, documents, serviceArea, verificationStatus, verifiedBy, verificationDate, adminNotes, ...vendorInfo } = vendorDetails;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'not-submitted': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center text-blue-600 hover:text-blue-800">
                        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Vendor Management
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Vendor Details</h1>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
                    {/* Business Information */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                            {vendorInfo.businessName}
                            <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(verificationStatus)}`}>
                                {verificationStatus.replace('-', ' ')}
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-gray-600 mb-2"><strong>Primary Category:</strong> {vendorInfo.primaryCategory}</p>
                                <p className="text-gray-600 mb-2"><strong>Service Categories:</strong> {vendorInfo.serviceCategories.join(', ') || 'N/A'}</p>
                                <p className="text-gray-600 mb-2"><strong>Experience:</strong> {vendorInfo.experience} years</p>
                                <p className="text-gray-600 mb-2"><strong>Description:</strong> {vendorInfo.description || 'No description provided.'}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 mb-2"><strong>Service Radius:</strong> {serviceArea.radius} km</p>
                                <p className="text-gray-600 mb-2"><strong>Service Cities:</strong> {serviceArea.cities.join(', ') || 'N/A'}</p>
                                <p className="text-gray-600 mb-2"><strong>Joined:</strong> {new Date(vendorInfo.createdAt).toLocaleDateString()}</p>
                                {verificationStatus === 'verified' && verifiedBy && (
                                    <p className="text-gray-600 mb-2"><strong>Verified By:</strong> {verifiedBy.name} ({verifiedBy.email}) on {new Date(verificationDate!).toLocaleDateString()}</p>
                                )}
                                {verificationStatus === 'rejected' && adminNotes && (
                                    <p className="text-red-600 mb-2"><strong>Admin Notes (Rejection):</strong> {adminNotes}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vendor User Account Details */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Account Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-gray-600 mb-2"><strong>Name:</strong> {vendorUser.name}</p>
                                <p className="text-gray-600 mb-2 flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-500" /><strong>Email:</strong> {vendorUser.email}</p>
                                <p className="text-gray-600 mb-2 flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-500" /><strong>Phone:</strong> {vendorUser.phone}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 mb-2"><strong>User Status:</strong> {vendorUser.isActive ? 'Active' : 'Inactive'}</p>
                                <p className="text-gray-600 mb-2"><strong>Email Verified:</strong> {vendorUser.isVerified ? 'Yes' : 'No'}</p>
                                {vendorUser.address && (
                                    <p className="text-gray-600 mb-2 flex items-center"><MapPin className="h-4 w-4 mr-2 text-gray-500" /><strong>Address:</strong> {vendorUser.address.street}, {vendorUser.address.city}, {vendorUser.address.zipCode}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    {documents && (documents.identityProof || documents.businessLicense || documents.insurance || (documents.certifications && documents.certifications.length > 0)) && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Documents</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {documents.identityProof && (
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <p className="text-gray-700">Identity Proof</p>
                                        <button onClick={() => handleViewDocument(documents.identityProof!)} className="text-blue-600 hover:underline text-sm">View</button>
                                    </div>
                                )}
                                {documents.businessLicense && (
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <p className="text-gray-700">Business License</p>
                                        <button onClick={() => handleViewDocument(documents.businessLicense!)} className="text-blue-600 hover:underline text-sm">View</button>
                                    </div>
                                )}
                                {documents.insurance && (
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <p className="text-gray-700">Insurance</p>
                                        <button onClick={() => handleViewDocument(documents.insurance!)} className="text-blue-600 hover:underline text-sm">View</button>
                                    </div>
                                )}
                                {documents.certifications && documents.certifications.length > 0 && (
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <p className="text-gray-700">Certifications ({documents.certifications.length})</p>
                                        {documents.certifications.map((cert, index) => (
                                            <button key={index} onClick={() => handleViewDocument(cert)} className="text-blue-600 hover:underline text-sm">View {index + 1}</button>
                                        ))}
                                    </div>
                                )}
                                {(!documents.identityProof && !documents.businessLicense && !documents.insurance && (!documents.certifications || documents.certifications.length === 0)) && (
                                    <p className="text-gray-600 italic">No documents uploaded.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Portfolio */}
                    {vendorInfo.portfolio && vendorInfo.portfolio.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Portfolio</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {vendorInfo.portfolio.map((image, index) => (
                                    <img key={index} src={`/${image.replace(/\\/g, '/')}`} alt={`Portfolio ${index + 1}`} className="w-full h-32 object-cover rounded-lg shadow-sm" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Services Offered */}
                    {services && services.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Services Offered ({services.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {services.map(service => (
                                    <div key={service._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="font-semibold text-lg text-gray-900">{service.title}</h4>
                                        <p className="text-sm text-gray-600">Category: {service.category}</p>
                                        <p className="text-sm text-gray-600">Price: ₹{service.pricing.amount} {service.pricing.unit}</p>
                                        <p className={`text-sm font-medium ${service.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            {service.isActive ? 'Active' : 'Inactive'}
                                        </p>
                                        {service.images && service.images.length > 0 && (
                                            <img src={`/${service.images[0].replace(/\\/g, '/')}`} alt={service.title} className="mt-3 w-full h-24 object-cover rounded-md" />
                                        )}
                                        <Link to={`/admin/catalog/services/${service._id}`} className="mt-3 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm">
                                            View Service in Catalog
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};