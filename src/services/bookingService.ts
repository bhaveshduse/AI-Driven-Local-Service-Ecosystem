import apiClient from './apiClient';

export interface BookingPayload {
  customer?: string;
  service: string;
  vendor: string;
  scheduledDate: string;
  price: {
    amount: number;
    currency: string;
  };
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
  notes: {
    customerNotes: string;
  };
}

/**
 * Creates a new booking.
 * @param payload - The booking data.
 * @param token - The user's authentication token.
 * @returns A promise that resolves to the newly created booking object.
 */
export const createBooking = async (payload: BookingPayload, token: string) => {
  const response = await apiClient.post('/api/bookings', payload, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};