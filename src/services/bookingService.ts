import apiClient from './apiClient';

export interface BookingPayload {
  customer?: string;
  service: string;
  vendor: string;
  scheduledDate: string;
  price: {
    amount: number;
    currency?: string;
  };
  address: {
    street: string;
    city: string;
    zipCode: string;
    coordinates: {
        lat: number;
        lon: number;
    }
  };
  notes?: {
    customerNotes: string;
  };
  paymentMethod?: 'manual' | 'gateway';
}

/**
 * Creates a new booking.
 * @param payload - The booking data.
 * @returns A promise that resolves to the newly created booking object.
 */
export const createBooking = async (payload: BookingPayload) => {
  // The path was incorrect, causing a 404 error with a duplicated /api path.
  // The apiClient is already configured with a baseURL of '/api'.
  // The auth token is also automatically added by the apiClient interceptor.
  const response = await apiClient.post('/bookings', payload);
  return response.data;
};