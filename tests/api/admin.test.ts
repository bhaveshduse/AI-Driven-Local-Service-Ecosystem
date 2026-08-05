import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createTestApp, signToken } from '../helpers/testApp.js';
import {
  createUser, createVendor, createAdmin, createService,
  createCategory,
} from '../helpers/factories.js';
import type { Express } from 'express';

let app: Express;
let request: supertest.SuperTest<supertest.Test>;

vi.mock('../../server/utils/sendEmail.js', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../server/utils/geocoder.js', () => ({
  geocodeAddress: vi.fn().mockResolvedValue([72.8777, 19.0760]),
}));

describe('Admin API', () => {
  beforeAll(() => {
    app = createTestApp();
    request = supertest(app);
  });

  describe('GET /api/admin/analytics', () => {
    it('should return analytics for admin', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);

      const res = await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalVendors');
      expect(res.body).toHaveProperty('totalBookings');
      expect(res.body).toHaveProperty('grossVolume');
      expect(res.body).toHaveProperty('totalRevenue');
    });

    it('should reject non-admin users', async () => {
      const customer = await createUser({ role: 'customer' });
      const token = signToken(customer);

      await request
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('User Management', () => {
    it('GET /api/admin/users should list users', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      await createUser({ name: 'User A', email: 'usera@test.com' });

      const res = await request
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('users');
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/admin/users/:id should return single user', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const target = await createUser({ name: 'Target User', email: 'target@test.com' });

      const res = await request
        .get(`/api/admin/users/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.name).toBe('Target User');
    });

    it('PUT /api/admin/users/:id should update user', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const target = await createUser({ role: 'customer', isActive: false });

      const res = await request
        .put(`/api/admin/users/${target._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: true, role: 'vendor' })
        .expect(200);

      expect(res.body.isActive).toBe(true);
      expect(res.body.role).toBe('vendor');
    });
  });

  describe('Vendor Management', () => {
    it('GET /api/admin/vendors should list vendors', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      await createVendor();

      const res = await request
        .get('/api/admin/vendors')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('vendors');
      expect(res.body.vendors.length).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/admin/vendors/:id/verify should verify a vendor', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const { user, vendor } = await createVendor(
        { email: 'verify-me@test.com' },
        { verificationStatus: 'pending' }
      );
      const User = (await import('../../server/models/User.js')).default;
      await User.findByIdAndUpdate(user._id, {
        $set: { 'address.coordinates': [72.8777, 19.0760] }
      });

      const res = await request
        .patch(`/api/admin/vendors/${vendor._id}/verify`)
        .set('Authorization', `Bearer ${token}`)
        .send({ verificationStatus: 'verified' })
        .expect(200);

      expect(res.body.vendor.verificationStatus).toBe('verified');
    });

    it('PATCH /api/admin/vendors/:id/verify should reject invalid status', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const { vendor } = await createVendor({ email: 'reject-me@test.com' });

      await request
        .patch(`/api/admin/vendors/${vendor._id}/verify`)
        .set('Authorization', `Bearer ${token}`)
        .send({ verificationStatus: 'invalid-status' })
        .expect(400);
    });
  });

  describe('Catalog Management', () => {
    it('GET /api/admin/catalog/categories should list categories', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      await createCategory({ slug: 'test-cat', name: 'Test Category' });

      const res = await request
        .get('/api/admin/catalog/categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/admin/catalog/categories should create a category', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);

      const res = await request
        .post('/api/admin/catalog/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Category' })
        .expect(201);

      expect(res.body.name).toBe('New Category');
      expect(res.body.slug).toBe('new-category');
    });

    it('POST /api/admin/catalog/categories should reject duplicate', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);

      await createCategory({ slug: 'duplicate-category', name: 'Duplicate Category' });

      await request
        .post('/api/admin/catalog/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Duplicate Category' })
        .expect(409);
    });

    it('PUT /api/admin/catalog/categories/:id should update category', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const cat = await createCategory({ slug: 'update-cat', name: 'Old Name' });

      const res = await request
        .put(`/api/admin/catalog/categories/${cat._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.name).toBe('New Name');
      expect(res.body.slug).toBe('new-name');
    });

    it('DELETE /api/admin/catalog/categories/:id should delete unused category', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const cat = await createCategory({ slug: 'delete-cat', name: 'Delete Me' });

      await request
        .delete(`/api/admin/catalog/categories/${cat._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('DELETE /api/admin/catalog/categories/:id should block deletion of used category', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);
      const { vendor } = await createVendor();
      const cat = await createCategory({ slug: 'used-cat', name: 'Used Category' });
      await createService(vendor._id, { category: 'used-cat' });

      await request
        .delete(`/api/admin/catalog/categories/${cat._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('Booking & Payment Management', () => {
    it('GET /api/admin/bookings should list all bookings', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);

      const res = await request
        .get('/api/admin/bookings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('bookings');
    });

    it('GET /api/admin/disputes should list reported bookings', async () => {
      const admin = await createAdmin();
      const token = signToken(admin);

      const res = await request
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/categories', () => {
    it('should return public categories', async () => {
      await createCategory({ slug: 'public-cat', name: 'Public Category', isActive: true });

      const res = await request.get('/api/categories').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
