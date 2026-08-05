import express from 'express';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '../helpers/factories.js';

// Routes
import authRoutes from '../../server/routes/auth.js';
import userRoutes from '../../server/routes/users.js';
import vendorRoutes from '../../server/routes/vendors.js';
import serviceRoutes from '../../server/routes/services.js';
import bookingRoutes from '../../server/routes/bookings.js';
import adminRoutes from '../../server/routes/admin.js';
import dashboardRoutes from '../../server/routes/dashboard.js';
import messageRoutes from '../../server/routes/messages.js';

import { authenticateToken } from '../../server/middleware/auth.js';

const mockIo = {
  to: () => ({
    emit: () => {},
  }),
  emit: () => {},
};

export function createTestApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((_req, _res, next) => {
    _req.io = mockIo as any;
    next();
  });

  app.get('/api/categories', async (_req, res) => {
    const Category = (await import('../../server/models/Category.js')).default;
    const categories = await Category.find({ isActive: true }).sort({ priority: -1, name: 1 });
    res.json(categories);
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', authenticateToken, userRoutes);
  app.use('/api/vendors', authenticateToken, vendorRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/bookings', authenticateToken, bookingRoutes);
  app.use('/api/admin', authenticateToken, adminRoutes);
  app.use('/api/dashboard', authenticateToken, dashboardRoutes);
  app.use('/api/messages', authenticateToken, messageRoutes);

  return app;
}

export function signToken(user: User): string {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET || 'test-secret-key-do-not-use-in-production',
    { expiresIn: '7d' }
  );
}

export function signExpiredToken(user: User): string {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET || 'test-secret-key-do-not-use-in-production',
    { expiresIn: '0s' }
  );
}
