import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import vendorRoutes from './routes/vendors.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js'; // This handles the catalog routes
import dashboardRoutes from './routes/dashboard.js';
import Category from './models/Category.js';
// Import middleware
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", process.env.CLIENT_URL].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Swayam';

// 1. Middleware initialization
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", process.env.CLIENT_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Serve uploaded files correctly
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 3. Pass io to routes via request object
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

// 6. Database and Server Start

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

export { io };