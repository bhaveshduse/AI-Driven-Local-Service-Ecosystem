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

describe('Vendor API', () => {
  beforeAll(() => {
    app = createTestApp();
    request = supertest(app);
  });

  describe('GET /api/vendors/profile', () => {
    it('should return vendor profile', async () => {
      const { user } = await createVendor({ name: 'Vendor Profile' });
      const token = signToken(user);

      const res = await request
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.businessName).toBe('Test Business');
    });

    it('should reject non-vendor role', async () => {
      const customer = await createUser({ role: 'customer' });
      const token = signToken(customer);

      await request
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /api/vendors/services', () => {
    it('should return vendor services list', async () => {
      const { user, vendor } = await createVendor();
      await createService(vendor._id, { title: 'Vendor Service A' });
      await createService(vendor._id, { title: 'Vendor Service B' });
      const token = signToken(user);

      const res = await request
        .get('/api/vendors/services')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /api/vendors/dashboard-stats', () => {
    it('should return dashboard stats for verified vendor', async () => {
      const { user } = await createVendor();
      const token = signToken(user);

      const res = await request
        .get('/api/vendors/dashboard-stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('recentBookings');
      expect(res.body.stats).toHaveProperty('activeBookings');
      expect(res.body.stats).toHaveProperty('totalRevenue');
    });
  });

  describe('GET /api/vendors/earnings', () => {
    it('should return earnings for verified vendor', async () => {
      const { user } = await createVendor();
      const token = signToken(user);

      const res = await request
        .get('/api/vendors/earnings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('completedJobs');
    });
  });

  describe('GET /api/vendors/bookings', () => {
    it('should return vendor bookings', async () => {
      const { user } = await createVendor();
      const token = signToken(user);
      const { vendor: vendor2 } = await createVendor({ email: 'other@test.com' });
      const svc = await createService(vendor2._id);

      await createBooking({
        vendor: vendor2._id,
        service: svc._id,
        customer: user._id,
      });

      const res = await request
        .get('/api/vendors/bookings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
