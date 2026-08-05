import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createTestApp, signToken } from '../helpers/testApp.js';
import { createVendor, createService, createCategory } from '../helpers/factories.js';
import type { Express } from 'express';

let app: Express;
let request: supertest.SuperTest<supertest.Test>;

vi.mock('../../server/utils/sendEmail.js', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

describe('GET /api/services', () => {
  beforeAll(() => {
    app = createTestApp();
    request = supertest(app);
  });

  it('should return empty list when no services exist', async () => {
    const res = await request.get('/api/services').expect(200);
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services.length).toBe(0);
  });

  it('should return only active services from verified vendors', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id);
    await createService(vendor._id, { title: 'Electrical Repair', category: 'electrical' });

    const res = await request.get('/api/services').expect(200);
    expect(res.body.services.length).toBe(2);
  });

  it('should filter by category', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id, { title: 'Leaky Faucet', category: 'filtercat1' });
    await createService(vendor._id, { title: 'Fan Repair', category: 'filtercat2' });

    const res = await request.get('/api/services?category=filtercat1').expect(200);
    expect(res.body.services.length).toBe(1);
    expect(res.body.services[0].title).toBe('Leaky Faucet');
  });

  it('should search by keyword', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id, { title: 'AC Installation', category: 'hvac' });
    await createService(vendor._id, { title: 'Plumbing Repair', category: 'plumbing' });

    const res = await request.get('/api/services?search=Plumbing').expect(200);
    expect(Array.isArray(res.body.services)).toBe(true);
  });

  it('should filter by minimum rating', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id, { title: 'High Rated Service', category: 'ratingcat1' });
    const { vendor: vendor2 } = await createVendor({ email: 'vendor2@test.com' });
    await createService(vendor2._id, { title: 'New Service', category: 'ratingcat2' });

    const res = await request.get('/api/services?minRating=0').expect(200);
    expect(res.body.services.length).toBeGreaterThanOrEqual(2);
  });

  it('should paginate results', async () => {
    const { vendor } = await createVendor();
    for (let i = 0; i < 5; i++) {
      await createService(vendor._id, { title: `Service ${i}`, category: 'plumbing' });
    }

    const res = await request.get('/api/services?page=1&limit=2').expect(200);
    expect(res.body.services.length).toBe(2);
    expect(res.body).toHaveProperty('totalPages');
  });

  it('should sort by price ascending', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id, { title: 'Cheap', category: 'plumbing', pricing: { type: 'fixed', amount: 100, unit: 'per job' } });
    await createService(vendor._id, { title: 'Expensive', category: 'plumbing', pricing: { type: 'fixed', amount: 500, unit: 'per job' } });

    const res = await request.get('/api/services?sort=price-asc').expect(200);
    expect(res.body.services[0].title).toBe('Cheap');
  });

  it('should exclude unverified vendors', async () => {
    const { vendor } = await createVendor({}, { verificationStatus: 'pending' });
    await createService(vendor._id, { title: 'Unverified Service', category: 'unverifiedcat' });

    const res = await request.get('/api/services').expect(200);
    const titles = res.body.services.map((s: any) => s.title);
    expect(titles).not.toContain('Unverified Service');
  });

  it('should exclude inactive services', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id, { title: 'Active Service', category: 'plumbing' });
    await createService(vendor._id, { title: 'Inactive Service', category: 'plumbing', isActive: false });

    const res = await request.get('/api/services').expect(200);
    const titles = res.body.services.map((s: any) => s.title);
    expect(titles).toContain('Active Service');
    expect(titles).not.toContain('Inactive Service');
  });
});

describe('GET /api/services/suggestions', () => {
  it('should return suggestions for a partial query', async () => {
    const { vendor } = await createVendor();
    await createService(vendor._id, { title: 'Plumbing Repair', category: 'plumbing' });

    const res = await request.get('/api/services/suggestions?q=Plumb').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return empty array for short query', async () => {
    const res = await request.get('/api/services/suggestions?q=a').expect(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/services/categories/list', () => {
  it('should return public category list', async () => {
    await createCategory({ slug: 'plumbing', name: 'Plumbing', isActive: true });

    const res = await request.get('/api/services/categories/list').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should exclude inactive categories', async () => {
    await createCategory({ slug: 'active-cat', name: 'Active Cat', isActive: true });
    await createCategory({ slug: 'inactive-cat', name: 'Inactive Cat', isActive: false });

    const res = await request.get('/api/services/categories/list').expect(200);
    const slugs = res.body.map((c: any) => c.slug);
    expect(slugs).toContain('active-cat');
    expect(slugs).not.toContain('inactive-cat');
  });
});

describe('GET /api/services/:id', () => {
  it('should return service detail for authenticated user', async () => {
    const { user, vendor } = await createVendor();
    const service = await createService(vendor._id, { title: 'Detail Test' });
    const token = signToken(user);

    const res = await request
      .get(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.title).toBe('Detail Test');
    expect(res.body.vendor).toBeDefined();
  });

  it('should reject without auth token', async () => {
    const { vendor } = await createVendor();
    const service = await createService(vendor._id);

    await request
      .get(`/api/services/${service._id}`)
      .expect(401);
  });

  it('should return 404 for non-existent service', async () => {
    const { user } = await createVendor();
    const token = signToken(user);

    await request
      .get(`/api/services/${'000000000000000000000000'}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
