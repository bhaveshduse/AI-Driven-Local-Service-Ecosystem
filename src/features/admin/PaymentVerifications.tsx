import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { CheckCircle, AlertCircle, ArrowLeft, RefreshCw, Image as ImageIcon, Undo, X, SearchX, Banknote } from 'lucide-react';

export const PaymentVerifications: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'verifications' | 'refunds' | 'payouts'>('verifications');
    const [verifications, setVerifications] = useState<any[]>([]);
    const [refunds, setRefunds] = useState<any[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

    const fetchPendingVerifications = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // Fetch recent bookings to grab both verifications and cancelled/rejected jobs
            const res = await fetch('/api/admin/bookings?limit=300', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const allBookings = data.bookings || [];
                
                setVerifications(allBookings.filter((b: any) => b.payment?.status === 'verification-pending'));
                
                // Needs refund if it was marked refund_pending OR if the job was cancelled/rejected after escrow was paid
                setRefunds(allBookings.filter((b: any) => 
                    b.payment?.status === 'refund_pending' || 
                    (['cancelled', 'rejected'].includes(b.status) && ['paid_to_platform', 'verification-pending'].includes(b.payment?.status))
                ));

                // Needs payout to vendor if the job is completed and money is held by platform
                setPayouts(allBookings.filter((b: any) => b.payment?.status === 'payout_pending'));
            }
        } catch (err) {
            console.error("Failed to fetch payment verifications", err);
            toast.error("Failed to load verifications.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPendingVerifications();
    }, [fetchPendingVerifications]);

    const handleVerifyAndDispatch = async (bookingId: string) => {
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/verify-payment`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) throw new Error('Payment verification failed');
            
            toast.success('Payment verified & Vendor notified!');
            console.log(`[Admin Dispatch] Triggering 120s vendor panic timer for booking: ${bookingId}`);
            setVerifications(prev => prev.filter(b => b._id !== bookingId));
        } catch {
            toast.error('Payment verification failed');
        }
    };

    const handleRejectPayment = async (bookingId: string) => {
        const reason = window.prompt("Enter reason for rejecting this payment proof (e.g., 'Fake screenshot', 'Amount mismatch'):");
        if (reason === null) return; // User clicked Cancel on the prompt

        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/reject-payment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });
            
            if (!res.ok) throw new Error('Rejection failed');
            
            toast.success('Payment proof rejected and booking cancelled.');
            setVerifications(prev => prev.filter(b => b._id !== bookingId));
        } catch {
            toast.error('Failed to reject payment proof');
        }
    };

    const handleProcessRefund = async (bookingId: string) => {
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/refund`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Refund processing failed');
            
            toast.success('Refund processed successfully!');
            setRefunds(prev => prev.filter(b => b._id !== bookingId));
        } catch {
            toast.error('Failed to process refund');
        }
    };

    const handleProcessPayout = async (bookingId: string) => {
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}/payout`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Payout processing failed');
            
            toast.success('Funds released to vendor successfully!');
            setPayouts(prev => prev.filter(b => b._id !== bookingId));
        } catch {
            toast.error('Failed to release funds');
        }
    };

    const activeList = activeTab === 'verifications' ? verifications : activeTab === 'refunds' ? refunds : payouts;

    if (isLoading) {
        return (
            <div className="p-8 text-center text-gray-600">
                Loading payment verifications...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center">
                        <button 
                            onClick={() => navigate('/admin/dashboard')}
                            className="mr-4 p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 mb-1">Finance & Payments</h1>
                            <p className="text-gray-600">Review manual payments, process refunds, and release vendor payouts.</p>
                        </div>
                    </div>
                    <button 
                        onClick={fetchPendingVerifications}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-700 font-medium">Refresh</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('verifications')} 
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'verifications' ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Pending Verifications ({verifications.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('refunds')} 
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'refunds' ? 'border-red-600 text-red-600 bg-red-50/50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Refunds Required ({refunds.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('payouts')} 
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payouts' ? 'border-green-600 text-green-600 bg-green-50/50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Vendor Payouts ({payouts.length})
                    </button>
                </div>

                {/* Proper Structured List View */}
                <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
                    {activeList.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service / Vendor</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Paid</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proof</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activeList.map((booking: any) => (
                                        <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">#{booking._id.slice(-6)}</div>
                                                <div className="text-xs text-gray-500">{new Date(booking.createdAt).toLocaleString()}</div>
                                                {activeTab === 'refunds' && (
                                                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 capitalize">
                                                        {booking.status}
                                                    </span>
                                                )}
                                                {activeTab === 'payouts' && (
                                                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 capitalize">
                                                        {booking.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{booking.customer?.name}</div>
                                                <div className="text-xs text-gray-500">{booking.customer?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={booking.service?.title}>{booking.service?.title}</div>
                                                <div className="text-xs text-gray-500">by {booking.vendor?.businessName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-green-600">₹{booking.price?.amount || 'N/A'}</div>
                                                <div className="text-xs text-gray-500">By Customer</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {booking.payment?.screenshot ? (
                                                    <button 
                                                        onClick={() => setSelectedScreenshot(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${booking.payment.screenshot}`)}
                                                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        <ImageIcon className="w-4 h-4 mr-1" /> View Image
                                                    </button>
                                                ) : (
                                                    <span className="text-sm text-gray-400 flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> No proof</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {activeTab === 'verifications' ? (
                                                    <div className="flex justify-end space-x-2">
                                                        <button onClick={() => handleVerifyAndDispatch(booking._id)} className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
                                                            <CheckCircle className="h-4 w-4 mr-1.5" /> Verify Payment
                                                        </button>
                                                        <button onClick={() => handleRejectPayment(booking._id)} className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
                                                            <X className="h-4 w-4 mr-1.5" /> Reject
                                                        </button>
                                                    </div>
                                                ) : activeTab === 'refunds' ? (
                                                    <button onClick={() => handleProcessRefund(booking._id)} className="inline-flex items-center px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
                                                        <Undo className="h-4 w-4 mr-1.5" /> Process Refund
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleProcessPayout(booking._id)} className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
                                                        <Banknote className="h-4 w-4 mr-1.5" /> Release Funds
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center">
                            <SearchX className="h-16 w-16 text-gray-300 mb-4" />
                            <h2 className="text-xl font-bold text-gray-700 mb-1">No pending {activeTab}</h2>
                            <p className="text-gray-500">All caught up! There are currently no transactions requiring manual action.</p>
                        </div>
                    )}
                    </div>
            </div>

            {/* Floating Image Modal */}
            {selectedScreenshot && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedScreenshot(null)}>
                    <div className="bg-white p-2 rounded-xl max-w-4xl w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3 px-3 pt-2">
                            <h3 className="font-bold text-lg text-gray-800">Customer Payment Proof</h3>
                            <button onClick={() => setSelectedScreenshot(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500 hover:text-gray-900"/>
                            </button>
                        </div>
                        <img src={selectedScreenshot} alt="Payment Proof" className="w-full max-h-[80vh] object-contain rounded-lg bg-gray-50" />
                    </div>
                </div>
            )}
        </div>
    );
};