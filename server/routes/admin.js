import express from 'express';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Booking from '../models/Booking.js';
import { authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard analytics
router.get('/analytics', authorizeRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalVendors = await Vendor.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'completed', 'pricing.paymentStatus': 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]);

    const monthlyBookings = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      totalUsers,
      totalVendors,
      totalBookings,
      completedBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', authorizeRole(['admin']), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vendors with verification status
router.get('/vendors', authorizeRole(['admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.verificationStatus = status;
    }

    const vendors = await Vendor.find(query)
      .populate('user', 'name email phone createdAt isActive')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vendor.countDocuments(query);

    res.json({
      vendors,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor verification status
router.patch('/vendors/:id/verify', authorizeRole(['admin']), async (req, res) => {
  try {
    const { verificationStatus, adminNotes } = req.body;
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { verificationStatus, adminNotes },
      { new: true }
    ).populate('user', 'name email');

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings
router.get('/bookings', authorizeRole(['admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .populate('service', 'title category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user
router.patch('/users/:id/deactivate', authorizeRole(['admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;