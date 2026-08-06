import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendors.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js'; // This handles the catalog routes
import dashboardRoutes from './routes/dashboard.js';
import paymentRoutes from './routes/payments.js';
import Category from './models/Category.js';
// Import middleware
import { authenticateToken } from './middleware/auth.js';

dotenv.config({ override: true });

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

const allowedOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL].filter(Boolean);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Swayam';

// 1. Middleware initialization
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Raw body parser for Razorpay webhook (must be BEFORE express.json to preserve signature)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Pass io to routes via request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 4. Public route for categories
app.get('/api/categories', async (req, res) => {
  try {
    // Fetch only active categories, sorted by priority and then name.
    // This is perfect for public-facing lists like on the registration page.
    const categories = await Category.find({ isActive: true }).sort({ priority: -1, name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching public categories:', error);
    res.status(500).json({ error: 'Server error while fetching categories.' });
  }
});

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/vendors', authenticateToken, vendorRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);

/** * ADMIN ROUTES
 * Mounted at /api/admin/catalog to match frontend hooks
 */
app.use('/api/admin', authenticateToken, adminRoutes);

app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Payment routes — raw body for webhook is handled via separate middleware above
app.use('/api/payments', paymentRoutes);

// 5. Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (userId) => {
    socket.join(userId);
  });
  
  socket.on('booking-update', (data) => {
    io.to(data.vendorId).emit('new-booking', data);
    io.to(data.customerId).emit('booking-status', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 6. Global Error Middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 7. Database and Server Start
async function startServer() {
  try {
    mongoose.connection.on('connected', () => console.log('✅ Connected to MongoDB'));
    mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB connection error:', err));

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
  });
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export { io };