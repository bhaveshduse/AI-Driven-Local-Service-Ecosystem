import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createTestApp, signToken, signExpiredToken } from '../helpers/testApp.js';
import { createUser } from '../helpers/factories.js';
import type { Express } from 'express';

vi.mock('../../server/utils/sendEmail.js', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

let app: Express;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(() => {
  app = createTestApp();
  request = supertest(app);
});

describe('POST /api/auth/register', () => {
  it('should register a customer successfully', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: `john${Date.now()}@example.com`,
        password: 'password123',
        phone: '9876543210',
        city: 'Mumbai',
        role: 'customer',
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('role', 'customer');
    expect(res.body.user.name).toBe('John Doe');
  });

  it('should register a vendor successfully', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({
        name: 'Vendor User',
        email: `vendor${Date.now()}@example.com`,
        password: 'password123',
        phone: '9876543211',
        city: 'Delhi',
        role: 'vendor',
        businessName: 'Test Plumbing Co',
        primaryCategory: 'plumbing',
        serviceCategories: ['plumbing', 'electrical'],
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('vendor');
  });

  it('should reject duplicate email', async () => {
    const email = `dup${Date.now()}@example.com`;
    await request
      .post('/api/auth/register')
      .send({ name: 'First', email, password: 'password123', phone: '9876543212', city: 'Mumbai', role: 'customer' })
      .expect(201);

    const res = await request
      .post('/api/auth/register')
      .send({ name: 'Second', email, password: 'password123', phone: '9876543213', city: 'Mumbai', role: 'customer' })
      .expect(400);

    expect(res.body.error).toMatch(/User already exists/i);
  });

  it('should reject missing city', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ name: 'No City', email: `nocity${Date.now()}@example.com`, password: 'password123', phone: '9876543214' })
      .expect(400);

    expect(res.body.error).toMatch(/city is required/i);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const email = `login${Date.now()}@example.com`;
    await createUser({ email, password: 'password123' });

    const res = await request
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(email);
  });

  it('should reject wrong password', async () => {
    const email = `wrongpw${Date.now()}@example.com`;
    await createUser({ email, password: 'password123' });

    const res = await request
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('should reject non-existent email', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' })
      .expect(401);

    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('should reject inactive user', async () => {
    const email = `inactive${Date.now()}@example.com`;
    await createUser({ email, password: 'password123', isActive: false });

    const res = await request
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(401);

    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});

describe('GET /api/auth/me', () => {
  it('should return user profile with valid token', async () => {
    const user = await createUser({ name: 'Profile Test' });
    const token = signToken(user);

    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.name).toBe('Profile Test');
    expect(res.body).not.toHaveProperty('password');
  });

  it('should reject request without token', async () => {
    const res = await request
      .get('/api/auth/me')
      .expect(401);

    expect(res.body.error).toMatch(/token/i);
  });

  it('should reject expired token', async () => {
    const user = await createUser();
    const token = signExpiredToken(user);

    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(res.body.error).toMatch(/expired/i);
  });

  it('should reject malformed token', async () => {
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(res.body.error).toMatch(/invalid|expired/i);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('should send reset link for existing user', async () => {
    const email = `forgot${Date.now()}@example.com`;
    await createUser({ email });

    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);

    expect(res.body.message).toMatch(/reset link sent/i);
  });

  it('should return 404 for unknown email', async () => {
    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(404);

    expect(res.body.error).toMatch(/user not found/i);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('should reject invalid token', async () => {
    const res = await request
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', password: 'newpassword123' })
      .expect(400);

    expect(res.body.error).toMatch(/invalid|expired/i);
  });
});
