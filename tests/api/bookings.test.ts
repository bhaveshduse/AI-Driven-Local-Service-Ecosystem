import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createTestApp, signToken } from '../helpers/testApp.js';
import { createUser, createVendor, createService, createBooking } from '../helpers/factories.js';
import type { Express } from 'express';

let app: Express;
let request: supertest.SuperTest<supertest.Test>;

vi.mock('../../server/utils/sendEmail.js', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../server/utils/geocoder.js', () => ({
  geocodeAddress: vi.fn().mockResolvedValue([72.8777, 19.0760]),
}));

describe('Booking API', () => {
  beforeAll(() => {
    app = createTestApp();
    request = supertest(app);
  });

  describe('POST /api/bookings', () => {
    it('should create a booking as customer', async () => {
      const customer = await createUser({ role: 'customer' });
      const { vendor } = await createVendor();
      const service = await createService(vendor._id);
      const token = signToken(customer);

      const res = await request
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendor: vendor._id,
          service: service._id,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          price: { amount: 500 },
          address: {
            street: '123 Test St',
            city: 'Mumbai',
            zipCode: '400001',
            coordinates: { lat: 19.0760, lon: 72.8777 },
          },
          paymentMethod: 'manual',
        })
        .expect(201);

      expect(res.body.status).toBe('pending');
      expect(res.body.customer).toBeDefined();
    });

    it('should reject booking without address coordinates', async () => {
      const customer = await createUser({ role: 'customer' });
      const { vendor } = await createVendor();
      const service = await createService(vendor._id);
      const token = signToken(customer);

      const res = await request
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendor: vendor._id,
          service: service._id,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          price: { amount: 500 },
          address: { street: '123 Test St', city: 'Mumbai', zipCode: '400001' },
        })
        .expect(400);

      expect(res.body.error).toMatch(/coordinates/i);
    });

    it('should reject booking from non-customer role', async () => {
      const vendorUser = await createUser({ role: 'vendor' });
      const { vendor } = await createVendor({ email: 'vendor2@test.com' });
      const service = await createService(vendor._id);
      const token = signToken(vendorUser);

      await request
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendor: vendor._id,
          service: service._id,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          price: { amount: 500 },
          address: {
            street: '123 Test St',
            city: 'Mumbai',
            zipCode: '400001',
            coordinates: { lat: 19.0760, lon: 72.8777 },
          },
        })
        .expect(403);
    });
  });

  describe('GET /api/bookings', () => {
    it('should list bookings for customer', async () => {
      const customer = await createUser({ role: 'customer' });
      const { vendor } = await createVendor();
      const service = await createService(vendor._id);
      await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
      });
      const token = signToken(customer);

      const res = await request
        .get('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });

  describe('PATCH /api/bookings/:id/status', () => {
    it('should update booking status', async () => {
      const customer = await createUser({ role: 'customer' });
      const { user: vendorUser, vendor } = await createVendor();
      const service = await createService(vendor._id);
      const booking = await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
        status: 'pending',
      });
      const token = signToken(vendorUser);

      const res = await request
        .patch(`/api/bookings/${booking._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(res.body.status).toBe('awaiting-payment');
    });

    it('should reject invalid status transition', async () => {
      const { vendor } = await createVendor();
      const customer = await createUser({ email: 'cust2@test.com', role: 'customer' });
      const service = await createService(vendor._id);
      const booking = await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
        status: 'completed',
      });
      const token = signToken(customer);

      await request
        .patch(`/api/bookings/${booking._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' })
        .expect(403);
    });
  });

  describe('POST /api/bookings/:id/review', () => {
    it('should add review to completed booking', async () => {
      const customer = await createUser({ role: 'customer' });
      const { vendor } = await createVendor();
      const service = await createService(vendor._id);
      const booking = await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
        status: 'completed',
      });
      const token = signToken(customer);

      const res = await request
        .post(`/api/bookings/${booking._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ score: 5, review: 'Great service!' })
        .expect(200);

      expect(res.body.rating.score).toBe(5);
    });

    it('should reject review from non-customer', async () => {
      const { user: vendorUser, vendor } = await createVendor();
      const customer = await createUser({ email: 'cust3@test.com', role: 'customer' });
      const service = await createService(vendor._id);
      const booking = await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
        status: 'completed',
      });
      const token = signToken(vendorUser);

      await request
        .post(`/api/bookings/${booking._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ score: 4, review: 'Nice' })
        .expect(403);
    });

    it('should reject review for non-completed booking', async () => {
      const customer = await createUser({ email: 'cust4@test.com', role: 'customer' });
      const { vendor } = await createVendor();
      const service = await createService(vendor._id);
      const booking = await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
        status: 'pending',
      });
      const token = signToken(customer);

      await request
        .post(`/api/bookings/${booking._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ score: 3, review: 'OK' })
        .expect(400);
    });
  });

  describe('POST /api/bookings/:id/dispute', () => {
    it('should raise a dispute on an in-progress booking', async () => {
      const customer = await createUser({ role: 'customer' });
      const { vendor } = await createVendor();
      const service = await createService(vendor._id);
      const booking = await createBooking({
        customer: customer._id,
        vendor: vendor._id,
        service: service._id,
        status: 'in-progress',
      });
      const token = signToken(customer);

      const res = await request
        .post(`/api/bookings/${booking._id}/dispute`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Poor quality work', description: 'The work was not done properly.' })
        .expect(200);

      expect(res.body.status).toBe('reported');
      expect(res.body.dispute).toBeDefined();
    });
  });
});
