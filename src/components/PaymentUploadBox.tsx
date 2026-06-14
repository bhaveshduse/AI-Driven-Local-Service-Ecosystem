import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircle, Loader2, CreditCard, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { uploadPaymentProof } from '../services/apiClient';
import qrCode from '../assets/qr-code.png';

interface AddOn {
  _id: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; // Added 'cancelled'
  createdAt: string;
  paid?: boolean; // Assuming 'paid' flag might be added later to add-ons
}

interface Booking {
  _id: string;
  status: string;
  price: {
    amount: number;
    platformFee: number;
    vendorPayout: number;
  };
  timeline?: {
    status: string;
    note: string;
    timestamp: string;
  }[];
  addOns?: AddOn[];
  createdAt: string;
  service: {
    _id: string;
    title: string;
  };
  payment?: {
    status: string;
    [key: string]: unknown;
  };
  // Add other booking properties as needed by this component
}

interface PaymentUploadBoxProps {
  booking: Booking;
  onStatusUpdate: (updatedBooking: Booking) => void;
}

const PaymentUploadBox: React.FC<PaymentUploadBoxProps> = ({ booking, onStatusUpdate }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isAddOnPayment, setIsAddOnPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0); // Initialize with 0, will be set in useEffect

  // Only render this component if the booking is explicitly awaiting-payment or accepted
  if (booking.status !== 'awaiting-payment' && booking.status !== 'accepted') {
    return null;
  }

  useEffect(() => {
    let currentPaymentAmount = 0;
    let isCurrentlyAddOnPayment = false;
    let startTimeForTimer: Date | null = null;

    if (booking.status === 'awaiting-payment') {
      const awaitingEvent = booking.timeline?.slice().reverse().find((t: any) => t.status === 'awaiting-payment');

      if (awaitingEvent && awaitingEvent.note.includes('Awaiting payment for add-on')) {
        isCurrentlyAddOnPayment = true;
        // Sum up all approved but unpaid add-ons
        const totalUnpaidAddOns = booking.addOns?.reduce((sum: number, ao: AddOn) => {
          if (ao.status === 'approved' && !ao.paid) {
            return sum + ao.amount;
          }
          return sum;
        }, 0) || 0;
        currentPaymentAmount = totalUnpaidAddOns;
        startTimeForTimer = new Date(awaitingEvent.timestamp);
      } else {
        // This is the initial booking payment, but status is 'awaiting-payment'
        currentPaymentAmount = booking.price?.amount || 0;
        // Find the 'confirmed' or 'awaiting-payment' event to start the timer
        const confirmedOrAwaitingEvent = booking.timeline?.slice().reverse().find((t: any) => t.status === 'confirmed' || t.status === 'awaiting-payment');
        startTimeForTimer = confirmedOrAwaitingEvent ? new Date(confirmedOrAwaitingEvent.timestamp) : new Date(booking.createdAt);
      }
    } else if (booking.status === 'accepted') {
      // This is the initial booking payment, status 'accepted'
      currentPaymentAmount = booking.price?.amount || 0;
      // Timer should start from when the booking was accepted (status 'accepted') or created if no 'accepted' event.
      const acceptedEvent = booking.timeline?.slice().reverse().find((t: any) => t.status === 'accepted');
      startTimeForTimer = acceptedEvent ? new Date(acceptedEvent.timestamp) : new Date(booking.createdAt);
    }

    setPaymentAmount(currentPaymentAmount);
    setIsAddOnPayment(isCurrentlyAddOnPayment);

    let timer: ReturnType<typeof setInterval>;
    if (startTimeForTimer) {
      const expiresAt = startTimeForTimer.getTime() + 15 * 60 * 1000; // 15 Minutes

      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = expiresAt - now;

        if (diff <= 0) {
          setTimeLeft('00:00');
          setIsExpired(true);
        } else {
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          setIsExpired(false); // Ensure it's not expired if diff > 0
        }
      };

      updateTimer(); // Initial call
      timer = setInterval(updateTimer, 1000);

      return () => clearInterval(timer);
    } else {
      // If no valid startTimeForTimer, clear any existing timer and reset state
      setTimeLeft(null);
      setIsExpired(false);
    }
  }, [booking]); // Rerun when booking object changes
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a screenshot of your payment.");
    
    try {
      setLoading(true);
      const updatedBooking = await uploadPaymentProof(booking._id, file);
      
      // Update the UI state in the parent component
      onStatusUpdate(updatedBooking); 
      alert("Payment proof submitted! Waiting for Admin verification.");
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(error.response?.data?.error || "Failed to upload payment proof. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRebook = () => {
    toast.error("Your 15-minute payment window expired. Please try booking again.", {
      duration: 5000,
    });
    navigate(`/services/${booking.service._id}`);
  };

  const handleGoBack = () => {
    if (file) {
      if (window.confirm("You have selected a file. Are you sure you want to go back? Your selection will be lost.")) {
        setFile(null);
        setShowPaymentDetails(false);
      }
    } else {
      setShowPaymentDetails(false);
    }
  };

  const paymentTitle = isAddOnPayment ? "Extra Charges Payment" : "Payment Required";
  const paymentDescription = isAddOnPayment 
    ? "Please pay the approved extra charges to continue with the service."
    : "The vendor has accepted your request. Please complete your payment to secure the booking.";

  if (!showPaymentDetails) {
    return (
      <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center flex-wrap gap-2">
            {paymentTitle}
            {timeLeft && !isExpired && (
              <span className="text-sm bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full flex items-center font-medium animate-pulse">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {timeLeft} left
              </span>
            )}
            {isExpired && (
              <span className="text-sm bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-medium">
                Time Expired
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600">
            {paymentDescription}
          </p>
        </div>
        {isExpired ? (
          <button
            onClick={handleRebook}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Re-book Service
          </button>
        ) : (
          <button 
            onClick={() => setShowPaymentDetails(true)}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Pay Now
          </button>
        )}
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mt-6 bg-white p-8 rounded-xl shadow-lg border border-red-200 text-center">
        <Clock className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-800 mb-2">Payment Time Expired</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Your 15-minute window to complete the payment has closed. This booking will be automatically cancelled.
        </p>
        <button
          onClick={handleRebook}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center whitespace-nowrap mx-auto"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Re-book This Service
        </button>
      </div>
    );
  }

  // If payment proof has been submitted and is awaiting admin verification
  if (booking.payment?.status === 'verification-pending') {
    return (
      <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-green-200 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Proof Submitted!</h2>
        <p className="text-gray-600 mb-4">
          Thank you for uploading your payment screenshot. Our admin team is now reviewing it.
          You will receive a notification once your payment is verified and the booking is confirmed.
        </p>
        <p className="text-sm text-gray-500">
          Booking ID: #{booking._id.slice(-8)} for {booking.service.title}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
      <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800">{isAddOnPayment ? 'Pay for Approved Extras' : 'Vendor Accepted! Secure Your Booking'}</h2>
          {timeLeft && !isExpired && (
            <span className="text-sm bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full flex items-center font-medium animate-pulse">
              {timeLeft} left
            </span>
          )}
          {isExpired && (
            <span className="text-sm bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-medium">
              Time Expired
            </span>
          )}
        </div>
        <button 
          onClick={handleGoBack}
          className="text-gray-500 hover:text-gray-800 flex items-center text-sm font-medium transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Go Back
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        The vendor is ready to begin. Please scan the QR code below using any UPI app (GPay, PhonePe, Paytm). Once paid, upload the screenshot to verify and confirm your booking.
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        {/* QR Code Section */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200">
          <img src={qrCode} alt="UPI QR Code" className="w-48 h-48 object-contain mix-blend-multiply mb-2" />
          <div className="text-center">
            <p className="text-sm text-gray-500">Amount to Pay</p>
            <p className="text-2xl font-bold text-blue-700">₹{paymentAmount}</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="flex-1 flex flex-col justify-center">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Payment Screenshot *
          </label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
            required
          />
          
          <button 
            type="submit" 
            disabled={loading || !file || isExpired}
            className="w-full mt-auto px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Verifying...</> : 'Submit Payment Proof'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentUploadBox;