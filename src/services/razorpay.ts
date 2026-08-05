import apiClient from './apiClient';

interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface RazorpaySuccessCallback {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export async function createRazorpayOrder(bookingId: string): Promise<RazorpayOrderResponse> {
  const res = await apiClient.post('/payments/create-order', { bookingId });
  return res.data;
}

export async function verifyRazorpayPayment(bookingId: string, details: RazorpaySuccessCallback) {
  const res = await apiClient.post('/payments/verify', {
    bookingId,
    ...details,
  });
  return res.data;
}

export function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency,
  name,
  description,
  prefill,
  onSuccess,
  onError,
}: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { email?: string; contact?: string; name?: string };
  onSuccess: (details: RazorpaySuccessCallback) => void;
  onError?: (error: any) => void;
}) {
  if (!(window as any).Razorpay) {
    if (onError) onError(new Error('Razorpay SDK not loaded.'));
    return;
  }

  const options = {
    key: keyId,
    amount,
    currency,
    name,
    description,
    order_id: orderId,
    prefill: {
      name: prefill?.name || '',
      email: prefill?.email || '',
      contact: prefill?.contact || '',
    },
    handler: function (response: any) {
      onSuccess({
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: function () {
        if (onError) onError(new Error('Payment cancelled by user.'));
      },
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
